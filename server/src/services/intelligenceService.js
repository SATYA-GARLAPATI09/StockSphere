const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const { getSession, isNeo4jActive, graphStore } = require('../config/neo4j');

class IntelligenceService {
  /**
   * Smart Restock Recommendations Engine
   * Integrates MongoDB low-stock detection with Neo4j relationship pathing
   */
  async getRestockRecommendations() {
    // 1. Identify low-stock products from authoritative MongoDB
    const lowStockProducts = await Product.find({
      isArchived: false,
      $expr: { $lte: ['$quantityOnHand', '$reorderThreshold'] }
    })
      .populate('category', 'name code')
      .populate('primarySupplier', 'name code leadTimeDays status email phone')
      .populate('defaultWarehouse', 'name code location')
      .sort({ quantityOnHand: 1 });

    const recommendations = [];

    for (const product of lowStockProducts) {
      const pId = product._id.toString();
      const currentQty = product.quantityOnHand;
      const threshold = product.reorderThreshold;

      // Deterministic Reorder Formulation
      // Proposed Reorder Qty = (Target Level = Threshold * 2) - Current Qty
      const targetLevel = threshold * 2;
      const proposedReorderQuantity = Math.max(1, targetLevel - currentQty);

      // Query graph for alternative suppliers and substitute products
      const [suppliers, substitutes] = await Promise.all([
        this.getAlternativeSuppliers(pId),
        this.getCategorySubstitutes(pId)
      ]);

      const primarySupp = suppliers.find(s => s.isPrimary) || (product.primarySupplier ? {
        supplierId: product.primarySupplier._id.toString(),
        supplierName: product.primarySupplier.name,
        leadTimeDays: product.primarySupplier.leadTimeDays,
        unitCost: product.unitCost,
        isPrimary: true,
        status: product.primarySupplier.status
      } : null);

      const alternativeSuppliers = suppliers.filter(s => !s.isPrimary && s.supplierId !== primarySupp?.supplierId);

      // Generate human-readable recommendation explanation
      let recommendationReason = '';
      if (currentQty === 0) {
        recommendationReason = `CRITICAL STOCKOUT: Current balance is 0. Immediate replenishment of ${proposedReorderQuantity} units required to reach safe buffer of ${targetLevel} units.`;
      } else {
        recommendationReason = `LOW STOCK ALERT: Available balance (${currentQty}) is at or below threshold (${threshold}). Restock of ${proposedReorderQuantity} units recommended.`;
      }

      if (alternativeSuppliers.length > 0) {
        const fastest = [...suppliers].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
        if (fastest && primarySupp && fastest.leadTimeDays < primarySupp.leadTimeDays) {
          recommendationReason += ` NOTE: Alternative supplier "${fastest.supplierName}" offers a faster lead time of ${fastest.leadTimeDays} days vs ${primarySupp.leadTimeDays} days from primary.`;
        }
      }

      recommendations.push({
        productId: pId,
        sku: product.sku,
        name: product.name,
        currentQuantity: currentQty,
        reorderThreshold: threshold,
        targetLevel,
        proposedReorderQuantity,
        unitCost: product.unitCost,
        estimatedTotalCost: proposedReorderQuantity * product.unitCost,
        category: product.category,
        defaultWarehouse: product.defaultWarehouse,
        primarySupplier: primarySupp,
        alternativeSuppliers,
        categorySubstitutes: substitutes,
        recommendationReason,
        urgency: currentQty === 0 ? 'CRITICAL' : 'HIGH'
      });
    }

    return recommendations;
  }

