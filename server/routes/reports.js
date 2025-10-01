const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// POST /api/reports
router.post('/', (req, res) => {
  const { reporterId, subject, message, type, relatedUserId } = req.body || {};
  
  const reporter = data.users.find(u => u.id === reporterId);
  if (!reporter || (!reporter.roles.includes('groupAdmin') && !reporter.roles.includes('group_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create reports' });
  }
  
  const report = {
    id: `r_${data.reports.length + 1}`,
    reporterId,
    subject,
    message,
    type,
    relatedUserId,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  data.reports.push(report);
  saveDataToDisk();
  res.status(201).json({ ok: true, msg: 'Report submitted to super admins' });
});

// GET /api/reports
router.get('/', (req, res) => {
  const { adminId } = req.query;
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || (!admin.roles.includes('super') && !admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can view reports' });
  }
  
  res.json(data.reports);
});

module.exports = router;

