const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js');
const friendsQueries = require('../database/dbQueries/friendsQueries.js');

function requireSessionUser(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

// GET /api/friends/search?q=...
router.get('/search', requireSessionUser, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ friends: [] });
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    let rows = await friendsQueries.searchFriendsForUser(pool, uid, q, 10);
    // if user has no friends or nothing matches, fallback to searching all users (exclude self)
    if (!rows || rows.length === 0) {
      rows = await friendsQueries.searchUsers(pool, q, 10, uid);
    }
    return res.json({ friends: rows });
  } catch (err) {
    console.error('GET /api/friends/search error', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      sql: err.sql
    });
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

module.exports = router;
