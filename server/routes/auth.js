import express from 'express';
import { getCollection, getNextId } from '../config/db.js';

const router = express.Router();

// POST /api/echo //test route
router.post('/echo', (req, res) => {
  res.status(200).json({ youSent: req.body });
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const usersCollection = getCollection('users'); //call db to get users
    
    const user = await usersCollection.findOne({ username, password }); //finds login forms inputs and matches to db
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' }); //error handling
    }
    
    // Remove password and MongoDB _id from response
    const { password: _, _id, ...safe } = user; //removes password and _id from response back for security reaosns 
    res.json(safe); //puts values into safe var for security
  } catch (error) { //error ahndling
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    
    if (!username || !password || !email) {
      return res.status(400).json({ ok: false, msg: 'Missing required fields' });
    }
    
    // Check if username already exists
    const usersCollection = getCollection('users');
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ ok: false, msg: 'Username exists' });
    }
    
    // Check if email already exists
    const existingEmail = await usersCollection.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ ok: false, msg: 'Email already exists' });
    }
    
    // Generate new user ID imoproted from from db.js
    const id = await getNextId('users', 'u_');
    
    // Create new user
    const newUser = {
      id,
      username,
      password,
      email,
      roles: ['user'],
      groups: [] //check down the line for avatr path might be good to have here for data clarity
    };
    
    await usersCollection.insertOne(newUser);
    
    res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

export default router;