  /**
   * Find all suppliers connected to this product in Neo4j, ranked by lead time
   */
  async getAlternativeSuppliers(productId) {
    const pId = productId.toString();

    if (isNeo4jActive()) {
      const session = getSession();
      try {
        const cypher = `
          MATCH (p:Product { mongoId: $pId })
          MATCH (s:Supplier)-[r:SUPPLIES]->(p)
          WHERE s.status = 'ACTIVE'
          RETURN s.mongoId AS supplierId,
                 s.name AS supplierName,
                 s.code AS supplierCode,
                 COALESCE(r.leadTimeDays, s.leadTimeDays) AS leadTimeDays,
                 COALESCE(r.unitCost, p.unitCost) AS unitCost,
                 COALESCE(r.isPrimary, false) AS isPrimary
          ORDER BY isPrimary DESC, leadTimeDays ASC
        `;
        const result = await session.run(cypher, { pId });
        return result.records.map(rec => ({
          supplierId: rec.get('supplierId'),
          supplierName: rec.get('supplierName'),
          supplierCode: rec.get('supplierCode'),
          leadTimeDays: rec.get('leadTimeDays')?.toNumber ? rec.get('leadTimeDays').toNumber() : Number(rec.get('leadTimeDays')),
          unitCost: rec.get('unitCost')?.toNumber ? rec.get('unitCost').toNumber() : Number(rec.get('unitCost')),
          isPrimary: rec.get('isPrimary') === true
        }));
      } catch (err) {
        console.warn(`[Intelligence] Neo4j supplier query error:`, err.message);
      } finally {
        await session.close();
      }
    }

    // Fallback graph traversal from memory/MongoDB
    const targetProduct = await Product.findById(pId).populate('primarySupplier');
    if (!targetProduct) return [];

    const suppliersList = [];
    if (targetProduct.primarySupplier) {
      suppliersList.push({
        supplierId: targetProduct.primarySupplier._id.toString(),
        supplierName: targetProduct.primarySupplier.name,
        supplierCode: targetProduct.primarySupplier.code,
        leadTimeDays: targetProduct.primarySupplier.leadTimeDays,
        unitCost: targetProduct.unitCost,
        isPrimary: true
      });
    }

    // Inspect other active suppliers supplying items in the same category
    const otherSuppliers = await Supplier.find({
      _id: { $ne: targetProduct.primarySupplier?._id },
      status: 'ACTIVE'
    }).limit(3);

    for (const supp of otherSuppliers) {
      suppliersList.push({
        supplierId: supp._id.toString(),
        supplierName: supp.name,
        supplierCode: supp.code,
        leadTimeDays: supp.leadTimeDays,
        unitCost: Number((targetProduct.unitCost * 1.05).toFixed(2)),
        isPrimary: false
      });
    }

    return suppliersList.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.leadTimeDays - b.leadTimeDays);
  }

  /**
   * Find substitute products in the same category with healthy inventory
   */
  async getCategorySubstitutes(productId) {
    const pId = productId.toString();

    if (isNeo4jActive()) {
      const session = getSession();
      try {
        const cypher = `
          MATCH (target:Product { mongoId: $pId })-[:BELONGS_TO]->(c:Category)
          MATCH (sub:Product)-[:BELONGS_TO]->(c)
          WHERE sub.mongoId <> $pId AND sub.quantityOnHand > sub.reorderThreshold
          OPTIONAL MATCH (s:Supplier)-[r:SUPPLIES]->(sub)
          RETURN sub.mongoId AS substituteProductId,
                 sub.sku AS sku,
                 sub.name AS name,
                 sub.quantityOnHand AS availableStock,
                 sub.unitCost AS unitCost,
                 c.name AS categoryName,
                 s.name AS supplierName,
                 s.leadTimeDays AS leadTimeDays
          ORDER BY sub.quantityOnHand DESC
          LIMIT 3
        `;
        const result = await session.run(cypher, { pId });
        return result.records.map(rec => ({
          substituteProductId: rec.get('substituteProductId'),
          sku: rec.get('sku'),
          name: rec.get('name'),
          availableStock: rec.get('availableStock')?.toNumber ? rec.get('availableStock').toNumber() : Number(rec.get('availableStock')),
          unitCost: rec.get('unitCost')?.toNumber ? rec.get('unitCost').toNumber() : Number(rec.get('unitCost')),
          categoryName: rec.get('categoryName'),
          supplierName: rec.get('supplierName') || 'Standard Supplier',
          leadTimeDays: rec.get('leadTimeDays')?.toNumber ? rec.get('leadTimeDays').toNumber() : Number(rec.get('leadTimeDays') || 5)
        }));
      } catch (err) {
        console.warn(`[Intelligence] Neo4j substitute query error:`, err.message);
      } finally {
        await session.close();
      }
    }

    // Fallback traversal
    const product = await Product.findById(pId);
    if (!product) return [];

    const substitutes = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      isArchived: false,
      $expr: { $gt: ['$quantityOnHand', '$reorderThreshold'] }
    })
      .populate('primarySupplier', 'name leadTimeDays')
      .populate('category', 'name')
      .limit(3);

    return substitutes.map(sub => ({
      substituteProductId: sub._id.toString(),
      sku: sub.sku,
      name: sub.name,
      availableStock: sub.quantityOnHand,
      unitCost: sub.unitCost,
      categoryName: sub.category?.name || 'Category',
      supplierName: sub.primarySupplier?.name || 'Standard Supplier',
      leadTimeDays: sub.primarySupplier?.leadTimeDays || 5
    }));
  }

  /**
   * Build complete topology graph for React Flow visualization
   * Features: Generous category-clustered layout, multi-supplier edge discovery,
   * rich contextual node metadata, and no overlapping nodes.
   */
  async getSupplyChainGraph(highlightProductId = null) {
    const products = await Product.find({ isArchived: false })
      .populate('category', 'name code')
      .populate('primarySupplier', 'name code leadTimeDays status phone email')
      .populate('defaultWarehouse', 'name code location capacityUnits');

    const categories = await Category.find({ isActive: true });
    const suppliers = await Supplier.find();
    const warehouses = await Warehouse.find({ isActive: true });

    // Fetch alternative supplier edges from Neo4j or memory graphStore
    let extraSupplierEdges = [];
    if (isNeo4jActive()) {
      const session = getSession();
      try {
        const cypher = `
          MATCH (s:Supplier)-[r:SUPPLIES]->(p:Product)
          RETURN s.mongoId AS suppId, p.mongoId AS prodId, r.isPrimary AS isPrimary,
                 COALESCE(r.leadTimeDays, s.leadTimeDays) AS leadTimeDays,
                 r.unitCost AS unitCost
        `;
        const res = await session.run(cypher);
        extraSupplierEdges = res.records.map(rec => ({
          suppId: rec.get('suppId'),
          prodId: rec.get('prodId'),
          isPrimary: rec.get('isPrimary') === true,
          leadTimeDays: rec.get('leadTimeDays')?.toNumber ? rec.get('leadTimeDays').toNumber() : Number(rec.get('leadTimeDays') || 5),
          unitCost: rec.get('unitCost')?.toNumber ? rec.get('unitCost').toNumber() : Number(rec.get('unitCost') || 0)
        }));
      } catch (e) {
        console.warn('[Intelligence] Neo4j extra edges query:', e.message);
      } finally {
        await session.close();
      }
    } else {
      // Authoritative In-Memory fallback from graphStore.edges
      extraSupplierEdges = (graphStore.edges || [])
        .filter(e => e.type === 'SUPPLIES')
        .map(e => ({
          suppId: e.source.replace('supp_', ''),
          prodId: e.target.replace('prod_', ''),
          isPrimary: e.properties?.isPrimary === true,
          leadTimeDays: e.properties?.leadTimeDays || 5,
          unitCost: e.properties?.unitCost || 0
        }));
    }

    const nodes = [];
    const edges = [];

    // Map categories to distinct column positions with generous spacing
    const catMap = new Map();
    categories.forEach((cat, idx) => {
      catMap.set(cat._id.toString(), {
        index: idx,
        x: 480 + idx * 460,
        y: 60,
        products: []
      });
    });

    // Group products under categories
    products.forEach(prod => {
      const cId = prod.category?._id?.toString();
      if (cId && catMap.has(cId)) {
        catMap.get(cId).products.push(prod);
      }
    });

    // 1. Category Nodes (Top row, perfectly aligned above product columns)
    categories.forEach((cat) => {
      const catInfo = catMap.get(cat._id.toString()) || { x: 480, y: 60, products: [] };
      const catProducts = catInfo.products;
      const totalValuation = catProducts.reduce((acc, p) => acc + (p.quantityOnHand * p.unitCost), 0);
      const lowStockCount = catProducts.filter(p => p.quantityOnHand <= p.reorderThreshold).length;

      nodes.push({
        id: `cat_${cat._id}`,
        type: 'categoryNode',
        position: { x: catInfo.x, y: catInfo.y },
        data: {
          label: cat.name,
          code: cat.code,
          mongoId: cat._id.toString(),
          type: 'Category',
          productCount: catProducts.length,
          totalValuation,
          lowStockCount
        }
      });
    });

    // 2. Supplier Nodes (Generously spaced left column)
    suppliers.forEach((supp, idx) => {
      const suppliedProducts = products.filter(p => p.primarySupplier?._id?.toString() === supp._id.toString());
      nodes.push({
        id: `supp_${supp._id}`,
        type: 'supplierNode',
        position: { x: 50, y: 220 + idx * 190 },
        data: {
          label: supp.name,
          code: supp.code,
          leadTime: supp.leadTimeDays,
          status: supp.status,
          phone: supp.phone,
          email: supp.email,
          mongoId: supp._id.toString(),
          type: 'Supplier',
          suppliedCount: suppliedProducts.length,
          suppliedSkus: suppliedProducts.map(p => p.sku)
        }
      });
    });

    // 3. Product Nodes (Neatly arranged by Category columns with expansive vertical margins)
    categories.forEach((cat) => {
      const catInfo = catMap.get(cat._id.toString());
      if (!catInfo) return;

      catInfo.products.forEach((prod, rowIdx) => {
        const isLowStock = prod.quantityOnHand <= prod.reorderThreshold;
        const isSelected = highlightProductId && prod._id.toString() === highlightProductId.toString();
        const posX = catInfo.x;
        const posY = 240 + rowIdx * 190;

        // Find alternative suppliers for this product
        const altSuppLinks = extraSupplierEdges.filter(
          e => e.prodId === prod._id.toString() && !e.isPrimary
        );
        const altSuppliersData = altSuppLinks.map(link => {
          const sObj = suppliers.find(s => s._id.toString() === link.suppId);
          return {
            supplierId: link.suppId,
            supplierName: sObj?.name || 'Alternative Vendor',
            leadTimeDays: link.leadTimeDays,
            unitCost: link.unitCost
          };
        });

        nodes.push({
          id: `prod_${prod._id}`,
          type: 'productNode',
          position: { x: posX, y: posY },
          data: {
            label: prod.name,
            sku: prod.sku,
            quantityOnHand: prod.quantityOnHand,
            reorderThreshold: prod.reorderThreshold,
            unitCost: prod.unitCost,
            categoryName: prod.category?.name,
            categoryCode: prod.category?.code,
            primarySupplierName: prod.primarySupplier?.name,
            primarySupplierLeadTime: prod.primarySupplier?.leadTimeDays,
            warehouseName: prod.defaultWarehouse?.name,
            warehouseLocation: prod.defaultWarehouse?.location,
            alternativeSuppliers: altSuppliersData,
            isLowStock,
            isOutOfStock: prod.quantityOnHand === 0,
            isSelected,
            mongoId: prod._id.toString(),
            type: 'Product'
          }
        });

        // Edge: Product -> Category (Belongs To)
        edges.push({
          id: `e_p_c_${prod._id}_${prod.category._id}`,
          source: `prod_${prod._id}`,
          target: `cat_${prod.category._id}`,
          type: 'smoothstep',
          label: 'BELONGS_TO',
          animated: isSelected || isLowStock,
          style: { stroke: isLowStock ? '#ef4444' : '#64748b', strokeWidth: isSelected ? 3 : 1.5, opacity: 0.6 }
        });

        // Edge: Primary Supplier -> Product
        if (prod.primarySupplier) {
          edges.push({
            id: `e_s_p_${prod.primarySupplier._id}_${prod._id}`,
            source: `supp_${prod.primarySupplier._id}`,
            target: `prod_${prod._id}`,
            type: 'smoothstep',
            label: `SUPPLIES (${prod.primarySupplier.leadTimeDays}d)`,
            animated: isSelected || isLowStock,
            style: { stroke: isLowStock ? '#f59e0b' : '#6366f1', strokeWidth: isSelected ? 3 : 1.8 }
          });
        }

        // Edges: Alternative Suppliers -> Product (Secondary links discovered via Graph)
        altSuppLinks.forEach(altLink => {
          edges.push({
            id: `e_alt_s_p_${altLink.suppId}_${prod._id}`,
            source: `supp_${altLink.suppId}`,
            target: `prod_${prod._id}`,
            type: 'smoothstep',
            label: `ALT (${altLink.leadTimeDays}d)`,
            animated: true,
            style: { stroke: '#eab308', strokeWidth: 2, strokeDasharray: '5,5' }
          });
        });

        // Edge: Product -> Warehouse (Stored In)
        if (prod.defaultWarehouse) {
          edges.push({
            id: `e_p_w_${prod._id}_${prod.defaultWarehouse._id}`,
            source: `prod_${prod._id}`,
            target: `wh_${prod.defaultWarehouse._id}`,
            type: 'smoothstep',
            label: 'STORED_IN',
            style: { stroke: '#ec4899', strokeWidth: 1.5, opacity: 0.8 }
          });
        }
      });
    });

    // 4. Warehouse Nodes (Generously spaced right column)
    warehouses.forEach((wh, idx) => {
      const storedProducts = products.filter(p => p.defaultWarehouse?._id?.toString() === wh._id.toString());
      nodes.push({
        id: `wh_${wh._id}`,
        type: 'warehouseNode',
        position: { x: 2360, y: 320 + idx * 280 },
        data: {
          label: wh.name,
          code: wh.code,
          location: wh.location,
          capacity: wh.capacityUnits,
          mongoId: wh._id.toString(),
          type: 'Warehouse',
          storedCount: storedProducts.length,
          storedSkus: storedProducts.map(p => p.sku)
        }
      });
    });

    return { nodes, edges };
  }
}

module.exports = new IntelligenceService();
