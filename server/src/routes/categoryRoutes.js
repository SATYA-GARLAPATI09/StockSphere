const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, categoryController.getCategories);
router.post('/', protect, requireRole('Admin'), categoryController.createCategory);

module.exports = router;
