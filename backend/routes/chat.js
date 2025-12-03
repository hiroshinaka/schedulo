const express = require('express');
const router = express.Router();
const firebaseChats = require('../middleware/firebaseChats');
const pool = require('../database/sqlConnections.js');
const friendsQueries = require('../database/dbQueries/friendsQueries.js');
const userQueries = require('../database/dbQueries/userQueries.js');

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
    // enforce that all participants (other than requester) are friends with requester
    for (const p of parts) {
      if (String(p) === String(uid)) continue;
      const ok = await friendsQueries.checkFriendship(pool, uid, p);
      if (!ok) return res.status(403).json({ error: 'can only create chats with friends' });
    }
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

    // Enrich each chat with otherUser info (first/last name, email) for the requester
    const enriched = await Promise.all(chats.map(async (chat) => {
      const parts = Array.isArray(chat.participants) ? chat.participants.map(String) : [];
      const otherId = parts.find((p) => p !== uid);
      const unreadCount = chat.unread && chat.unread[uid] ? chat.unread[uid] : 0;
      const baseChat = { ...chat, unreadCount };
      if (!otherId) return baseChat;
      // only try DB lookup when otherId looks like a numeric user_id
      const numericId = Number(otherId);
      if (!Number.isInteger(numericId)) return baseChat;
      try {
        const user = await userQueries.getUserById(pool, numericId);
        if (!user) return baseChat;
        return { ...baseChat, otherUser: user };
      } catch (e) {
        console.error('failed to enrich chat with otherUser', e);
        return baseChat;
      }
    }));

    res.json({ chats: enriched });
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
    // validate chat and friendship with participants
    const chat = await firebaseChats.getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'chat not found' });
    // ensure sender is a participant
    const parts = Array.isArray(chat.participants) ? chat.participants.map(String) : [];
    if (!parts.includes(String(uid))) return res.status(403).json({ error: 'not a participant' });
    // ensure all other participants are friends with sender
    for (const p of parts) {
      if (String(p) === String(uid)) continue;
      const ok = await friendsQueries.checkFriendship(pool, uid, p);
      if (!ok) return res.status(403).json({ error: 'chat participants must be friends' });
    }
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
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    const chat = await firebaseChats.getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'chat not found' });
    const parts = Array.isArray(chat.participants) ? chat.participants.map(String) : [];
    if (!parts.includes(String(uid))) return res.status(403).json({ error: 'not a participant' });
    // ensure all other participants are friends with requester
    for (const p of parts) {
      if (String(p) === String(uid)) continue;
      const ok = await friendsQueries.checkFriendship(pool, uid, p);
      if (!ok) return res.status(403).json({ error: 'chat participants must be friends' });
    }
    const messages = await firebaseChats.getMessages(chatId, limit);
    // reset unread counter for this user when they view the messages
    try {
      await firebaseChats.resetUnread(chatId, uid);
    } catch (e) {
      console.error('failed to reset unread count', e);
    }
    res.json({ messages });
  } catch (err) {
    console.error('GET /api/chats/:chatId/messages error', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Get total unread messages count for current user
router.get('/unread-count', requireSessionUser, async (req, res) => {
  try {
    const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
    const chats = await firebaseChats.getUserChats(uid);
    let totalUnread = 0;
    
    for (const chat of chats) {
      const unreadCount = chat.unread && chat.unread[uid] ? chat.unread[uid] : 0;
      totalUnread += unreadCount;
    }
    
    res.json({ ok: true, count: totalUnread });
  } catch (err) {
    console.error('GET /api/chats/unread-count error', err);
    res.status(500).json({ ok: false, error: err.message || 'server error' });
  }
});

module.exports = router;
