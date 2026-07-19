const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const avatar = profile.photos[0]?.value ?? null;
    const googleId = profile.id;

    const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
    if (existing) return done(null, existing);

    const result = db.prepare(
      'INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)'
    ).run(googleId, email, name, avatar);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Start Google OAuth flow
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/?auth=failed' }),
  (req, res) => {
    const token = issueToken(req.user);
    // Redirect to frontend with token in URL hash (never in query string)
    res.redirect(`/#token=${token}`);
  }
);

// Get current user from token
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
