import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import useChat from '../hooks/useChat';

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [text, setText] = useState('');
  const [newParticipants, setNewParticipants] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const { messages, loading, sendMessage } = useChat(selectedChat ? selectedChat.id : null);

  useEffect(() => {
    // fetch chats from backend
    (async () => {
      try {
        const res = await fetch('/api/chats', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.chats) {
          setChats(data.chats);
          if (!selectedChat && data.chats.length) setSelectedChat(data.chats[0]);
        }
      } catch (err) {
        console.error('Failed to load chats', err);
      }
    })();
  }, []);

  const createChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // parse participants as comma/space separated ids or emails
    const parts = newParticipants
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: parts, meta: { title: newTitle } }),
      });
      const data = await res.json();
      if (data && data.chatId) {
        const created = { id: data.chatId, participants: parts, meta: { title: newTitle } };
        setChats((c) => [created, ...c]);
        setSelectedChat(created);
        setNewParticipants('');
        setNewTitle('');
      } else {
        console.error('Create chat failed', data);
      }
    } catch (err) {
      console.error('Create chat error', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text || !selectedChat) return;
    try {
      await sendMessage(text);
      setText('');
    } catch (err) {
      console.error('send message failed', err);
      // fallback: try server endpoint to add message
      try {
        await fetch(`/api/chats/${selectedChat.id}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        setText('');
      } catch (e) {
        console.error('fallback send failed', e);
      }
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Chat</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 border rounded p-2 h-96 overflow-auto">
          <h3 className="font-medium mb-2">Chats</h3>

          <form className="mb-3" onSubmit={createChat}>
            <input
              value={newParticipants}
              onChange={(e) => setNewParticipants(e.target.value)}
              placeholder="participant ids or emails (comma separated)"
              className="w-full mb-2 border rounded px-2 py-1 text-sm"
            />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="optional title"
              className="w-full mb-2 border rounded px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm" type="submit">Create Chat</button>
              <button type="button" className="flex-1 bg-gray-200 px-3 py-1 rounded text-sm" onClick={() => { setNewParticipants(''); setNewTitle(''); }}>Clear</button>
            </div>
          </form>

          {chats.length === 0 && <div className="text-sm text-gray-500">No chats yet</div>}
          {chats.map((c) => (
            <div key={c.id} className={`p-2 cursor-pointer rounded ${selectedChat && selectedChat.id === c.id ? 'bg-gray-100' : ''}`} onClick={() => setSelectedChat(c)}>
              <div className="text-sm font-medium">{c.meta && c.meta.title ? c.meta.title : `Chat ${c.id}`}</div>
              <div className="text-xs text-gray-500">{c.lastMessage && c.lastMessage.text ? c.lastMessage.text : ''}</div>
            </div>
          ))}
        </div>

        <div className="col-span-2 border rounded p-2 h-96 flex flex-col">
          <div className="flex-1 overflow-auto mb-2">
            {!selectedChat && <div className="text-sm text-gray-500">Select a chat</div>}
            {selectedChat && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Participants: {selectedChat.participants ? selectedChat.participants.join(', ') : ''}</div>
                <div className="space-y-2">
                  {loading && <div className="text-sm text-gray-500">Loading messages...</div>}
                  {!loading && messages.length === 0 && <div className="text-sm text-gray-500">No messages</div>}
                  {messages.map((m) => (
                    <div key={m.id} className={`p-2 rounded ${String(m.senderId) === String(user?.id) ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}>
                      <div className="text-xs text-gray-600">{m.senderId}</div>
                      <div className="text-sm">{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form className="mt-2 flex" onSubmit={handleSend}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message..." className="flex-1 border rounded px-3 py-2 mr-2" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
