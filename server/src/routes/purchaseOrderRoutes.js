const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, purchaseOrderController.getPurchaseOrders);
router.get('/:id', protect, purchaseOrderController.getPurchaseOrderById);
router.post('/', protect, requireRole('Admin'), purchaseOrderController.createPurchaseOrder);
router.patch('/:id/status', protect, requireRole('Admin'), purchaseOrderController.updateStatus);
router.post('/:id/receive', protect, purchaseOrderController.receivePurchaseOrder);

module.exports = router;
