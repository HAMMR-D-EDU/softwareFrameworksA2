//Usage: node config/initDb.js


import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'microsoftteams';
const DATA_FILE = path.join(__dirname, '../data.json');

async function initializeDatabase() {
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log(`✓ Connected to MongoDB at ${MONGO_URL}`);
    
    const db = client.db(DB_NAME);
    
    // Read existing data.json
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(rawData);
      
      console.log('\nInitializing collections with data from data.json...\n');
      
      // Clear existing collections
      const collections = ['users', 'groups', 'channels', 'groupInterests', 'reports'];
      for (const collectionName of collections) {
        try {
          await db.collection(collectionName).deleteMany({});
          console.log(`  Cleared: ${collectionName}`);
        } catch (err) {
          // Collection might not exist yet, which is fine
          console.log(`  Created: ${collectionName}`);
        }
      }
      
      // Insert data into collections
      if (data.users && data.users.length > 0) {
        await db.collection('users').insertMany(data.users);
        console.log(`Inserted ${data.users.length} users`);
      }
      
      if (data.groups && data.groups.length > 0) {
        await db.collection('groups').insertMany(data.groups);
        console.log(`Inserted ${data.groups.length} groups`);
      }
      
      if (data.channels && data.channels.length > 0) {
        await db.collection('channels').insertMany(data.channels);
        console.log(`Inserted ${data.channels.length} channels`);
      }
      
      if (data.groupInterests && data.groupInterests.length > 0) {
        await db.collection('groupInterests').insertMany(data.groupInterests);
        console.log(`  ✓ Inserted ${data.groupInterests.length} group interests`);
      }
      
      if (data.reports && data.reports.length > 0) {
        await db.collection('reports').insertMany(data.reports);
        console.log(`Inserted ${data.reports.length} reports`);
      }
      
      // Create messages collection (empty, ready for Phase 2)
      await db.createCollection('messages');
      console.log(`Created messages collection (empty, ready for Phase 2)`);
      
      
      console.log('\n Database initialization complete!\n');
      console.log('You can now start your server with: npm start\n');
    } else {
      console.log('data.json not found. Creating empty collections with default super admin...\n');
      
      // Create empty collections
      const collections = ['users', 'groups', 'channels', 'groupInterests', 'reports', 'messages'];
      for (const collectionName of collections) {
        await db.createCollection(collectionName);
        console.log(`  ✓ Created: ${collectionName}`);
      }
      
      // Insert default super admin user
      await db.collection('users').insertOne({
        id: 'u_1',
        username: 'super',
        password: '123',
        email: 'super@macrohard.com',
        roles: ['super', 'super_admin'],
        groups: []
      });
      console.log('Created default super admin (username: super, password: 123)');
      
      
      console.log('\nDatabase setup complete!\n');
      console.log('Default super admin created:');
      console.log('  Username: super');
      console.log('  Password: 123\n');
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Connection closed.');
    }
  }
}

// Run initialization
initializeDatabase();

