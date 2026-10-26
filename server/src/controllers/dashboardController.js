const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    // Pipeline 1: Catalog Aggregation via $facet for high-performance single-pass metrics
    const [metricsFacet] = await Product.aggregate([
      { $match: { isArchived: false } },
      {
        $facet: {
          overallMetrics: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockUnits: { $sum: '$quantityOnHand' },
                totalInventoryValuation: {
                  $sum: { $multiply: ['$quantityOnHand', '$unitCost'] }
                },
                potentialRevenue: {
                  $sum: { $multiply: ['$quantityOnHand', '$sellingPrice'] }
                },
                outOfStockCount: {
                  $sum: { $cond: [{ $eq: ['$quantityOnHand', 0] }, 1, 0] }
                },
                lowStockCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lte: ['$quantityOnHand', '$reorderThreshold'] },
                          { $gt: ['$quantityOnHand', 0] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                },
                healthyStockCount: {
                  $sum: {
                    $cond: [{ $gt: ['$quantityOnHand', '$reorderThreshold'] }, 1, 0]
                  }
                }
              }
            }
          ],
          lowStockCandidates: [
            {
              $match: {
                $expr: { $lte: ['$quantityOnHand', '$reorderThreshold'] }
              }
            },
            { $sort: { quantityOnHand: 1 } },
            { $limit: 5 },
            {
              $project: {
                sku: 1,
                name: 1,
                quantityOnHand: 1,
                reorderThreshold: 1,
                unitCost: 1,
                shortage: { $subtract: ['$reorderThreshold', '$quantityOnHand'] }
              }
            }
          ]
        }
      }
    ]);

    const metrics = metricsFacet.overallMetrics[0] || {
      totalProducts: 0,
      totalStockUnits: 0,
      totalInventoryValuation: 0,
      potentialRevenue: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      healthyStockCount: 0
    };

    // Pipeline 2: Category Valuation Breakdown
    const categoryDistribution = await Product.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$category',
          totalUnits: { $sum: '$quantityOnHand' },
          totalValue: { $sum: { $multiply: ['$quantityOnHand', '$unitCost'] } },
          productCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          _id: 1,
          name: '$categoryDetails.name',
          code: '$categoryDetails.code',
          totalUnits: 1,
          totalValue: { $round: ['$totalValue', 2] },
          productCount: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Pipeline 3: Movement Trends (Aggregated over past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movementSummary = await StockMovement.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$movementType',
          totalUnits: { $sum: '$quantity' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    // Pipeline 4: Recent 6 Stock Movements with Populated References
    const recentMovements = await StockMovement.find()
      .sort({ timestamp: -1 })
      .limit(6)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('user', 'name');

    // Counts for ancillary entities
    const totalSuppliers = await Supplier.countDocuments({ status: 'ACTIVE' });
    const totalWarehouses = await Warehouse.countDocuments({ isActive: true });
    const pendingPurchaseOrders = await PurchaseOrder.countDocuments({
      status: { $in: ['DRAFT', 'SUBMITTED'] }
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: metrics.totalProducts,
          totalStockUnits: metrics.totalStockUnits,
          totalInventoryValuation: Number(metrics.totalInventoryValuation.toFixed(2)),
          potentialRevenue: Number(metrics.potentialRevenue.toFixed(2)),
          outOfStockCount: metrics.outOfStockCount,
          lowStockCount: metrics.lowStockCount,
          healthyStockCount: metrics.healthyStockCount,
          totalSuppliers,
          totalWarehouses,
          pendingPurchaseOrders
        },
        categoryDistribution,
        movementSummary,
        recentMovements,
        urgentReplenishment: metricsFacet.lowStockCandidates
      }
    });
  } catch (err) {
    next(err);
  }
};
