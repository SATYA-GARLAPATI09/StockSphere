const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const graphSyncService = require('../services/graphSyncService');

exports.getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    const enriched = await Promise.all(
      warehouses.map(async (w) => {
        const productCount = await Product.countDocuments({
          defaultWarehouse: w._id,
          isArchived: false
        });
        return {
          ...w.toObject(),
          productCount
        };
      })
    );
    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.createWarehouse = async (req, res, next) => {
  try {
    const { name, code, location, managerName, capacityUnits } = req.body;
    const warehouse = await Warehouse.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      location: location.trim(),
      managerName,
      capacityUnits: Number(capacityUnits) || 10000
    });

    graphSyncService.syncWarehouse(warehouse).catch(err => {
      console.warn('[WarehouseController] Neo4j sync note:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse registered successfully',
      data: warehouse
    });
  } catch (err) {
    next(err);
  }
};
