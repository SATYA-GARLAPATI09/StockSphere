const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, productController.getProducts);
router.get('/:id', protect, productController.getProductById);

// Creation, updates, and archival restricted to Admin
router.post('/', protect, requireRole('Admin'), productController.createProduct);
router.patch('/:id', protect, requireRole('Admin'), productController.updateProduct);
router.delete('/:id', protect, requireRole('Admin'), productController.deleteProduct);

module.exports = router;
