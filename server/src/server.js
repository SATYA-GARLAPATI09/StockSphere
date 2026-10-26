require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { connectNeo4j, isNeo4jActive } = require('./config/neo4j');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const stockRoutes = require('./routes/stockRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Permissive for local dev & college evaluation
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'StockSphere — Intelligent Inventory Management System',
    timestamp: new Date().toISOString(),
    databases: {
      mongoDB: 'CONNECTED',
      neo4j: isNeo4jActive() ? 'CONNECTED' : 'STANDALONE_FALLBACK_ACTIVE'
    }
  });
});

// Mount API Modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/inventory', stockRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);

// Catch-all 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' does not exist on StockSphere server`
  });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectNeo4j();

    // Check if initial admin exists, or auto-seed baseline if empty
    const User = require('./models/User');
    const adminCount = await User.countDocuments();
    if (adminCount === 0) {
      console.log('[Bootstrap] No users found. Running initial baseline seed...');
      const seedScript = require('../scripts/seed');
      await seedScript.runSeed();
    }

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  StockSphere Server Running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
