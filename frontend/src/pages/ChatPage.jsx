import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';
import useAuth from '../hooks/useAuth';

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null); // one-on-one
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chats`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.chats) {
          setChats(data.chats);
          setSelectedChat((prev) => prev || (data.chats.length ? data.chats[0] : null));
        }
      } catch (err) {
        console.error('Failed to load chats', err);
      }
    })();
  }, []);

  // load messages when selectedChat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) {
        setMessages([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/chats/${selectedChat.id}/messages`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          console.error('failed to load messages', await res.text());
          setMessages([]);
        } else {
          const data = await res.json();
          setMessages(data && data.messages ? data.messages : []);
        }
      } catch (err) {
        console.error('load messages error', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedChat]);

  // search users (friends or all users) by first/last name
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const trimmed = searchQuery.trim();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/friends/search?q=${encodeURIComponent(trimmed)}`,
          { credentials: 'include' }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSearchResults(data && data.friends ? data.friends : []);
      } catch (err) {
        console.error('Failed to search friends', err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend((prev) => (prev && String(prev.id) === String(friend.id) ? null : friend));
  };

  const createChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCreateError('');
    if (!selectedFriend) {
      setCreateError('Please select a user to start a chat.');
      return;
    }
    const participantId = String(selectedFriend.id);

    // If a direct chat with this participant already exists, just select it
    const myId = user ? String(user.id || user.uid || user.email) : null;
    const existing = chats.find((c) => {
      if (!Array.isArray(c.participants) || !myId) return false;
      const parts = c.participants.map(String);
      const uniq = Array.from(new Set(parts));
      return uniq.length === 2 && uniq.includes(myId) && uniq.includes(participantId);
    });
    if (existing) {
      setSelectedChat(existing);
      setSelectedFriend(null);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [participantId] }),
      });
      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {}
        if (res.status === 403 && data && data.error === 'can only create chats with friends') {
          setCreateError('You can only start chats with users who are your friends.');
        } else {
          setCreateError(data.error || 'Failed to create chat.');
        }
        return;
      }

      const data = await res.json();
      if (data && data.chatId) {
        const created = {
          id: data.chatId,
          participants: [participantId],
          // store other user info for display
          otherUser: {
            id: participantId,
            first_name: selectedFriend.first_name,
            last_name: selectedFriend.last_name,
            email: selectedFriend.email,
          },
        };
        setChats((c) => [created, ...c]);
        setSelectedChat(created);
        setSelectedFriend(null);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        console.error('Create chat failed', data);
        setCreateError('Failed to create chat.');
      }
    } catch (err) {
      console.error('Create chat error', err);
      setCreateError('Failed to create chat. Please try again.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text || !selectedChat) return;
    try {
      const res = await fetch(`${API_BASE}/api/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.error('send message failed', await res.text());
        return;
      }
      const msgData = await res.json();
      // optimistically append message; backend also updates lastMessage
      setMessages((prev) => [
        ...prev,
        {
          id: msgData.messageId || `local-${Date.now()}`,
          text,
          senderId: user ? String(user.id || user.uid || user.email) : null,
        },
      ]);
      setText('');
    } catch (err) {
      console.error('send message error', err);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Chat</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 border rounded-lg p-3 h-96 overflow-auto bg-white shadow-sm">
          <h3 className="font-semibold mb-3 text-gray-800 text-sm tracking-wide">Search</h3>

          <form className="mb-3" onSubmit={createChat}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by first or last name..."
              className="w-full mb-2 border border-gray-300 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div className="mb-1 text-[11px] text-gray-500 font-medium uppercase tracking-wide">Search results</div>
            <div className="mb-2 max-h-32 overflow-auto border border-gray-200 rounded-md bg-gray-50">
              {searchResults.length === 0 && (
                <div className="text-[11px] text-gray-500 px-3 py-2">Type at least 2 characters to search</div>
              )}
              {searchResults.map((u) => {
                const sid = String(u.id);
                const selected = selectedFriend && String(selectedFriend.id) === sid;
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => handleSelectFriend(u)}
                    className={`w-full text-left px-3 py-1.5 text-xs border-b last:border-b-0 transition-colors ${
                      selected
                        ? 'bg-blue-50 text-blue-800 border-blue-100'
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-100'
                    }`}
                  >
                    {u.first_name} {u.last_name} {u.email ? `(${u.email})` : ''}
                  </button>
                );
              })}
              
            </div>
            {selectedFriend && (
              <div className="mb-3 text-[11px] text-gray-600">
                Selected: {selectedFriend.first_name} {selectedFriend.last_name}{' '}
                {selectedFriend.email ? `(${selectedFriend.email})` : ''}
              </div>
            )}
            {createError && (
              <div className="mb-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {createError}
              </div>
            )}
            <div className="mt-1">
              <button className="w-full bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-700 transition" type="submit">Create Chat</button>
            </div>
          </form>
          <h3 className="font-semibold mb-3 text-gray-800 text-sm tracking-wide">Chats</h3>

          {chats.length === 0 && <div className="text-sm text-gray-500 mt-2">No chats yet</div>}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`p-2 mb-1 rounded-lg cursor-pointer border transition ${
                selectedChat && selectedChat.id === c.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => {
                setSelectedChat(c);
                // optimistically clear unread for this chat in UI
                setChats((prev) =>
                  prev.map((chat) =>
                    chat.id === c.id ? { ...chat, unreadCount: 0 } : chat
                  )
                );
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="text-sm font-medium text-gray-800">
                  {c.otherUser
                    ? `${c.otherUser.first_name || ''} ${c.otherUser.last_name || ''}`.trim() || c.otherUser.email || 'Chat'
                    : 'Chat'}
                </div>
                {c.unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-2 border rounded-lg p-3 h-96 flex flex-col bg-white shadow-sm">
          <div className="flex-1 overflow-auto mb-2">
            {!selectedChat && <div className="text-sm text-gray-500">Select a chat</div>}
            {selectedChat && (
              <div>
                <div className="text-sm text-gray-500 mb-3">
                  <span className="font-semibold text-gray-700">Participants:</span>{' '}
                  {user && selectedChat.otherUser
                    ? `You, ${selectedChat.otherUser.first_name || ''} ${selectedChat.otherUser.last_name || ''}`.trim()
                    : ''}
                </div>
                <div className="space-y-2">
                  {loading && <div className="text-sm text-gray-500">Loading messages...</div>}
                  {!loading && messages.length === 0 && <div className="text-sm text-gray-500">No messages</div>}
                  {messages.map((m) => {
                    const isMe = String(m.senderId) === String(user?.id);
                    return (
                      <div key={m.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-left text-sm shadow-sm ${
                            isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {!isMe && selectedChat?.otherUser && (
                            <div className="text-[10px] text-gray-500 mb-0.5 text-left">
                              {`${selectedChat.otherUser.first_name || ''} ${selectedChat.otherUser.last_name || ''}`.trim() || selectedChat.otherUser.email || ''}
                            </div>
                          )}
                          <div>{m.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={handleSend}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

