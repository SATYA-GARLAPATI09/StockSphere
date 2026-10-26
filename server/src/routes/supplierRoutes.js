const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, supplierController.getSuppliers);
router.get('/:id', protect, supplierController.getSupplierById);

router.post('/', protect, requireRole('Admin'), supplierController.createSupplier);
router.patch('/:id', protect, requireRole('Admin'), supplierController.updateSupplier);

module.exports = router;
