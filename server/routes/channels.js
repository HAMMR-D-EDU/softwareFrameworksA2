const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// POST /api/channels/:channelId/members
router.post('/:channelId/members', (req, res) => {
  const { channelId } = req.params;
  const { userId, adminId } = req.body || {};
  
  const channel = data.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = data.groups.find(g => g.id === channel.groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can add channel members' });
  }
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User must be a group member to be added to channel' });
  }
  
  channel.memberIds = channel.memberIds || [];
  if (channel.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User already a channel member' });
  }
  
  channel.memberIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to channel' });
});

// DELETE /api/channels/:channelId/members/:userId
router.delete('/:channelId/members/:userId', (req, res) => {
  const { channelId, userId } = req.params;
  const { adminId } = req.body || {};
  
  const channel = data.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = data.groups.find(g => g.id === channel.groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can remove channel members' });
  }
  
  channel.memberIds = channel.memberIds || [];
  if (!channel.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a channel member' });
  }
  
  channel.memberIds = channel.memberIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from channel' });
});

// POST /api/channels/:channelId/ban
router.post('/:channelId/ban', (req, res) => {
  const { channelId } = req.params;
  const { userId, adminId } = req.body || {};
  
  const channel = data.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = data.groups.find(g => g.id === channel.groupId);
  if (!group || group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner can ban users' });
  }
  
  const target = data.users.find(u => u.id === userId);
  if (target && (target.roles.includes('super') || target.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Super admins cannot be banned from channels' });
  }
  
  if (channel.bannedUserIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already banned' });
  }
  
  channel.bannedUserIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User banned from channel' });
});

// DELETE /api/channels/:channelId/ban/:userId
router.delete('/:channelId/ban/:userId', (req, res) => {
  const { channelId, userId } = req.params;
  const { adminId } = req.body || {};
  
  const channel = data.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = data.groups.find(g => g.id === channel.groupId);
  if (!group || group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner can unban users' });
  }
  
  if (!channel.bannedUserIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not banned from this channel' });
  }
  
  channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User unbanned from channel' });
});

module.exports = router;

