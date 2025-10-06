import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// POST /api/upload - Upload image for chat
router.post('/upload', (req, res) => {
  // Set upload directory
  const uploadFolder = path.join(__dirname, '../userimages');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
  }
  
  // Create formidable form (v3+ API)
  const form = formidable({
    uploadDir: uploadFolder,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024 // 5MB limit
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing upload:', err);
      return res.status(400).json({
        status: 'Fail',
        message: 'There was an error parsing the files',
        error: err.message
      });
    }

    // Handle single file upload (image field)
    // In formidable v3+, files.image is an array
    const fileArray = files.image;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({
        status: 'Fail',
        message: 'No image file provided'
      });
    }
    
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    const oldpath = file.filepath;
    const newpath = path.join(uploadFolder, file.originalFilename || file.newFilename);

    fs.rename(oldpath, newpath, (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({
          status: 'Fail',
          message: 'Failed to save file',
          error: err.message
        });
      }

      // Send success response (following ZZIMAGEUPLAOD pattern)
      const filename = file.originalFilename || file.newFilename;
      res.json({
        result: 'OK',
        data: {
          filename: filename,
          size: file.size,
          path: `/images/${filename}`
        },
        numberOfImages: 1,
        message: 'Upload successful'
      });
    });
  });
});

export default router;

// POST /api/upload/avatar/:userId - Upload and set user avatar
router.post('/upload/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user exists
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }

    const uploadFolder = path.join(__dirname, '../userimages');
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadFolder,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing avatar upload:', err);
        return res.status(400).json({ ok: false, msg: 'Invalid upload', error: err.message });
      }

      const fileArray = files.image;
      if (!fileArray || fileArray.length === 0) {
        return res.status(400).json({ ok: false, msg: 'No image file provided' });
      }

      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      const oldpath = file.filepath;
      const targetFilename = file.originalFilename || file.newFilename;
      const newpath = path.join(uploadFolder, targetFilename);

      fs.rename(oldpath, newpath, async (moveErr) => {
        if (moveErr) {
          console.error('Error saving avatar:', moveErr);
          return res.status(500).json({ ok: false, msg: 'Failed to save avatar' });
        }

        const avatarPath = `/images/${targetFilename}`;

        // Update user document with avatarPath
        await usersCollection.updateOne(
          { id: userId },
          { $set: { avatarPath } }
        );

        return res.json({ ok: true, avatarPath, msg: 'Avatar updated' });
      });
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ ok: false, msg: 'Internal server error' });
  }
});
