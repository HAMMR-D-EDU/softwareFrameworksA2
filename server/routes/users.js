const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// GET /api/users - Get all users
router.get('/', (req, res) => {
  const safeUsers = data.users.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

// DELETE /api/users/:userId - Remove user (Super Admin only)
router.delete('/:userId', (req, res) => {
  const { userId } = req.params;
  const { adminId } = req.body || {};
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin || !admin.roles.includes('super')) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can remove users' });
  }
  
  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  // Remove user from all groups
  data.groups.forEach(group => {
    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);
  });
  
  // Remove user from all channels
  data.channels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  });
  
  data.users.splice(userIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed successfully' });
});

// POST /api/users/:userId/promote-super
router.post('/:userId/promote-super', (req, res) => {
  const { userId } = req.params;
  const { promoterId } = req.body || {};
  
  const promoter = data.users.find(u => u.id === promoterId);
  if (!promoter || !(promoter.roles.includes('super') || promoter.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can promote to super admin' });
  }
  
  const user = data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (!user.roles.includes('super') && !user.roles.includes('super_admin')) {
    user.roles.push('super');
    user.roles.push('super_admin');
    data.groups.forEach(g => {
      if (!g.memberIds.includes(user.id)) g.memberIds.push(user.id);
      if (!g.adminIds.includes(user.id)) g.adminIds.push(user.id);
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User promoted to super admin' });
  }
  return res.json({ ok: true, msg: 'User is already a super admin' });
});

// DELETE /api/users/:userId/self
router.delete('/:userId/self', (req, res) => {
  const { userId } = req.params;
  const { password } = req.body || {};
  
  const user = data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (user.password !== password) {
    return res.status(401).json({ ok: false, msg: 'Incorrect password' });
  }
  
  // Remove user from groups and channels
  data.groups.forEach(group => {
    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);
  });
  
  data.channels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  });
  
  const userIndex = data.users.findIndex(u => u.id === userId);
  data.users.splice(userIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User account deleted successfully' });
});

// GET /api/users/:userId/groups
router.get('/:userId/groups', (req, res) => {
  const { userId } = req.params;
  const user = data.users.find(u => u.id === userId);
  if (user && (user.roles.includes('super') || user.roles.includes('super_admin'))) {
    return res.json(data.groups);
  }
  const userGroups = data.groups.filter(g => g.memberIds.includes(userId));
  res.json(userGroups);
});

// DELETE /api/users/:userId/groups/:groupId
router.delete('/:userId/groups/:groupId', (req, res) => {
  const { userId, groupId } = req.params;
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }
  
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  
  const groupChannels = data.channels.filter(c => c.groupId === groupId);
  groupChannels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
    channel.memberIds = (channel.memberIds || []).filter(id => id !== userId);
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'User left group successfully' });
});

module.exports = router;

