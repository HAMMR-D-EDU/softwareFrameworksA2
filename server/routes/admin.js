const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// GET /admin/users
router.get('/users', (req, res) => {
  const adminId = req.query.adminId;
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can view users' });
  }
  const safe = data.users.map(({ password, ...u }) => u);
  res.json(safe);
});

// POST /admin/users
router.post('/users', (req, res) => {
  const { adminId, username, email = '', password = '123' } = req.body || {};
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can create users' });
  }
  if (!username) return res.status(400).json({ ok: false, msg: 'Username is required' });
  if (data.users.some(u => u.username === username)) {
    return res.status(409).json({ ok: false, msg: 'Username exists' });
  }
  const id = `u_${data.users.length + 1}`;
  data.users.push({ id, username, password, email, roles: ['user'], groups: [] });
  saveDataToDisk();
  const { password: _pw, ...safe } = data.users.find(u => u.id === id) || {};
  return res.status(201).json({ ok: true, user: safe });
});

// PATCH /admin/users/:id/role
router.patch('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { add, remove, adminId } = req.body || {};
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can modify roles' });
  }
  const user = data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

  if (add === 'group_admin') {
    if (!user.roles.includes('group_admin')) user.roles.push('group_admin');
    if (!user.roles.includes('groupAdmin')) user.roles.push('groupAdmin');
    data.groups.forEach(g => {
      if (g.memberIds.includes(user.id) && !g.adminIds.includes(user.id)) {
        g.adminIds.push(user.id);
      }
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User promoted to group_admin' });
  }
  if (remove === 'group_admin') {
    user.roles = user.roles.filter(r => r !== 'group_admin' && r !== 'groupAdmin');
    data.groups.forEach(g => {
      g.adminIds = g.adminIds.filter(aid => aid !== user.id);
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User demoted from group_admin' });
  }
  return res.status(400).json({ ok: false, msg: 'Specify add or remove for role' });
});

// POST /admin/groups/:groupId/members
router.post('/groups/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const { userId, adminId } = req.body || {};
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can add members' });
  }
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  if (group.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'Already a member' });
  }
  group.memberIds.push(userId);
  const addedUser = data.users.find(u => u.id === userId);
  if (addedUser && (addedUser.roles.includes('group_admin') || addedUser.roles.includes('groupAdmin'))) {
    if (!group.adminIds.includes(userId)) group.adminIds.push(userId);
  }
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

// DELETE /admin/groups/:groupId/members/:userId
router.delete('/groups/:groupId/members/:userId', (req, res) => {
  const { groupId, userId } = req.params;
  const adminId = req.query.adminId;
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can remove members' });
  }
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from group' });
});

module.exports = router;

