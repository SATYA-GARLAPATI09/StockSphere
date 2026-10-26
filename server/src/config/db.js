const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stocksphere';

  try {
    // Attempt standard connection to configured MONGODB_URI
    console.log(`[MongoDB] Attempting connection to: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick fallback if local mongod is not running
    });
    console.log(`[MongoDB] Connected successfully to ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.warn(`[MongoDB] Local/configured instance not available at ${uri}: ${err.message}`);
    console.log('[MongoDB] Starting isolated in-process MongoDB instance (MongoMemoryServer)...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoMemoryServer.getUri();
      console.log(`[MongoDB] In-memory instance started at: ${inMemoryUri}`);

      await mongoose.connect(inMemoryUri);
      console.log('[MongoDB] Connected to in-process MongoDB instance successfully.');
    } catch (memErr) {
      console.error('[MongoDB] Fatal error initializing in-process MongoDB:', memErr.message);
      throw memErr;
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost.');
  });
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
