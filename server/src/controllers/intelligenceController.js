const intelligenceService = require('../services/intelligenceService');

exports.getRestockRecommendations = async (req, res, next) => {
  try {
    const recommendations = await intelligenceService.getRestockRecommendations();
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (err) {
    next(err);
  }
};

exports.getSupplyChainGraph = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const graphData = await intelligenceService.getSupplyChainGraph(productId);
    res.status(200).json({
      success: true,
      data: graphData
    });
  } catch (err) {
    next(err);
  }
};

exports.getAlternativeSuppliers = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const suppliers = await intelligenceService.getAlternativeSuppliers(productId);
    res.status(200).json({
      success: true,
      data: suppliers
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategorySubstitutes = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const substitutes = await intelligenceService.getCategorySubstitutes(productId);
    res.status(200).json({
      success: true,
      data: substitutes
    });
  } catch (err) {
    next(err);
  }
};
