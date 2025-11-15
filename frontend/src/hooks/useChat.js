import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreClient } from '../firebase/client';
import useAuth from './useAuth';

// Minimal hook to subscribe to messages for a chat and send messages
export default function useChat(chatId, opts = {}) {
  const { limit: msgLimit = 200 } = opts;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const firestore = getFirestoreClient();
    if (!firestore || !chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(msgLimit));
    setLoading(true);
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setMessages(rows);
      setLoading(false);
    }, (err) => {
      console.error('messages snapshot error', err);
      setLoading(false);
    });

    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [chatId, msgLimit]);

  const sendMessage = async (text, meta = {}) => {
    if (!text || !chatId) return null;
    const firestore = getFirestoreClient();
    if (!firestore) throw new Error('Firestore not initialized');
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const docRef = await addDoc(messagesRef, {
      text,
      senderId: user ? String(user.id || user.uid || user.email) : null,
      meta,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  };

  return { messages, loading, sendMessage };
}
