import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
