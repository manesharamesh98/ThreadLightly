require('dotenv').config();
const express = require('express');
const passport = require('passport');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(passport.initialize());

// API routes
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/analyze', require('./routes/analyze'));
  app.use('/api/scans', require('./routes/scans'));
  console.log('✓ Routes loaded');
} catch (err) {
  console.error('✗ Failed to load routes:', err.message);
}

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback — all non-API routes serve index.html (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`ThreadLightly running on http://localhost:${PORT}`));
