import { MongoClient } from 'mongodb';

// MongoDB connection URL and database name
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'microsoftteams';

let db = null;
let client = null;


async function connectToDatabase() {
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✓ Connected to MongoDB at ${MONGO_URL}/${DB_NAME}`);
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

function getCollection(collectionName) {
  return getDb().collection(collectionName);
}

async function healthCheck() {
  try {
    await db.command({ ping: 1 });
    console.log('✓ MongoDB health check passed');
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    throw error;
  }
}

async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

async function getNextId(collectionName, prefix) {
  const collection = getCollection(collectionName);
  const count = await collection.countDocuments();
  return `${prefix}${count + 1}`;
}

export {
  connectToDatabase,
  getDb,
  getCollection,
  healthCheck,
  closeDatabase,
  getNextId
};

