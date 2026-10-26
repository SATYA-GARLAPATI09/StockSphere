const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.post('/stock-in', protect, stockController.stockIn);
router.post('/stock-out', protect, stockController.stockOut);
router.post('/adjust', protect, stockController.adjustStock);
router.get('/movements', protect, stockController.getMovements);

module.exports = router;
