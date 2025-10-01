const express = require('express');
const router = express.Router();
const { data, saveDataToDisk } = require('../config/data');

// GET /api/groups
router.get('/', (req, res) => {
  res.json(data.groups);
});

// POST /api/groups
router.post('/', (req, res) => {
  const { name, creatorId } = req.body || {};
  if (!name || !creatorId) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  if (data.groups.some(g => g.name === name)) {
    return res.status(409).json({ ok: false, msg: 'Group name exists' });
  }

  const creator = data.users.find(u => u.id === creatorId);
  if (!creator) return res.status(404).json({ ok: false, msg: 'Creator not found' });
  
  const isGroupAdmin = creator.roles.includes('groupAdmin') || creator.roles.includes('group_admin');
  const isSuperAdmin = creator.roles.includes('super') || creator.roles.includes('super_admin');
  if (!isGroupAdmin && !isSuperAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create groups' });
  }

  const group = {
    id: `g_${data.groups.length + 1}`,
    name,
    ownerId: creatorId,
    creatorId,
    memberIds: [creatorId],
    adminIds: [creatorId]
  };
  
  // Add all super admins
  const superAdmins = data.users.filter(u => u.roles.includes('super') || u.roles.includes('super_admin'));
  superAdmins.forEach(sa => {
    if (!group.memberIds.includes(sa.id)) group.memberIds.push(sa.id);
    if (!group.adminIds.includes(sa.id)) group.adminIds.push(sa.id);
  });
  
  data.groups.push(group);
  saveDataToDisk();
  res.status(201).json(group);
});

// DELETE /api/groups/:groupId
router.delete('/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { adminId } = req.body || {};
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner or super admin can delete group' });
  }
  
  // Remove all channels in this group
  data.channels = data.channels.filter(c => c.groupId !== groupId);
  
  // Remove group
  const groupIndex = data.groups.findIndex(g => g.id === groupId);
  data.groups.splice(groupIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Group and all its channels removed successfully' });
});

// POST /api/groups/:groupId/members
router.post('/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const { userId, adminId } = req.body || {};
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can add members' });
  }
  
  if (group.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already a member' });
  }
  
  group.memberIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

// DELETE /api/groups/:groupId/members/:userId
router.delete('/:groupId/members/:userId', (req, res) => {
  const { groupId, userId } = req.params;
  const { adminId } = req.body || {};
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isAdminSuper = admin.roles.includes('super') || admin.roles.includes('super_admin');
  
  if (!isAdminSuper && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admin or super admin can remove users' });
  }
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }

  const targetUser = data.users.find(u => u.id === userId);
  const isTargetSuper = targetUser && (targetUser.roles.includes('super') || targetUser.roles.includes('super_admin'));
  if (isTargetSuper && !isAdminSuper) {
    return res.status(403).json({ ok: false, msg: 'Group admins cannot remove super admins from groups' });
  }
  
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  
  const groupChannels = data.channels.filter(c => c.groupId === groupId);
  groupChannels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
    channel.memberIds = (channel.memberIds || []).filter(id => id !== userId);
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from group successfully' });
});

// POST /api/groups/:groupId/promote
router.post('/:groupId/promote', (req, res) => {
  const { groupId } = req.params;
  const { userId, promoterId } = req.body || {};
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const promoter = data.users.find(u => u.id === promoterId);
  if (!promoter) return res.status(404).json({ ok: false, msg: 'Promoter not found' });
  
  const isSuperAdmin = promoter.roles.includes('super');
  const isGroupAdmin = group.adminIds.includes(promoterId);
  
  if (!isSuperAdmin && !isGroupAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only super admins or group admins can promote users' });
  }
  
  const user = data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }
  
  if (group.adminIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is already a group admin' });
  }
  
  if (!user.roles.includes('groupAdmin')) {
    user.roles.push('groupAdmin');
  }
  
  group.adminIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User promoted to group admin' });
});

// POST /api/groups/:groupId/interest
router.post('/:groupId/interest', (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body || {};
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  if (group.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already a member of this group' });
  }
  
  if (data.groupInterests.some(i => i.groupId === groupId && i.userId === userId)) {
    return res.status(409).json({ ok: false, msg: 'Interest already registered' });
  }
  
  data.groupInterests.push({
    id: `i_${data.groupInterests.length + 1}`,
    groupId,
    userId,
    timestamp: new Date().toISOString()
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'Interest registered. Group admin will review your request.' });
});

