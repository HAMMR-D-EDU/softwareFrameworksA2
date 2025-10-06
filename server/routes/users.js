import express from 'express';
import { getCollection } from '../config/db.js';

const router = express.Router();

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const usersCollection = getCollection('users');
    const users = await usersCollection.find({}).toArray();
    
    // Remove passwords and MongoDB _id from response
    const safeUsers = users.map(({ password, _id, ...user }) => user);
    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:userId - Remove user (Super Admin only)
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId } = req.body || {};
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    const channelsCollection = getCollection('channels');
    
    // Verify admin permissions
    const admin = await usersCollection.findOne({ id: adminId });
    if (!admin || !admin.roles.includes('super')) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can remove users' });
    }
    
    // Check if user exists
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    
    // Remove user from all groups
    await groupsCollection.updateMany(
      { $or: [{ memberIds: userId }, { adminIds: userId }] },
      { 
        $pull: { 
          memberIds: userId,
          adminIds: userId
        }
      }
    );
    
    // Remove user from all channels (banned and member lists)
    await channelsCollection.updateMany(
      { $or: [{ bannedUserIds: userId }, { memberIds: userId }] },
      {
        $pull: {
          bannedUserIds: userId,
          memberIds: userId
        }
      }
    );
    
    // Delete the user
    await usersCollection.deleteOne({ id: userId });
    
    res.json({ ok: true, msg: 'User removed successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// POST /api/users/:userId/promote-super
router.post('/:userId/promote-super', async (req, res) => {
  try {
    const { userId } = req.params;
    const { promoterId } = req.body || {};
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    
    // Verify promoter permissions
    const promoter = await usersCollection.findOne({ id: promoterId });
    if (!promoter || !(promoter.roles.includes('super') || promoter.roles.includes('super_admin'))) {
      return res.status(403).json({ ok: false, msg: 'Only super admins can promote to super admin' });
    }
    
    // Find user to promote
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    
    // Check if already super admin
    if (user.roles.includes('super') || user.roles.includes('super_admin')) {
      return res.json({ ok: true, msg: 'User is already a super admin' });
    }
    
    // Add super admin roles
    await usersCollection.updateOne(
      { id: userId },
      { 
        $addToSet: { 
          roles: { $each: ['super', 'super_admin'] }
        }
      }
    );
    
    // Add user to all groups as member and admin
    await groupsCollection.updateMany(
      {},
      {
        $addToSet: {
          memberIds: userId,
          adminIds: userId
        }
      }
    );
    
    res.json({ ok: true, msg: 'User promoted to super admin' });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// DELETE /api/users/:userId/self
router.delete('/:userId/self', async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body || {};
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    const channelsCollection = getCollection('channels');
    
    // Find and verify user
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    
    // Verify password
    if (user.password !== password) {
      return res.status(401).json({ ok: false, msg: 'Incorrect password' });
    }
    
    // Remove user from groups and channels
    await groupsCollection.updateMany(
      { $or: [{ memberIds: userId }, { adminIds: userId }] },
      {
        $pull: {
          memberIds: userId,
          adminIds: userId
        }
      }
    );
    
    await channelsCollection.updateMany(
      { $or: [{ bannedUserIds: userId }, { memberIds: userId }] },
      {
        $pull: {
          bannedUserIds: userId,
          memberIds: userId
        }
      }
    );
    
    // Delete user
    await usersCollection.deleteOne({ id: userId });
    
    res.json({ ok: true, msg: 'User account deleted successfully' });
  } catch (error) {
    console.error('Delete self error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

// GET /api/users/:userId/groups
router.get('/:userId/groups', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const usersCollection = getCollection('users');
    const groupsCollection = getCollection('groups');
    
    // Check if user is super admin
    const user = await usersCollection.findOne({ id: userId });
    if (user && (user.roles.includes('super') || user.roles.includes('super_admin'))) {
      // Super admins see all groups
      const allGroups = await groupsCollection.find({}).toArray();
      return res.json(allGroups.map(({ _id, ...group }) => group));
    }
    
    // Regular users see only their groups
    const userGroups = await groupsCollection.find({ memberIds: userId }).toArray();
    res.json(userGroups.map(({ _id, ...group }) => group));
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:userId/groups/:groupId
router.delete('/:userId/groups/:groupId', async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    
    const groupsCollection = getCollection('groups');
    const channelsCollection = getCollection('channels');
    
    // Find group
    const group = await groupsCollection.findOne({ id: groupId });
    if (!group) {
      return res.status(404).json({ ok: false, msg: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.memberIds.includes(userId)) {
      return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
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
    
    // Remove user from all channels in this group
    await channelsCollection.updateMany(
      { groupId },
      {
        $pull: {
          bannedUserIds: userId,
          memberIds: userId
        }
      }
    );
    
    res.json({ ok: true, msg: 'User left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});

export default router;
