const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js');
const friendsQueries = require('../database/dbQueries/friendsQueries.js');

function requireSessionUser(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

// GET /api/friends/search?q=... (&global=1 to allow searching all users)
router.get('/search', requireSessionUser, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ friends: [] });
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

    // By default, only search within the current user's friends. If the client passes global=1,
    // fall back to searching all users (exclude self). This preserves previous behavior when
    // intentionally requested, but prevents non-friends from appearing in the friend picker by default.
    const allowGlobal = String(req.query.global || '0') === '1';
    let rows = await friendsQueries.searchFriendsForUser(pool, uid, q, 10);
    if ((!rows || rows.length === 0) && allowGlobal) {
      rows = await friendsQueries.searchUsers(pool, q, 10, uid);
    }
    return res.json({ friends: rows || [] });
  } catch (err) {
    console.error('GET /api/friends/search error', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    return res.status(500).json({ error: 'server_error', message: 'Unable to search friends' });
  }
});

module.exports = router;
