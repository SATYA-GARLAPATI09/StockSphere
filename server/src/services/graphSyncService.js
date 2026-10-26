const { getSession, isNeo4jActive, graphStore } = require('../config/neo4j');

class GraphSyncService {
  /**
   * Sync Category node
   */
  async syncCategory(category) {
    const mongoId = category._id.toString();
    const props = {
      mongoId,
      name: category.name,
      code: category.code,
      isActive: category.isActive
    };

    // In-memory store sync
    graphStore.nodes.set(`cat_${mongoId}`, {
      id: `cat_${mongoId}`,
      label: 'Category',
      properties: props
    });

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MERGE (c:Category { mongoId: $mongoId })
        SET c.name = $name,
            c.code = $code,
            c.isActive = $isActive
        RETURN c
        `,
        props
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to sync Category ${category.code} to Neo4j:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Sync Supplier node
   */
  async syncSupplier(supplier) {
    const mongoId = supplier._id.toString();
    const props = {
      mongoId,
      name: supplier.name,
      code: supplier.code,
      leadTimeDays: supplier.leadTimeDays,
      status: supplier.status
    };

    graphStore.nodes.set(`supp_${mongoId}`, {
      id: `supp_${mongoId}`,
      label: 'Supplier',
      properties: props
    });

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MERGE (s:Supplier { mongoId: $mongoId })
        SET s.name = $name,
            s.code = $code,
            s.leadTimeDays = $leadTimeDays,
            s.status = $status
        RETURN s
        `,
        props
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to sync Supplier ${supplier.code} to Neo4j:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Sync Warehouse node
   */
  async syncWarehouse(warehouse) {
    const mongoId = warehouse._id.toString();
    const props = {
      mongoId,
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location
    };

    graphStore.nodes.set(`wh_${mongoId}`, {
      id: `wh_${mongoId}`,
      label: 'Warehouse',
      properties: props
    });

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MERGE (w:Warehouse { mongoId: $mongoId })
        SET w.name = $name,
            w.code = $code,
            w.location = $location
        RETURN w
        `,
        props
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to sync Warehouse ${warehouse.code} to Neo4j:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Sync Product node and its relationships
   */
  async syncProduct(product) {
    const mongoId = product._id.toString();
    const catId = product.category?._id ? product.category._id.toString() : product.category?.toString();
    const suppId = product.primarySupplier?._id ? product.primarySupplier._id.toString() : product.primarySupplier?.toString();
    const whId = product.defaultWarehouse?._id ? product.defaultWarehouse._id.toString() : product.defaultWarehouse?.toString();

    const isLowStock = product.quantityOnHand <= product.reorderThreshold;

    const props = {
      mongoId,
      sku: product.sku,
      name: product.name,
      quantityOnHand: product.quantityOnHand,
      reorderThreshold: product.reorderThreshold,
      unitCost: product.unitCost,
      sellingPrice: product.sellingPrice,
      isLowStock
    };

    // Update in-memory graph
    graphStore.nodes.set(`prod_${mongoId}`, {
      id: `prod_${mongoId}`,
      label: 'Product',
      properties: props
    });

    // Update in-memory relationships
    if (catId) {
      this._updateMemoryEdge(`prod_${mongoId}`, `cat_${catId}`, 'BELONGS_TO');
    }
    if (suppId) {
      this._updateMemoryEdge(`supp_${suppId}`, `prod_${mongoId}`, 'SUPPLIES', {
        isPrimary: true,
        unitCost: product.unitCost,
        leadTimeDays: 5
      });
    }
    if (whId) {
      this._updateMemoryEdge(`prod_${mongoId}`, `wh_${whId}`, 'STORED_IN');
    }

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MERGE (p:Product { mongoId: $mongoId })
        SET p.sku = $sku,
            p.name = $name,
            p.quantityOnHand = $quantityOnHand,
            p.reorderThreshold = $reorderThreshold,
            p.unitCost = $unitCost,
            p.sellingPrice = $sellingPrice,
            p.isLowStock = $isLowStock
        
        WITH p
        OPTIONAL MATCH (c:Category { mongoId: $catId })
        FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
          MERGE (p)-[:BELONGS_TO]->(c)
        )

        WITH p
        OPTIONAL MATCH (s:Supplier { mongoId: $suppId })
        FOREACH (_ IN CASE WHEN s IS NOT NULL THEN [1] ELSE [] END |
          MERGE (s)-[r:SUPPLIES]->(p)
          SET r.isPrimary = true, r.unitCost = $unitCost
        )

        WITH p
        OPTIONAL MATCH (w:Warehouse { mongoId: $whId })
        FOREACH (_ IN CASE WHEN w IS NOT NULL THEN [1] ELSE [] END |
          MERGE (p)-[:STORED_IN]->(w)
        )
        `,
        {
          ...props,
          catId: catId || '',
          suppId: suppId || '',
          whId: whId || ''
        }
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to sync Product ${product.sku} to Neo4j:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Associate an alternative or secondary supplier to a product
   */
  async linkSupplierToProduct(supplierId, productId, { isPrimary = false, leadTimeDays = 7, unitCost = 0 }) {
    const sId = supplierId.toString();
    const pId = productId.toString();

    this._updateMemoryEdge(`supp_${sId}`, `prod_${pId}`, 'SUPPLIES', {
      isPrimary,
      leadTimeDays,
      unitCost
    });

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MATCH (s:Supplier { mongoId: $sId })
        MATCH (p:Product { mongoId: $pId })
        MERGE (s)-[r:SUPPLIES]->(p)
        SET r.isPrimary = $isPrimary,
            r.leadTimeDays = $leadTimeDays,
            r.unitCost = $unitCost
        RETURN r
        `,
        { sId, pId, isPrimary, leadTimeDays, unitCost }
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to link Supplier ${sId} to Product ${pId}:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Quick update of product stock quantity in the graph
   */
  async updateProductStock(productId, newQuantity, reorderThreshold) {
    const mongoId = productId.toString();
    const isLowStock = newQuantity <= reorderThreshold;

    const memNode = graphStore.nodes.get(`prod_${mongoId}`);
    if (memNode) {
      memNode.properties.quantityOnHand = newQuantity;
      memNode.properties.isLowStock = isLowStock;
    }

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MATCH (p:Product { mongoId: $mongoId })
        SET p.quantityOnHand = $newQuantity,
            p.isLowStock = $isLowStock
        `,
        { mongoId, newQuantity, isLowStock }
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to update stock in Neo4j for Product ${mongoId}:`, err.message);
    } finally {
      await session.close();
    }
  }

  /**
   * Remove product node and related edges on deletion
   */
  async deleteProduct(productId) {
    const mongoId = productId.toString();
    graphStore.nodes.delete(`prod_${mongoId}`);
    graphStore.edges = graphStore.edges.filter(
      e => e.source !== `prod_${mongoId}` && e.target !== `prod_${mongoId}`
    );

    if (!isNeo4jActive()) return;

    const session = getSession();
    try {
      await session.run(
        `
        MATCH (p:Product { mongoId: $mongoId })
        DETACH DELETE p
        `,
        { mongoId }
      );
    } catch (err) {
      console.warn(`[GraphSync] Failed to delete Product ${mongoId} in Neo4j:`, err.message);
    } finally {
      await session.close();
    }
  }

  _updateMemoryEdge(source, target, type, properties = {}) {
    const existingIndex = graphStore.edges.findIndex(
      e => e.source === source && e.target === target && e.type === type
    );
    if (existingIndex >= 0) {
      graphStore.edges[existingIndex].properties = {
        ...graphStore.edges[existingIndex].properties,
        ...properties
      };
    } else {
      graphStore.edges.push({ source, target, type, properties });
    }
  }
}

module.exports = new GraphSyncService();
