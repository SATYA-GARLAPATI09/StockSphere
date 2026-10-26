const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, warehouseController.getWarehouses);
router.post('/', protect, requireRole('Admin'), warehouseController.createWarehouse);

module.exports = router;
