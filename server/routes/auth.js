const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// POST /api/echo
router.post('/echo', (req, res) => {
  res.status(200).json({ youSent: req.body });
});

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// POST /api/register
router.post('/register', (req, res) => {
  const { username, password, email = '' } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  if (data.users.some(u => u.username === username)) {
    return res.status(409).json({ ok: false, msg: 'Username exists' });
  }
  const id = `u_${data.users.length + 1}`;
  data.users.push({ id, username, password, email, roles: ['user'], groups: [] });
  saveDataToDisk();
  res.status(201).json({ ok: true, id });
});

module.exports = router;

