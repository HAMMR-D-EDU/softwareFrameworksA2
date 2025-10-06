import express from 'express';
import { getCollection } from '../config/db.js';

const router = express.Router();

// POST /api/channels/:channelId/members
router.post('/:channelId/members', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId, adminId } = req.body || {};
    
    const channelsCollection = getCollection('channels');
    const groupsCollection = getCollection('groups');
    const usersCollection = getCollection('users');
    
    // Find channel
    const channel = await channelsCollection.findOne({ id: channelId });
    if (!channel) {
      return res.status(404).json({ ok: false, msg: 'Channel not found' });
    }
    
    // Find group
    const group = await groupsCollection.findOne({ id: channel.groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin) {
      return res.status(403).json({ ok: false, msg: 'Admin not found' });
    }
    
    const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
    if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
      return res.status(403).json({ ok: false, msg: 'Only group admins can add channel members' });
    }
    
    // Check if user is a group member
    if (!group.memberIds.includes(userId)) {
      return res.status(400).json({ ok: false, msg: 'User must be a group member to be added to channel' });
    }
    
    // Check if user is already a channel member
    if (channel.memberIds && channel.memberIds.includes(userId)) {
      return res.status(409).json({ ok: false, msg: 'User already a channel member' });
    }
    
    // Add user to channel
    await channelsCollection.updateOne(
      { id: channelId },
      { $addToSet: { memberIds: userId } }
    );
    
    res.json({ ok: true, msg: 'User added to channel' });
  } catch (error) {
    console.error('Add channel member error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// DELETE /api/channels/:channelId/members/:userId
router.delete('/:channelId/members/:userId', async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const { adminId } = req.body || {};
    
    const channelsCollection = getCollection('channels');
    const groupsCollection = getCollection('groups');
    const usersCollection = getCollection('users');
    
    // Find channel
    const channel = await channelsCollection.findOne({ id: channelId });
    if (!channel) {
      return res.status(404).json({ ok: false, msg: 'Channel not found' });
    }
    
    // Find group
    const group = await groupsCollection.findOne({ id: channel.groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin) {
      return res.status(403).json({ ok: false, msg: 'Admin not found' });
    }
    
    const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
    if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
      return res.status(403).json({ ok: false, msg: 'Only group admins can remove channel members' });
    }
    
    // Check if user is a channel member
    if (!channel.memberIds || !channel.memberIds.includes(userId)) {
      return res.status(400).json({ ok: false, msg: 'User is not a channel member' });
    }
    
    // Remove user from channel
    await channelsCollection.updateOne(
      { id: channelId },
      { $pull: { memberIds: userId } }
    );
    
    res.json({ ok: true, msg: 'User removed from channel' });
  } catch (error) {
    console.error('Remove channel member error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// POST /api/channels/:channelId/ban
router.post('/:channelId/ban', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId, adminId } = req.body || {};
    
    const channelsCollection = getCollection('channels');
    const groupsCollection = getCollection('groups');
    const usersCollection = getCollection('users');
    
    // Find channel
    const channel = await channelsCollection.findOne({ id: channelId });
    if (!channel) {
      return res.status(404).json({ ok: false, msg: 'Channel not found' });
    }
    
    // Find group
    const group = await groupsCollection.findOne({ id: channel.groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Check if admin is group owner or group admin
    const isOwner = group.ownerId === adminId;
    const isGroupAdmin = group.adminIds && group.adminIds.includes(adminId);
    
    if (!isOwner && !isGroupAdmin) {
      return res.status(403).json({ ok: false, msg: 'Only group owner or group admins can ban users' });
    }
    
    // Check if target is super admin
    const target = await usersCollection.findOne({ id: userId });
    if (target && (target.roles.includes('super') || target.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Super admins cannot be banned from channels' });
    }
    
    // Check if user is already banned
    if (channel.bannedUserIds.includes(userId)) {
      return res.status(409).json({ ok: false, msg: 'User is already banned' });
    }
    
    // Ban user
    await channelsCollection.updateOne(
      { id: channelId },
      { $addToSet: { bannedUserIds: userId } }
    );
    
    res.json({ ok: true, msg: 'User banned from channel' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// DELETE /api/channels/:channelId/ban/:userId
router.delete('/:channelId/ban/:userId', async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const { adminId } = req.body || {};
    
    const channelsCollection = getCollection('channels');
    const groupsCollection = getCollection('groups');
    
    // Find channel
    const channel = await channelsCollection.findOne({ id: channelId });
    if (!channel) {
      return res.status(404).json({ ok: false, msg: 'Channel not found' });
    }
    
    // Find group and verify permissions
    const group = await groupsCollection.findOne({ id: channel.groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Check if admin is group owner or group admin
    const isOwner = group.ownerId === adminId;
    const isGroupAdmin = group.adminIds && group.adminIds.includes(adminId);
    
    if (!isOwner && !isGroupAdmin) {
      return res.status(403).json({ ok: false, msg: 'Only group owner or group admins can unban users' });
    }
    
    // Check if user is banned
    if (!channel.bannedUserIds.includes(userId)) {
      return res.status(400).json({ ok: false, msg: 'User is not banned from this channel' });
    }
    
    // Unban user
    await channelsCollection.updateOne(
      { id: channelId },
      { $pull: { bannedUserIds: userId } }
    );
    
    res.json({ ok: true, msg: 'User unbanned from channel' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

export default router;
