const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Get all scans for the current user (newest first)
router.get('/', requireAuth, (req, res) => {
  const scans = db.prepare(`
    SELECT id, score, rating, rating_description, garment_type, materials, confidence, created_at
    FROM scans
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json(scans.map(s => ({
    ...s,
    materials: JSON.parse(s.materials),
  })));
});

// Get a single scan
router.get('/:id', requireAuth, (req, res) => {
  const scan = db.prepare(`
    SELECT * FROM scans WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  res.json({ ...scan, materials: JSON.parse(scan.materials) });
});

module.exports = router;
