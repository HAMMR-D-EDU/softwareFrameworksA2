import express from 'express';
import { getCollection, getNextId } from '../config/db.js';

const router = express.Router();

// GET /admin/users
router.get('/users', async (req, res) => {
  try {
    const adminId = req.query.adminId;
    const usersCollection = getCollection('users');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can view users' });
    }
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    const safe = users.map(({ password, _id, ...u }) => u);
    res.json(safe);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/users
router.post('/users', async (req, res) => {
  try {
    const { adminId, username, email, password = '123' } = req.body || {};
    const usersCollection = getCollection('users');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can create users' });
    }
    
    if (!username || !email) {
      return res.status(400).json({ ok: false, msg: 'Username and email are required' });
    }
    
    // Check if username exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ ok: false, msg: 'Username exists' });
    }
    
    // Check if email exists
    const existingEmail = await usersCollection.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ ok: false, msg: 'Email already exists' });
    }
    
    // Generate new user ID
    const id = await getNextId('users', 'u_');
    
    // Create new user
    const newUser = {
      id,
      username,
      password,
      email,
      roles: ['user'],
      groups: []
    };
    
    await usersCollection.insertOne(newUser);
    
    const { password: _pw, _id, ...safe } = newUser;
    res.status(201).json({ ok: true, user: safe });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// PATCH /admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { add, remove, adminId } = req.body || {};
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can modify roles' });
    }
    
    // Find user
    const user = await usersCollection.findOne({ id });
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    
    if (add === 'group_admin') {
      // Add group_admin and groupAdmin roles
      await usersCollection.updateOne(
        { id },
        {
          $addToSet: {
            roles: { $each: ['group_admin', 'groupAdmin'] }
          }
        }
      );
      
      // Add user as admin to all groups they're a member of
      await groupsCollection.updateMany(
        { memberIds: id },
        { $addToSet: { adminIds: id } }
      );
      
      return res.json({ ok: true, msg: 'User promoted to group_admin' });
    }
    
    if (remove === 'group_admin') {
      // Remove group_admin roles
      await usersCollection.updateOne(
        { id },
        {
          $pull: {
            roles: { $in: ['group_admin', 'groupAdmin'] }
          }
        }
      );
      
      // Remove user from admin lists in all groups
      await groupsCollection.updateMany(
        { adminIds: id },
        { $pull: { adminIds: id } }
      );
      
      return res.json({ ok: true, msg: 'User demoted from group_admin' });
    }
    
    res.status(400).json({ ok: false, msg: 'Specify add or remove for role' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// POST /admin/groups/:groupId/members
router.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, adminId } = req.body || {};
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can add members' });
    }
    
    // Find group
    const group = await groupsCollection.findOne({ id: groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Check if already a member
    if (group.memberIds.includes(userId)) {
      return res.status(409).json({ ok: false, msg: 'Already a member' });
    }
    
    // Add user to group members
    await groupsCollection.updateOne(
      { id: groupId },
      { $addToSet: { memberIds: userId } }
    );
    
    // If user is a group admin, add to adminIds
    const addedUser = await usersCollection.findOne({ id: userId });
    if (addedUser && (addedUser.roles.includes('group_admin') || addedUser.roles.includes('groupAdmin'))) {
      await groupsCollection.updateOne(
        { id: groupId },
        { $addToSet: { adminIds: userId } }
      );
    }
    
    res.json({ ok: true, msg: 'User added to group' });
  } catch (error) {
    console.error('Admin add member error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// DELETE /admin/groups/:groupId/members/:userId
router.delete('/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const adminId = req.query.adminId;
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can remove members' });
    }
    
    // Find group
    const group = await groupsCollection.findOne({ id: groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Remove user from group
    await groupsCollection.updateOne(
      { id: groupId },
      {
        $pull: {
          memberIds: userId,
          adminIds: userId
        }
      }
    );
    
    res.json({ ok: true, msg: 'User removed from group' });
  } catch (error) {
    console.error('Admin remove member error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

export default router;
