require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const { connectNeo4j, closeNeo4j } = require('../src/config/neo4j');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const Warehouse = require('../src/models/Warehouse');
const graphSyncService = require('../src/services/graphSyncService');

const runSync = async () => {
  console.log('[GraphReconciler] Starting MongoDB -> Neo4j graph reconciliation...');

  await connectDB();
  await connectNeo4j();

  // 1. Categories
  const categories = await Category.find();
  console.log(`[GraphReconciler] Syncing ${categories.length} categories...`);
  for (const cat of categories) {
    await graphSyncService.syncCategory(cat);
  }

  // 2. Suppliers
  const suppliers = await Supplier.find();
  console.log(`[GraphReconciler] Syncing ${suppliers.length} suppliers...`);
  for (const supp of suppliers) {
    await graphSyncService.syncSupplier(supp);
  }

  // 3. Warehouses
  const warehouses = await Warehouse.find();
  console.log(`[GraphReconciler] Syncing ${warehouses.length} warehouses...`);
  for (const wh of warehouses) {
    await graphSyncService.syncWarehouse(wh);
  }

  // 4. Products
  const products = await Product.find({ isArchived: false })
    .populate('category')
    .populate('primarySupplier')
    .populate('defaultWarehouse');

  console.log(`[GraphReconciler] Syncing ${products.length} products and topological edges...`);
  for (const prod of products) {
    await graphSyncService.syncProduct(prod);
  }

  console.log('[GraphReconciler] *** Graph Reconciliation Complete! ***');
  await disconnectDB();
  await closeNeo4j();
};

if (require.main === module) {
  runSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[GraphReconciler] Sync failed:', err);
      process.exit(1);
    });
}

module.exports = { runSync };
