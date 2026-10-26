const Product = require('../models/Product');
const graphSyncService = require('../services/graphSyncService');

exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category,
      supplier,
      warehouse,
      stockStatus,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isArchived: false };

    // Search by Name or SKU
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { sku: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Facet filters
    if (category) filter.category = category;
    if (supplier) filter.primarySupplier = supplier;
    if (warehouse) filter.defaultWarehouse = warehouse;

    // Stock Status Filter
    if (stockStatus === 'OUT') {
      filter.quantityOnHand = 0;
    } else if (stockStatus === 'LOW') {
      filter.quantityOnHand = { $gt: 0 };
      filter.$expr = { $lte: ['$quantityOnHand', '$reorderThreshold'] };
    } else if (stockStatus === 'HEALTHY') {
      filter.$expr = { $gt: ['$quantityOnHand', '$reorderThreshold'] };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name code')
        .populate('primarySupplier', 'name code leadTimeDays')
        .populate('defaultWarehouse', 'name code location')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name code')
      .populate('primarySupplier', 'name code email phone leadTimeDays status')
      .populate('defaultWarehouse', 'name code location capacityUnits');

    if (!product || product.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or has been archived'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      primarySupplier,
      defaultWarehouse,
      unitCost,
      sellingPrice,
      quantityOnHand = 0,
      reorderThreshold = 10
    } = req.body;

    // Duplicate SKU check
    const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `SKU '${sku}' already exists in catalog`
      });
    }

    const product = await Product.create({
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      description: description || '',
      category,
      primarySupplier,
      defaultWarehouse,
      unitCost: Number(unitCost),
      sellingPrice: Number(sellingPrice),
      quantityOnHand: Math.max(0, parseInt(quantityOnHand, 10)),
      reorderThreshold: Math.max(0, parseInt(reorderThreshold, 10))
    });

    // Populate references for client response and graph synchronization
    const populated = await Product.findById(product._id)
      .populate('category')
      .populate('primarySupplier')
      .populate('defaultWarehouse');

    // Asynchronously synchronize with Neo4j
    graphSyncService.syncProduct(populated).catch(err => {
      console.warn('[ProductController] Neo4j sync note:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Product created and synchronized successfully',
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      primarySupplier,
      defaultWarehouse,
      unitCost,
      sellingPrice,
      reorderThreshold
    } = req.body;

    const product = await Product.findById(id);
    if (!product || product.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Notice: quantityOnHand cannot be edited directly through this endpoint
    // to strictly preserve audit trail integrity through StockMovements!
    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (primarySupplier) product.primarySupplier = primarySupplier;
    if (defaultWarehouse) product.defaultWarehouse = defaultWarehouse;
    if (unitCost !== undefined) product.unitCost = Number(unitCost);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (reorderThreshold !== undefined) product.reorderThreshold = Number(reorderThreshold);

    await product.save();

    const populated = await Product.findById(product._id)
      .populate('category')
      .populate('primarySupplier')
      .populate('defaultWarehouse');

    graphSyncService.syncProduct(populated).catch(err => {
      console.warn('[ProductController] Neo4j sync note:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Product catalog details updated successfully',
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Soft delete to protect historical transaction logs
    product.isArchived = true;
    await product.save();

    graphSyncService.deleteProduct(id).catch(err => {
      console.warn('[ProductController] Neo4j deletion note:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Product archived successfully'
    });
  } catch (err) {
    next(err);
  }
};
