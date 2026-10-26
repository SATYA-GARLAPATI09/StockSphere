const Category = require('../models/Category');
const Product = require('../models/Product');
const graphSyncService = require('../services/graphSyncService');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const enriched = await Promise.all(
      categories.map(async (c) => {
        const productCount = await Product.countDocuments({
          category: c._id,
          isArchived: false
        });
        return {
          ...c.toObject(),
          productCount
        };
      })
    );
    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const category = await Category.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description || ''
    });

    graphSyncService.syncCategory(category).catch(err => {
      console.warn('[CategoryController] Neo4j sync note:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (err) {
    next(err);
  }
};
