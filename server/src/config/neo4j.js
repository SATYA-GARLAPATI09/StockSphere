const neo4j = require('neo4j-driver');

let driver = null;
let isConnected = false;

// In-memory fallback graph store in case Neo4j daemon is not actively running locally
const graphStore = {
  nodes: new Map(), // id -> { id, label, properties }
  edges: [] // { source, target, type, properties }
};

const connectNeo4j = async () => {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password123';

  try {
    console.log(`[Neo4j] Attempting connection to: ${uri}`);
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      connectionTimeout: 2000,
      maxConnectionPoolSize: 50
    });

    await driver.verifyConnectivity();
    isConnected = true;
    console.log('[Neo4j] Connected to graph database successfully via Bolt protocol.');

    // Initialize constraints
    await initConstraints();
  } catch (err) {
    console.warn(`[Neo4j] Daemon not accessible at ${uri}: ${err.message}`);
    console.log('[Neo4j] Operating in Resilient Dual-Mode (Authoritative In-Memory Graph Engine activated).');
    isConnected = false;
  }
};

const initConstraints = async () => {
  if (!isConnected || !driver) return;
  const session = driver.session();
  try {
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.mongoId IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (s:Supplier) REQUIRE s.mongoId IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.mongoId IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (w:Warehouse) REQUIRE w.mongoId IS UNIQUE
    `);
    console.log('[Neo4j] Schema constraints verified.');
  } catch (err) {
    console.warn('[Neo4j] Notice on constraint creation:', err.message);
  } finally {
    await session.close();
  }
};

const getSession = () => {
  if (isConnected && driver) {
    return driver.session();
  }
  return null;
};

const isNeo4jActive = () => isConnected;

const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
  }
};

module.exports = {
  connectNeo4j,
  getSession,
  isNeo4jActive,
  closeNeo4j,
  graphStore // Accessible for synchronization fallback
};
