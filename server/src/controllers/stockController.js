const stockService = require('../services/stockService');
const StockMovement = require('../models/StockMovement');

exports.stockIn = async (req, res, next) => {
  try {
    const { productId, warehouseId, quantity, reason, referenceNumber } = req.body;
    const result = await stockService.stockIn({
      productId,
      warehouseId,
      quantity: Number(quantity),
      userId: req.user._id,
      reason,
      referenceNumber
    });

    res.status(200).json({
      success: true,
      message: `Successfully received ${quantity} units into inventory`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.stockOut = async (req, res, next) => {
  try {
    const { productId, warehouseId, quantity, reason, referenceNumber } = req.body;
    const result = await stockService.stockOut({
      productId,
      warehouseId,
      quantity: Number(quantity),
      userId: req.user._id,
      reason,
      referenceNumber
    });

    res.status(200).json({
      success: true,
      message: `Successfully deducted ${quantity} units from inventory`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { productId, warehouseId, targetQuantity, reason } = req.body;
    const result = await stockService.stockAdjustment({
      productId,
      warehouseId,
      targetQuantity: Number(targetQuantity),
      userId: req.user._id,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Stock balance reconciled and audited successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.getMovements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      productId,
      warehouseId,
      movementType,
      startDate,
      endDate
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (productId) filter.product = productId;
    if (warehouseId) filter.warehouse = warehouseId;
    if (movementType) filter.movementType = movementType;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate('product', 'name sku unitCost')
        .populate('warehouse', 'name code')
        .populate('user', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      StockMovement.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: movements,
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
