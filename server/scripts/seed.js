require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { connectNeo4j } = require('../src/config/neo4j');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const Warehouse = require('../src/models/Warehouse');
const Product = require('../src/models/Product');
const StockMovement = require('../src/models/StockMovement');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const graphSyncService = require('../src/services/graphSyncService');

const runSeed = async () => {
  console.log('[Seed] Commencing StockSphere database seeding...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Warehouse.deleteMany({}),
    Product.deleteMany({}),
    StockMovement.deleteMany({}),
    PurchaseOrder.deleteMany({})
  ]);

  console.log('[Seed] Cleared existing records.');

  // 1. Seed Users
  const admin = await User.create({
    name: 'Dr. Vikram Malhotra (Lab Admin)',
    email: 'admin@stocksphere.com',
    passwordHash: 'admin123',
    role: 'Admin',
    isActive: true
  });

  const staff = await User.create({
    name: 'Priya Sharma (Store Keeper)',
    email: 'staff@stocksphere.com',
    passwordHash: 'staff123',
    role: 'InventoryStaff',
    isActive: true
  });

  console.log('[Seed] Users seeded: admin@stocksphere.com, staff@stocksphere.com');

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Microcontrollers & SOCs', code: 'MCUS', description: 'Embedded processors, single-board computers, development kits' },
    { name: 'Computer Hardware & Networking', code: 'COMP', description: 'RAM, SSDs, Gigabit switches, routers, interface cables' },
    { name: 'Sensors & Transducers', code: 'SENS', description: 'Environmental, ultrasonic, IMU, and optical sensing hardware' },
    { name: 'Robotics & Actuators', code: 'ROBO', description: 'Servo motors, stepper controllers, robotic chassis, drivers' }
  ];
  const categories = await Category.insertMany(categoriesData);
  for (const cat of categories) {
    await graphSyncService.syncCategory(cat);
  }
  console.log(`[Seed] Seeded ${categories.length} categories.`);

  // 3. Seed Suppliers
  const suppliersData = [
    { name: 'Apex Micro Devices Ltd', code: 'SUPP-APEX', email: 'orders@apexmicro.com', phone: '+91-9876543210', address: 'Tech Park Phase 1, Bangalore', leadTimeDays: 3, status: 'ACTIVE' },
    { name: 'Silicon Valley Components', code: 'SUPP-SVCH', email: 'sales@siliconhub.in', phone: '+91-9811223344', address: 'Electronic City, Hyderabad', leadTimeDays: 6, status: 'ACTIVE' },
    { name: 'Quantum Photonics Direct', code: 'SUPP-QPD', email: 'quantum@directparts.com', phone: '+91-9988776655', address: 'Industrial Area, Pune', leadTimeDays: 2, status: 'ACTIVE' },
    { name: 'Nexus Embedded Systems', code: 'SUPP-NEX', email: 'support@nexusembedded.com', phone: '+91-9123456780', address: 'Okhla Phase 3, New Delhi', leadTimeDays: 4, status: 'ACTIVE' },
    { name: 'Titanium Precision Instruments', code: 'SUPP-TPI', email: 'orders@titaniumprecision.com', phone: '+91-9555667788', address: 'MIDC Industrial Estate, Mumbai', leadTimeDays: 10, status: 'ACTIVE' },
    { name: 'Global Sensors & Actuators', code: 'SUPP-GSA', email: 'info@globalsensors.org', phone: '+91-9444332211', address: 'Cyber Gateway, Chennai', leadTimeDays: 7, status: 'ACTIVE' }
  ];
  const suppliers = await Supplier.insertMany(suppliersData);
  for (const supp of suppliers) {
    await graphSyncService.syncSupplier(supp);
  }
  console.log(`[Seed] Seeded ${suppliers.length} suppliers.`);

  // 4. Seed Warehouses
  const warehousesData = [
    { name: 'Central Logistics Hub (Warehouse Alpha)', code: 'WH-ALPHA', location: 'Building 4, Sector 7, Central Campus', managerName: 'Ramesh Verma', capacityUnits: 25000 },
    { name: 'CS Dept Hardware Laboratory (Warehouse Beta)', code: 'WH-BETA', location: 'CSE Block 3rd Floor, Lab 304', managerName: 'Priya Sharma', capacityUnits: 5000 },
    { name: 'Advanced Robotics Workshop (Warehouse Gamma)', code: 'WH-GAMMA', location: 'Innovation Quadrangle Wing B', managerName: 'Kavita Sundaram', capacityUnits: 8000 }
  ];
  const warehouses = await Warehouse.insertMany(warehousesData);
  for (const wh of warehouses) {
    await graphSyncService.syncWarehouse(wh);
  }
  console.log(`[Seed] Seeded ${warehouses.length} warehouses.`);

  // Map helpers
  const [catMCU, catCOMP, catSENS, catROBO] = categories;
  const [suppApex, suppSV, suppQuantum, suppNexus, suppTitanium, suppGlobal] = suppliers;
  const [whAlpha, whBeta, whGamma] = warehouses;

  // 5. Seed 20 Realistic Products
  const productsData = [
    // Microcontrollers (MCUS)
    {
      sku: 'MCU-RPI5-8GB',
      name: 'Raspberry Pi 5 Model B (8GB RAM)',
      description: 'Quad-core 64-bit Arm Cortex-A76 processor with dual 4K micro-HDMI outputs.',
      category: catMCU._id,
      primarySupplier: suppApex._id,
      defaultWarehouse: whBeta._id,
      unitCost: 7200,
      sellingPrice: 8500,
      quantityOnHand: 4, // LOW STOCK (<= 15)
      reorderThreshold: 15
    },
    {
      sku: 'MCU-RPI5-4GB',
      name: 'Raspberry Pi 5 Model B (4GB RAM)',
      description: 'Single-board computer with 4GB LPDDR4X SDRAM and PCIe 2.0 interface.',
      category: catMCU._id,
      primarySupplier: suppQuantum._id,
      defaultWarehouse: whBeta._id,
      unitCost: 5500,
      sellingPrice: 6500,
      quantityOnHand: 28, // HEALTHY
      reorderThreshold: 10
    },
    {
      sku: 'MCU-ESP32-S3',
      name: 'ESP32-S3 DevKitC-1 N8R8',
      description: 'Dual-core Xtensa LX7 MCU with 2.4 GHz Wi-Fi & BLE 5.0, 8MB Flash & 8MB PSRAM.',
      category: catMCU._id,
      primarySupplier: suppNexus._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 650,
      sellingPrice: 850,
      quantityOnHand: 0, // OUT OF STOCK
      reorderThreshold: 25
    },
    {
      sku: 'MCU-ESP32-WROOM',
      name: 'ESP32-WROOM-32D Core Board',
      description: 'Generic Wi-Fi and Bluetooth module development board for IoT prototyping.',
      category: catMCU._id,
      primarySupplier: suppApex._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 380,
      sellingPrice: 520,
      quantityOnHand: 84, // HEALTHY
      reorderThreshold: 20
    },
    {
      sku: 'MCU-ARD-GIGA',
      name: 'Arduino GIGA R1 WiFi',
      description: 'Dual-core STM32H747XI microcontroller with dual Wi-Fi/BLE and USB Host.',
      category: catMCU._id,
      primarySupplier: suppSV._id,
      defaultWarehouse: whBeta._id,
      unitCost: 6100,
      sellingPrice: 7200,
      quantityOnHand: 3, // LOW STOCK
      reorderThreshold: 8
    },

    // Computer Hardware & Networking (COMP)
    {
      sku: 'NET-SW-8P-GIG',
      name: '8-Port Gigabit Unmanaged Switch',
      description: 'Full duplex IEEE 802.3x flow control, metal desktop housing.',
      category: catCOMP._id,
      primarySupplier: suppSV._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 1850,
      sellingPrice: 2400,
      quantityOnHand: 22,
      reorderThreshold: 10
    },
    {
      sku: 'STR-SSD-NVME-1TB',
      name: 'Samsung 980 Pro 1TB NVMe M.2 SSD',
      description: 'PCIe 4.0 NVMe SSD up to 7,000 MB/s read speed for high-speed cache servers.',
      category: catCOMP._id,
      primarySupplier: suppSV._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 8200,
      sellingPrice: 9900,
      quantityOnHand: 2, // LOW STOCK
      reorderThreshold: 12
    },
    {
      sku: 'STR-SSD-NVME-500G',
      name: 'Crucial P3 500GB PCIe 3.0 SSD',
      description: 'Reliable Gen3 NVMe storage module for laboratory workstation fleet.',
      category: catCOMP._id,
      primarySupplier: suppNexus._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 3400,
      sellingPrice: 4200,
      quantityOnHand: 35,
      reorderThreshold: 10
    },
    {
      sku: 'RAM-DDR5-16GB',
      name: 'Corsair Vengeance 16GB DDR5 5600MHz',
      description: 'High-bandwidth system memory module with onboard PMIC voltage regulation.',
      category: catCOMP._id,
      primarySupplier: suppApex._id,
      defaultWarehouse: whBeta._id,
      unitCost: 4400,
      sellingPrice: 5300,
      quantityOnHand: 18,
      reorderThreshold: 10
    },
    {
      sku: 'CAB-ETH-CAT6-3M',
      name: 'Cat6 Shielded Patch Cable (3-Meter)',
      description: 'RJ45 snagless molded strain relief gigabit patch cord.',
      category: catCOMP._id,
      primarySupplier: suppQuantum._id,
      defaultWarehouse: whAlpha._id,
      unitCost: 120,
      sellingPrice: 220,
      quantityOnHand: 150,
      reorderThreshold: 40
    },

    // Sensors & Transducers (SENS)
    {
      sku: 'SEN-LIDAR-A1M8',
      name: 'RPLiDAR A1M8 360-Degree 2D Laser Scanner',
      description: 'Omnidirectional laser range scanner measuring up to 12 meters for SLAM robots.',
      category: catSENS._id,
      primarySupplier: suppTitanium._id,
      defaultWarehouse: whGamma._id,
      unitCost: 9500,
      sellingPrice: 11500,
      quantityOnHand: 1, // CRITICAL LOW
      reorderThreshold: 5
    },
    {
      sku: 'SEN-IMU-BNO055',
      name: 'Bosch BNO055 9-DOF Absolute Orientation IMU',
      description: 'Intelligent 9-axis sensor combining accelerometer, gyroscope, and magnetometer with sensor fusion.',
      category: catSENS._id,
      primarySupplier: suppGlobal._id,
      defaultWarehouse: whGamma._id,
      unitCost: 2800,
      sellingPrice: 3500,
      quantityOnHand: 19,
      reorderThreshold: 8
    },
    {
      sku: 'SEN-CAM-OAK-D',
      name: 'Luxonis OAK-D Spatial AI Camera',
      description: 'On-device neural inference camera with stereo depth sensing and 4K RGB sensor.',
      category: catSENS._id,
      primarySupplier: suppApex._id,
      defaultWarehouse: whGamma._id,
      unitCost: 19500,
      sellingPrice: 23000,
      quantityOnHand: 0, // OUT OF STOCK
      reorderThreshold: 4
    },
    {
      sku: 'SEN-ENV-BME280',
      name: 'BME280 Temperature, Humidity & Pressure Sensor',
      description: 'Digital sensor with I2C/SPI interfaces for weather stations and cleanroom monitoring.',
      category: catSENS._id,
      primarySupplier: suppQuantum._id,
      defaultWarehouse: whBeta._id,
      unitCost: 450,
      sellingPrice: 650,
      quantityOnHand: 65,
      reorderThreshold: 15
    },
    {
      sku: 'SEN-ULTRA-HCSR04',
      name: 'HC-SR04 Ultrasonic Distance Sensor Module',
      description: 'Non-contact distance measurement module from 2cm to 400cm.',
      category: catSENS._id,
      primarySupplier: suppNexus._id,
      defaultWarehouse: whBeta._id,
      unitCost: 95,
      sellingPrice: 160,
      quantityOnHand: 140,
      reorderThreshold: 30
    },

    // Robotics & Actuators (ROBO)
    {
      sku: 'ACT-SERVO-MG996R',
      name: 'MG996R High Torque Metal Gear Servo',
      description: 'Metal gear standard analog servo motor delivering up to 11 kg-cm stall torque.',
      category: catROBO._id,
      primarySupplier: suppGlobal._id,
      defaultWarehouse: whGamma._id,
      unitCost: 420,
      sellingPrice: 600,
      quantityOnHand: 5, // LOW STOCK
      reorderThreshold: 20
    },
    {
      sku: 'ACT-STEP-NEMA17',
      name: 'NEMA 17 Stepper Motor 42BYGHW',
      description: '1.8 degree step angle bipolar stepper motor with 4.4 kg-cm holding torque.',
      category: catROBO._id,
      primarySupplier: suppGlobal._id,
      defaultWarehouse: whGamma._id,
      unitCost: 850,
      sellingPrice: 1200,
      quantityOnHand: 42,
      reorderThreshold: 15
    },
    {
      sku: 'DRV-STEP-A4988',
      name: 'A4988 Stepper Motor Driver Carrier',
      description: 'Microstepping driver board with adjustable current limiting and overcurrent protection.',
      category: catROBO._id,
      primarySupplier: suppQuantum._id,
      defaultWarehouse: whGamma._id,
      unitCost: 110,
      sellingPrice: 190,
      quantityOnHand: 110,
      reorderThreshold: 25
    },
    {
      sku: 'ROB-CHASS-4WD',
      name: '4WD Aluminum Robot Smart Car Chassis',
      description: 'Heavy duty robotic platform with 4 TT DC gear motors and encoder discs.',
      category: catROBO._id,
      primarySupplier: suppNexus._id,
      defaultWarehouse: whGamma._id,
      unitCost: 1600,
      sellingPrice: 2250,
      quantityOnHand: 2, // LOW STOCK
      reorderThreshold: 10
    },
    {
      sku: 'BAT-LIPO-3S-2200',
      name: '3S 11.1V 2200mAh 35C LiPo Battery Pack',
      description: 'High discharge rechargeable lithium polymer battery for autonomous mobile robots.',
      category: catROBO._id,
      primarySupplier: suppApex._id,
      defaultWarehouse: whGamma._id,
      unitCost: 1750,
      sellingPrice: 2300,
      quantityOnHand: 24,
      reorderThreshold: 10
    }
  ];

  const products = await Product.insertMany(productsData);
  console.log(`[Seed] Seeded ${products.length} products.`);

  // 6. Synchronize Products to Neo4j and inject multi-supplier relationships for graph testing
  for (const prod of products) {
    await graphSyncService.syncProduct(prod);
  }

  // Inject secondary suppliers for key products to demonstrate Neo4j multi-supplier alternative ranking:
  // e.g. RPLiDAR A1M8: Primary is Titanium (10d lead), Secondary is Quantum (2d lead) and Apex (3d lead)!
  const lidarProd = products.find(p => p.sku === 'SEN-LIDAR-A1M8');
  if (lidarProd) {
    await graphSyncService.linkSupplierToProduct(suppQuantum._id, lidarProd._id, {
      isPrimary: false,
      leadTimeDays: 2,
      unitCost: 9800
    });
    await graphSyncService.linkSupplierToProduct(suppApex._id, lidarProd._id, {
      isPrimary: false,
      leadTimeDays: 3,
      unitCost: 9650
    });
  }

  // Raspberry Pi 5 8GB: Primary is Apex (3d), Secondary is SVCH (6d)
  const rpiProd = products.find(p => p.sku === 'MCU-RPI5-8GB');
  if (rpiProd) {
    await graphSyncService.linkSupplierToProduct(suppSV._id, rpiProd._id, {
      isPrimary: false,
      leadTimeDays: 6,
      unitCost: 7350
    });
  }

  // NVMe 1TB: Primary is SVCH (6d), Secondary is Apex (3d)
  const nvmeProd = products.find(p => p.sku === 'STR-SSD-NVME-1TB');
  if (nvmeProd) {
    await graphSyncService.linkSupplierToProduct(suppApex._id, nvmeProd._id, {
      isPrimary: false,
      leadTimeDays: 3,
      unitCost: 8300
    });
  }

  console.log('[Seed] Multi-supplier topological edges established in Graph.');

  // 7. Seed Initial Stock Movements (Audit Trail)
  const movementsData = [
    {
      product: products[0]._id, // RPI5-8GB
      warehouse: whBeta._id,
      user: admin._id,
      movementType: 'STOCK_IN',
      quantity: 10,
      previousQuantity: 0,
      newQuantity: 10,
      reason: 'Initial lab grant acquisition',
      referenceNumber: 'GRANT-2026-CS-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
    },
    {
      product: products[0]._id, // RPI5-8GB
      warehouse: whBeta._id,
      user: staff._id,
      movementType: 'STOCK_OUT',
      quantity: 6,
      previousQuantity: 10,
      newQuantity: 4,
      reason: 'Issue to M.Tech IoT research scholars',
      referenceNumber: 'DISPATCH-8821',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    },
    {
      product: products[2]._id, // ESP32-S3
      warehouse: whAlpha._id,
      user: staff._id,
      movementType: 'STOCK_OUT',
      quantity: 20,
      previousQuantity: 20,
      newQuantity: 0,
      reason: 'B.Tech Embedded Systems Hackathon allocation',
      referenceNumber: 'EVENT-HACK-04',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
    },
    {
      product: products[10]._id, // RPLiDAR
      warehouse: whGamma._id,
      user: admin._id,
      movementType: 'STOCK_OUT',
      quantity: 4,
      previousQuantity: 5,
      newQuantity: 1,
      reason: 'Autonomous AGV chassis installation',
      referenceNumber: 'PROJ-ROBO-99',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18)
    },
    {
      product: products[15]._id, // MG996R
      warehouse: whGamma._id,
      user: staff._id,
      movementType: 'ADJUSTMENT',
      quantity: 5,
      previousQuantity: 10,
      newQuantity: 5,
      reason: 'Physical cycle count discrepancy adjustment',
      referenceNumber: 'AUDIT-Q3-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12)
    }
  ];
  await StockMovement.insertMany(movementsData);
  console.log('[Seed] Stock movements audit entries recorded.');

  // 8. Seed Purchase Orders (Draft, Submitted, Received)
  const po1 = await PurchaseOrder.create({
    orderNumber: 'PO-2026-1001',
    supplier: suppApex._id,
    warehouse: whBeta._id,
    status: 'RECEIVED',
    items: [
      {
        product: products[0]._id,
        sku: products[0].sku,
        productName: products[0].name,
        orderedQuantity: 10,
        receivedQuantity: 10,
        unitCost: products[0].unitCost,
        subtotal: products[0].unitCost * 10
      }
    ],
    totalAmount: products[0].unitCost * 10,
    orderDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    receivedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    createdBy: admin._id,
    notes: 'Urgent procurement for semester project laboratories'
  });

  const po2 = await PurchaseOrder.create({
    orderNumber: 'PO-2026-1002',
    supplier: suppQuantum._id,
    warehouse: whBeta._id,
    status: 'SUBMITTED',
    items: [
      {
        product: products[2]._id, // ESP32-S3
        sku: products[2].sku,
        productName: products[2].name,
        orderedQuantity: 50,
        receivedQuantity: 0,
        unitCost: products[2].unitCost,
        subtotal: products[2].unitCost * 50
      }
    ],
    totalAmount: products[2].unitCost * 50,
    orderDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    expectedDeliveryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    createdBy: admin._id,
    notes: 'Replenishment order for depleted hackathon inventory'
  });

  const po3 = await PurchaseOrder.create({
    orderNumber: 'PO-2026-1003',
    supplier: suppTitanium._id,
    warehouse: whGamma._id,
    status: 'DRAFT',
    items: [
      {
        product: products[10]._id, // RPLiDAR
        sku: products[10].sku,
        productName: products[10].name,
        orderedQuantity: 10,
        receivedQuantity: 0,
        unitCost: products[10].unitCost,
        subtotal: products[10].unitCost * 10
      }
    ],
    totalAmount: products[10].unitCost * 10,
    orderDate: new Date(),
    createdBy: admin._id,
    notes: 'Draft order pending department chair budget approval'
  });

  console.log(`[Seed] Seeded 3 Purchase Orders (Received, Submitted, Draft).`);
  console.log('[Seed] *** Seed completed successfully! ***');
};

// Execute if run directly via CLI
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await connectNeo4j();
      await runSeed();
      process.exit(0);
    } catch (err) {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    }
  })();
}

module.exports = { runSeed };
