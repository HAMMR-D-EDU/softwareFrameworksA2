import express from 'express';
import { getCollection, getNextId } from '../config/db.js';

const router = express.Router();

// POST /api/reports
router.post('/', async (req, res) => {
  try {
    const { reporterId, subject, message, type, relatedUserId } = req.body || {};
    
    const usersCollection = getCollection('users');
    const reportsCollection = getCollection('reports');
    
    // Verify reporter is a group admin
    const reporter = await usersCollection.findOne({ id: reporterId });
    if (!reporter || (!reporter.roles.includes('groupAdmin') && !reporter.roles.includes('group_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only group admins can create reports' });
    }
    
    // Generate report ID
    const id = await getNextId('reports', 'r_');
    
    // Create report
    const report = {
      id,
      reporterId,
      subject,
      message,
      type,
      relatedUserId,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    await reportsCollection.insertOne(report);
    
    res.status(201).json({ ok: true, msg: 'Report submitted to super admins' });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { adminId } = req.query;
    
    const usersCollection = getCollection('users');
    const reportsCollection = getCollection('reports');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || (!admin.roles.includes('super') && !admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can view reports' });
    }
    
    // Get all reports
    const reports = await reportsCollection.find({}).toArray();
    res.json(reports.map(({ _id, ...report }) => report));
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
