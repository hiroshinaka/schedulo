const express = require('express');
const router = express.Router();
const firebaseChats = require('../middleware/firebaseChats');

function requireSessionUser(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

// Create a new chat
router.post('/', requireSessionUser, async (req, res) => {
  try {
    const { participants, type, meta } = req.body || {};
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    // ensure the current user is included
    const parts = Array.isArray(participants) ? [...new Set(participants.map(String))] : [];
    if (!parts.includes(uid)) parts.push(uid);
    const chatId = await firebaseChats.createChat(parts, type || 'direct', meta || {});
    res.json({ chatId });
  } catch (err) {
    console.error('POST /api/chats error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// List chats for current user
router.get('/', requireSessionUser, async (req, res) => {
  try {
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    const chats = await firebaseChats.getUserChats(uid);
    res.json({ chats });
  } catch (err) {
    console.error('GET /api/chats error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Add a message to a chat
router.post('/:chatId/messages', requireSessionUser, async (req, res) => {
  try {
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    const { chatId } = req.params;
    const { text, meta } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const messageId = await firebaseChats.addMessage(chatId, { senderId: uid, text, meta: meta || {} });
    res.json({ messageId });
  } catch (err) {
    console.error('POST /api/chats/:chatId/messages error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Get messages for a chat
router.get('/:chatId/messages', requireSessionUser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await firebaseChats.getMessages(chatId, limit);
    res.json({ messages });
  } catch (err) {
    console.error('GET /api/chats/:chatId/messages error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

module.exports = router;
