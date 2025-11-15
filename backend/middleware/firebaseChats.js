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

async function addMessage(chatId, message) {
  if (!chatId) throw new Error('chatId required');
  const db = getFirestore();
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  const now = new Date();
  const doc = await messagesRef.add({
    ...message,
    createdAt: now,
  });
  // update chat lastUpdated and lastMessage summary
  const chatRef = db.collection('chats').doc(chatId);
  await chatRef.update({
    lastUpdated: now,
    lastMessage: {
      text: message.text || null,
      senderId: message.senderId || null,
      createdAt: now,
    },
  });
  return doc.id;
}

async function getMessages(chatId, limit = 50) {
  const db = getFirestore();
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  const q = messagesRef.orderBy('createdAt', 'desc').limit(limit);
  const snap = await q.get();
  const rows = [];
  snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
  // return in chronological order
  return rows.reverse();
}

module.exports = { createChat, getUserChats, addMessage, getMessages };