// GET /api/groups/:groupId/interests
router.get('/:groupId/interests', (req, res) => {
  const { groupId } = req.params;
  const interests = data.groupInterests.filter(i => i.groupId === groupId);
  res.json(interests);
});

// POST /api/groups/:groupId/interests/:interestId/approve
router.post('/:groupId/interests/:interestId/approve', (req, res) => {
  const { groupId, interestId } = req.params;
  const { adminId } = req.body || {};

  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });

  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can approve requests' });
  }

  const interestIndex = data.groupInterests.findIndex(i => i.id === interestId && i.groupId === groupId);
  if (interestIndex === -1) {
    return res.status(404).json({ ok: false, msg: 'Interest not found' });
  }

  const interest = data.groupInterests[interestIndex];
  if (group.memberIds.includes(interest.userId)) {
    data.groupInterests.splice(interestIndex, 1);
    return res.json({ ok: true, msg: 'User already a member; request removed' });
  }

  group.memberIds.push(interest.userId);
  const addedUser = data.users.find(u => u.id === interest.userId);
  if (addedUser && (addedUser.roles.includes('group_admin') || addedUser.roles.includes('groupAdmin'))) {
    if (!group.adminIds.includes(interest.userId)) group.adminIds.push(interest.userId);
  }
  data.groupInterests.splice(interestIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

// DELETE /api/groups/:groupId/interests/:interestId
router.delete('/:groupId/interests/:interestId', (req, res) => {
  const { groupId, interestId } = req.params;
  const { adminId } = req.body || {};

  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });

  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can reject requests' });
  }

  const interestIndex = data.groupInterests.findIndex(i => i.id === interestId && i.groupId === groupId);
  if (interestIndex === -1) {
    return res.status(404).json({ ok: false, msg: 'Interest not found' });
  }

  data.groupInterests.splice(interestIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Request rejected' });
});

// GET /api/groups/:groupId/members
router.get('/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const safeMembers = data.users
    .filter(u => group.memberIds.includes(u.id))
    .map(({ password, ...safe }) => safe);
  res.json(safeMembers);
});

// GET /api/groups/:groupId/channels
router.get('/:groupId/channels', (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.query;
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const requester = data.users.find(u => u.id === userId);
  const isSuperAdmin = requester && (requester.roles.includes('super') || requester.roles.includes('super_admin'));
  const isGroupAdmin = group.adminIds.includes(userId);
  
  let groupChannels = data.channels.filter(c => c.groupId === groupId);
  if (!isSuperAdmin && !isGroupAdmin) {
    groupChannels = groupChannels.filter(c => Array.isArray(c.memberIds) && c.memberIds.includes(userId));
  }
  res.json(groupChannels);
});

// POST /api/groups/:groupId/channels
router.post('/:groupId/channels', (req, res) => {
  const { groupId } = req.params;
  const { name, creatorId } = req.body || {};
  
  if (!name || !creatorId) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const creator = data.users.find(u => u.id === creatorId);
  const isSuperAdmin = creator && (creator.roles.includes('super') || creator.roles.includes('super_admin'));
  const isGroupAdmin = group.adminIds.includes(creatorId);
  
  if (!isSuperAdmin && !isGroupAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create channels' });
  }
  
  const existingChannels = data.channels.filter(c => c.groupId === groupId);
  if (existingChannels.some(c => c.name === name)) {
    return res.status(409).json({ ok: false, msg: 'Channel name exists in this group' });
  }
  
  const channel = {
    id: `c_${data.channels.length + 1}`,
    name,
    groupId,
    creatorId,
    bannedUserIds: [],
    memberIds: [creatorId]
  };
  
  if (!channel.memberIds.includes(group.ownerId)) channel.memberIds.push(group.ownerId);
  data.users.filter(u => u.roles.includes('super') || u.roles.includes('super_admin')).forEach(sa => {
    if (!channel.memberIds.includes(sa.id)) channel.memberIds.push(sa.id);
  });
  
  data.channels.push(channel);
  saveDataToDisk();
  res.status(201).json(channel);
});

// DELETE /api/groups/:groupId/channels/:channelId
router.delete('/:groupId/channels/:channelId', (req, res) => {
  const { groupId, channelId } = req.params;
  const { adminId } = req.body || {};
  
  const channel = data.channels.find(c => c.id === channelId && c.groupId === groupId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = data.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = data.users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admin or super admin can delete channel' });
  }
  
  const channelIndex = data.channels.findIndex(c => c.id === channelId && c.groupId === groupId);
  data.channels.splice(channelIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Channel removed successfully' });
});

module.exports = router;

