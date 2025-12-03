import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';
import useAuth from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

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
    <div className="container py-6 md:py-10 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Messages</h2>
        <p className="text-muted-foreground">Connect with your friends and colleagues</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        <Card className="col-span-1 flex flex-col shadow-md">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base font-semibold">New Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 flex-1 overflow-auto">

          <form className="space-y-3" onSubmit={createChat}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by first or last name..."
              className="h-9 text-xs"
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
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" size="sm">
              Create Chat
            </Button>
          </form>

          <div className="border-t pt-4 mt-4">
            <CardTitle className="text-base font-semibold mb-3">Your Chats</CardTitle>
            {chats.length === 0 && <div className="text-sm text-muted-foreground">No chats yet</div>}
            {chats.map((c) => (
              <div
                key={c.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer border transition ${
                  selectedChat && selectedChat.id === c.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-accent border-transparent'
                }`}
        onClick={() => {
                setSelectedChat(c);
                setChats((prev) =>
                  prev.map((chat) =>
                    chat.id === c.id ? { ...chat, unreadCount: 0 } : chat
                  )
                );
                // Dispatch event so Header updates message count
                window.dispatchEvent(new Event('chat-viewed'));
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {c.otherUser
                    ? `${c.otherUser.first_name || ''} ${c.otherUser.last_name || ''}`.trim() || c.otherUser.email || 'Chat'
                    : 'Chat'}
                </div>
                {c.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-2">
                    {c.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 flex flex-col shadow-md">
          <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-auto p-4 bg-muted/20">
            {!selectedChat && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Select a chat to start messaging</div>
                </div>
              </div>
            )}
            {selectedChat && (
              <div>
                <div className="text-xs text-muted-foreground mb-4 pb-3 border-b">
                  <span className="font-medium">Chat with:</span>{' '}
                  {user && selectedChat.otherUser
                    ? `You, ${selectedChat.otherUser.first_name || ''} ${selectedChat.otherUser.last_name || ''}`.trim()
                    : ''}
                </div>
                <div className="space-y-2">
                  {loading && <div className="text-sm text-muted-foreground text-center py-8">Loading messages...</div>}
                  {!loading && messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</div>}
                  {messages.map((m) => {
                    const isMe = String(m.senderId) === String(user?.id);
                    return (
                      <div key={m.id} className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border'
                          }`}
                        >
                          {!isMe && selectedChat?.otherUser && (
                            <div className="text-xs text-muted-foreground mb-1 font-medium">
                              {`${selectedChat.otherUser.first_name || ''} ${selectedChat.otherUser.last_name || ''}`.trim() || selectedChat.otherUser.email || ''}
                            </div>
                          )}
                          <div className="break-words">{m.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="border-t bg-background p-4">
            <form className="flex gap-2" onSubmit={handleSend}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 h-11"
                disabled={!selectedChat}
              />
              <Button type="submit" size="lg" disabled={!selectedChat || !text.trim()} className="px-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </form>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

