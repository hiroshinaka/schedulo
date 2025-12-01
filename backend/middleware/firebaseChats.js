const initFirebaseAdmin = require('../database/firebaseAdmin');

function getFirestore() {
  const admin = initFirebaseAdmin();
  return admin.firestore();
}

async function createChat(participants = [], type = 'direct', meta = {}) {
  if (!Array.isArray(participants) || participants.length === 0) throw new Error('participants required');
  const db = getFirestore();
  const chatRef = db.collection('chats').doc();
  const now = new Date();
  await chatRef.set({
    participants,
    type,
    meta: meta || {},
    createdAt: now,
    lastUpdated: now,
    // unread counts per user id, start at 0 for everyone
    unread: participants.reduce((acc, p) => {
      acc[String(p)] = 0;
      return acc;
    }, {}),
  });
  return chatRef.id;
}

async function getUserChats(uid) {
  const db = getFirestore();
  const q = db.collection('chats').where('participants', 'array-contains', uid).orderBy('lastUpdated', 'desc');
  const snap = await q.get();
  const results = [];
  snap.forEach((doc) => {
    results.push({ id: doc.id, ...doc.data() });
  });
  return results;
}

async function getChat(chatId) {
  if (!chatId) throw new Error('chatId required');
  const db = getFirestore();
  const chatRef = db.collection('chats').doc(chatId);
  const snap = await chatRef.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function addMessage(chatId, message) {
  if (!chatId) throw new Error('chatId required');
  const db = getFirestore();
  const chatRef = db.collection('chats').doc(chatId);
  const messagesRef = chatRef.collection('messages');
  const now = new Date();
  const doc = await messagesRef.add({
    ...message,
    createdAt: now,
  });
  // update chat lastUpdated, lastMessage summary and unread counters
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(chatRef);
    if (!snap.exists) return;
    const chat = snap.data();
    const participants = Array.isArray(chat.participants) ? chat.participants.map(String) : [];
    const senderId = String(message.senderId);
    const unread = chat.unread || {};
    participants.forEach((p) => {
      const pid = String(p);
      if (pid === senderId) return;
      unread[pid] = (unread[pid] || 0) + 1;
    });

    tx.update(chatRef, {
      lastUpdated: now,
      lastMessage: {
        text: message.text || null,
        senderId: message.senderId || null,
        createdAt: now,
      },
      unread,
    });
  });
  return doc.id;
}

async function resetUnread(chatId, userId) {
  if (!chatId || !userId) throw new Error('chatId and userId required');
  const db = getFirestore();
  const chatRef = db.collection('chats').doc(chatId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(chatRef);
    if (!snap.exists) return;
    const chat = snap.data();
    const unread = chat.unread || {};
    const uid = String(userId);
    if (unread[uid] && unread[uid] !== 0) {
      unread[uid] = 0;
      tx.update(chatRef, { unread });
    }
  });
}

async function getMessages(chatId, limit = 50) {
  const db = getFirestore();
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  const q = messagesRef.orderBy('createdAt', 'desc').limit(limit);
  const snap = await q.get();
  const rows = [];
  snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
  return rows.reverse();
}

module.exports = { createChat, getUserChats, getChat, addMessage, getMessages, resetUnread };
