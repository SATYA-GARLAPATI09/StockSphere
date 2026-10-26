const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const stockService = require('../services/stockService');

exports.getPurchaseOrders = async (req, res, next) => {
  try {
    const { status, supplier } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;

    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name code leadTimeDays')
      .populate('warehouse', 'name code location')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

exports.getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name code email phone leadTimeDays address')
      .populate('warehouse', 'name code location')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, warehouse, items, expectedDeliveryDate, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A purchase order requires at least one line item'
      });
    }

    // Auto-generate order number e.g. PO-2026-9482
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PO-${new Date().getFullYear()}-${randomSuffix}`;

    // Calculate subtotals
    let totalAmount = 0;
    const enrichedItems = items.map(item => {
      const subtotal = Number((item.orderedQuantity * item.unitCost).toFixed(2));
      totalAmount += subtotal;
      return {
        product: item.productId || item.product,
        sku: item.sku,
        productName: item.productName || item.name,
        orderedQuantity: Number(item.orderedQuantity),
        receivedQuantity: 0,
        unitCost: Number(item.unitCost),
        subtotal
      };
    });

    const order = await PurchaseOrder.create({
      orderNumber,
      supplier,
      warehouse,
      status: 'DRAFT',
      items: enrichedItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      expectedDeliveryDate,
      createdBy: req.user._id,
      notes
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${orderNumber} created in DRAFT state`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SUBMITTED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Use the dedicated /receive endpoint to mark orders as RECEIVED`
      });
    }

    const order = await PurchaseOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot alter status of an already received order'
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status changed to ${status}`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

exports.receivePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrder.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Action Prevented: This order has already been received and credited to inventory.'
      });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive a cancelled order'
      });
    }

    // Atomically increment stock for each item and log movement
    for (const item of order.items) {
      await stockService.stockIn({
        productId: item.product,
        warehouseId: order.warehouse,
        quantity: item.orderedQuantity,
        userId: req.user._id,
        reason: `Purchase Order Fulfillment (${order.orderNumber})`,
        referenceNumber: order.orderNumber
      });
      item.receivedQuantity = item.orderedQuantity;
    }

    order.status = 'RECEIVED';
    order.receivedDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: `Purchase Order ${order.orderNumber} fulfilled. Inventory credited and movements logged.`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};
