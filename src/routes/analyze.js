const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { analyzeImage } = require('../pipeline');
const db = require('../db');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image uploaded or unsupported format.' });
  }

  try {
    const result = await analyzeImage(req.file.path);

    if (result.success && req.user.id !== 0) {
      // Persist scan to DB (skip for preview users)
      db.prepare(`
        INSERT INTO scans (user_id, score, rating, rating_description, garment_type, materials, raw_text, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        result.score,
        result.rating,
        result.ratingDescription,
        result.garmentType ?? null,
        JSON.stringify(result.materials),
        result.rawText ?? null,
        result.confidence,
      );
    }

    res.json(result);
  } catch (err) {
    // analyzeImage() catches its own pipeline errors; this is a last resort
    // for anything else (e.g. a DB write failure) so the client always gets
    // a friendly JSON response instead of a bare 500.
    console.error('analyze route error:', err);
    res.status(500).json({ success: false, error: 'Something went wrong analyzing this image. Please try again.' });
  } finally {
    // Always clean up uploaded file
    fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
