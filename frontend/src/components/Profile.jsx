import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import API_BASE from '../utils/apiBase';

export default function Profile() {
  const { user, loggedIn, refresh } = useAuth();
  const fileInputRef = useRef(null);
  const defaultAvatar = '/default-avatar.svg';
  const [userAvatar, setUserAvatar] = useState(user?.image_url || defaultAvatar);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUserAvatar(user?.image_url || defaultAvatar);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'requests' && pendingRequests.length > 0) {
      markRequestsAsRead();
    }
  }, [activeTab, pendingRequests.length]);

  const markRequestsAsRead = async () => {
    try {
      await fetch(`${API_BASE}/api/profile/mark-requests-read`, {
        method: 'POST',
        credentials: 'include'
      });
      window.dispatchEvent(new Event('friend-requests-viewed'));
    } catch (err) {
      console.error('Failed to mark requests as read', err);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadFriends();
      loadFriendRequests();
    }
  }, [loggedIn]);

  const loadFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/friends`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/friend-requests`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPendingRequests(data.pending || []);
        setSentRequests(data.sent || []);
      }
    } catch (err) {
      console.error('Failed to load friend requests', err);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/search-users?q=${encodeURIComponent(query)}`, { 
        credentials: 'include' 
      });
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Failed to search users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/send-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiverId })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Friend request sent!');
        setSearchQuery('');
        setSearchResults([]);
        loadFriendRequests();
      } else {
        alert(data.message || 'Failed to send friend request');
      }
    } catch (err) {
      console.error('Failed to send friend request', err);
      alert('Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/accept-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.ok) {
        loadFriends();
        loadFriendRequests();
      } else {
        alert(data.message || 'Failed to accept request');
      }
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/reject-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.ok) {
        loadFriendRequests();
      } else {
        alert(data.message || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Failed to reject friend request', err);
    }
  };

  const cancelFriendRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/cancel-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.ok) {
        loadFriendRequests();
      } else {
        alert(data.message || 'Failed to cancel request');
      }
    } catch (err) {
      console.error('Failed to cancel friend request', err);
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/profile/remove-friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId })
      });
      const data = await res.json();
      if (data.ok) {
        loadFriends();
      } else {
        alert(data.message || 'Failed to remove friend');
      }
    } catch (err) {
      console.error('Failed to remove friend', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setUserAvatar(reader.result);
    reader.readAsDataURL(file);

    // upload to backend
    const form = new FormData();
    form.append('avatar', file);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile/avatar`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        const body = await res.json();
        if (body && body.ok && body.user) {
          if (typeof refresh === 'function') await refresh();
          setUserAvatar(body.user.image_url || defaultAvatar);
        } else {
          console.error('Avatar upload failed', body);
        }
      } catch (err) {
        console.error('Avatar upload error', err);
      }
    })();
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You must be logged in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-6 md:py-10">
      <div className="container max-w-5xl">
        <Card className="mb-8 shadow-lg">
          <CardContent className="flex flex-col md:flex-row gap-6 pt-8 pb-6">
              <div className="flex flex-col items-center md:items-start">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                  <AvatarImage src={userAvatar} alt={`${user?.first_name || 'User'} ${user?.last_name || ''}`} />
                </Avatar>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <Button
                  size="icon"
                  variant="default"
                  className="absolute bottom-0 right-0 h-9 w-9 z-50 rounded-full border-2 border-background transition-transform hover:scale-105"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  aria-label="Change profile picture"
                  title="Change profile picture"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div>
                <h1 className="text-3xl font-bold">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-muted-foreground mt-1">{user?.email}</p>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-muted-foreground">Joined {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl">Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs className="py-2" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 gap-2">
                <TabsTrigger value="friends" className="flex items-center gap-2">
                  <span>My Friends</span>
                  <Badge variant="secondary">{friends.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <span>Requests</span>
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-2">
                  <span>Sent</span>
                  <Badge variant="secondary">{sentRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="add">Add Friends</TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-3">
                {friends.length === 0 ? (
                  <p className="text-muted-foreground text-left py-8">No friends yet. Start adding friends!</p>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.image_url || defaultAvatar} alt={friend.first_name} />
                        </Avatar>
                        <div>
                          <div className="font-medium text-left">{friend.first_name} {friend.last_name}</div>
                          <div className="text-sm text-muted-foreground text-left">{friend.email}</div>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => removeFriend(friend.id)}>
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="requests" className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <p className="text-muted-foreground text-left py-8">No pending friend requests</p>
                ) : (
                  pendingRequests.map((request) => (
                    <div key={request.request_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.image_url || defaultAvatar} alt={request.first_name} />
                        </Avatar>
                        <div>
                          <div className="font-medium text-left">{request.first_name} {request.last_name}</div>
                          <div className="text-sm text-muted-foreground text-left">{request.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => acceptFriendRequest(request.request_id)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectFriendRequest(request.request_id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-3">
                {sentRequests.length === 0 ? (
                  <p className="text-muted-foreground text-left py-8">No sent friend requests</p>
                ) : (
                  sentRequests.map((request) => (
                    <div key={request.request_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.image_url || defaultAvatar} alt={request.first_name} />
                        </Avatar>
                        <div>
                          <div className="font-medium text-left">{request.first_name} {request.last_name}</div>
                          <div className="text-sm text-muted-foreground text-left">{request.email}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => cancelFriendRequest(request.request_id)}>
                        Cancel
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="add" className="space-y-4">
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-muted-foreground text-left py-8">Searching...</p>
                  ) : searchResults.length === 0 && searchQuery ? (
                    <p className="text-muted-foreground text-left py-8">No users found</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-muted-foreground text-left py-8">Search for users to add as friends</p>
                  ) : (
                    searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.image_url || defaultAvatar} alt={user.first_name} />
                          </Avatar>
                          <div>
                            <div className="font-medium text-left">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-muted-foreground text-left">{user.email}</div>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => sendFriendRequest(user.id)}>
                          Add Friend
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
