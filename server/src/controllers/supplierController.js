const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const graphSyncService = require('../services/graphSyncService');

exports.getSuppliers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(filter).sort({ name: 1 });

    // Attach supplied products count
    const suppliersWithCount = await Promise.all(
      suppliers.map(async (s) => {
        const productCount = await Product.countDocuments({
          primarySupplier: s._id,
          isArchived: false
        });
        return {
          ...s.toObject(),
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: suppliersWithCount
    });
  } catch (err) {
    next(err);
  }
};

exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const suppliedProducts = await Product.find({
      primarySupplier: supplier._id,
      isArchived: false
    }).populate('category', 'name code');

    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        suppliedProducts
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, code, email, phone, address, leadTimeDays, status } = req.body;

    const existing = await Supplier.findOne({
      $or: [{ code: code.toUpperCase().trim() }, { name: name.trim() }]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Supplier with this code or name already exists'
      });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      email,
      phone,
      address,
      leadTimeDays: Number(leadTimeDays) || 5,
      status: status || 'ACTIVE'
    });

    graphSyncService.syncSupplier(supplier).catch(err => {
      console.warn('[SupplierController] Neo4j sync note:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Supplier.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    graphSyncService.syncSupplier(updated).catch(err => {
      console.warn('[SupplierController] Neo4j sync note:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};
