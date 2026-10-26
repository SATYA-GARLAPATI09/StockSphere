const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');
const { protect } = require('../middleware/auth');

router.get('/restock-recommendations', protect, intelligenceController.getRestockRecommendations);
router.get('/graph', protect, intelligenceController.getSupplyChainGraph);
router.get('/suppliers/:productId', protect, intelligenceController.getAlternativeSuppliers);
router.get('/substitutes/:productId', protect, intelligenceController.getCategorySubstitutes);

module.exports = router;
