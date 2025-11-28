import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';

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
      await fetch('/api/profile/mark-requests-read', {
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
      const res = await fetch('/api/profile/friends', { credentials: 'include' });
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
      const res = await fetch('/api/profile/friend-requests', { credentials: 'include' });
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
      const res = await fetch(`/api/profile/search-users?q=${encodeURIComponent(query)}`, { 
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
      const res = await fetch('/api/profile/send-friend-request', {
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
      const res = await fetch('/api/profile/accept-friend-request', {
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
      const res = await fetch('/api/profile/reject-friend-request', {
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
      const res = await fetch('/api/profile/cancel-friend-request', {
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
      const res = await fetch('/api/profile/remove-friend', {
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
        const res = await fetch('/api/profile/avatar', {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 bg-white rounded-md shadow-md">
          <p className="text-center text-lg">You must be logged in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 flex gap-6">
          <div className="relative">
            <img
              src={userAvatar}
              alt={`${user?.first_name || 'User'} ${user?.last_name || ''}`}
              className="h-24 w-24 rounded-full object-cover"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="absolute bottom-0 right-0 -mb-0 -mr-0 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white hover:bg-slate-800"
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M14.2639 15.9376L12.5958 14.2835C11.7909 13.4852 11.3884 13.0861 10.9266 12.9402C10.5204 12.8119 10.0838 12.8166 9.68048 12.9537C9.22188 13.1096 8.82814 13.5173 8.04068 14.3327L4.04409 18.2802M14.2639 15.9376L14.6053 15.5991C15.4112 14.7999 15.8141 14.4003 16.2765 14.2544C16.6831 14.1262 17.12 14.1312 17.5236 14.2688C17.9824 14.4252 18.3761 14.834 19.1634 15.6515L20 16.4936M14.2639 15.9376L18.275 19.9566M18.275 19.9566C17.9176 20.0001 17.4543 20.0001 16.8 20.0001H7.2C6.07989 20.0001 5.51984 20.0001 5.09202 19.7821C4.71569 19.5904 4.40973 19.2844 4.21799 18.9081C4.12796 18.7314 4.07512 18.5322 4.04409 18.2802M18.275 19.9566C18.5293 19.9257 18.7301 19.8728 18.908 19.7821C19.2843 19.5904 19.5903 19.2844 19.782 18.9081C20 18.4803 20 17.9202 20 16.8001V16.4936M12.5 4L7.2 4.00011C6.07989 4.00011 5.51984 4.00011 5.09202 4.21809C4.71569 4.40984 4.40973 4.7158 4.21799 5.09213C4 5.51995 4 6.08 4 7.20011V16.8001C4 17.4576 4 17.9222 4.04409 18.2802M20 11.5V16.4936M14 10.0002L16.0249 9.59516C16.2015 9.55984 16.2898 9.54219 16.3721 9.5099C16.4452 9.48124 16.5146 9.44407 16.579 9.39917C16.6515 9.34859 16.7152 9.28492 16.8425 9.1576L21 5.00015C21.5522 4.44787 21.5522 3.55244 21 3.00015C20.4477 2.44787 19.5522 2.44787 19 3.00015L14.8425 7.1576C14.7152 7.28492 14.6515 7.34859 14.6009 7.42112C14.556 7.4855 14.5189 7.55494 14.4902 7.62801C14.4579 7.71033 14.4403 7.79862 14.4049 7.97518L14 10.0002Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </g>
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl  text-left font-semibold text-slate-900">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-sm text-left text-slate-600">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-col text-left mt-4">
              <div className="text-sm text-slate-500">Member since</div>
              <div className="font-medium">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-xl text-left font-semibold text-slate-900 mb-4">Friends</h2>
          
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('friends')}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'friends' 
                  ? 'border-b-2 border-slate-900 text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'requests' 
                  ? 'border-b-2 border-slate-900 text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'sent' 
                  ? 'border-b-2 border-slate-900 text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sent ({sentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'add' 
                  ? 'border-b-2 border-slate-900 text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Add Friends
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No friends yet. Start adding friends!</p>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div className="flex text-left items-center gap-3">
                        <img 
                          src={friend.image_url || defaultAvatar} 
                          alt={friend.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {friend.first_name} {friend.last_name}
                          </div>
                          <div className="text-sm text-slate-500">{friend.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No pending friend requests</p>
                ) : (
                  pendingRequests.map((request) => (
                    <div key={request.request_id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div className="flex text-left items-center gap-3">
                        <img 
                          src={request.image_url || defaultAvatar} 
                          alt={request.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {request.first_name} {request.last_name}
                          </div>
                          <div className="text-sm text-slate-500">{request.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptFriendRequest(request.request_id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(request.request_id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="space-y-3">
                {sentRequests.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No sent friend requests</p>
                ) : (
                  sentRequests.map((request) => (
                    <div key={request.request_id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div className="flex text-left items-center gap-3">
                        <img 
                          src={request.image_url || defaultAvatar} 
                          alt={request.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {request.first_name} {request.last_name}
                          </div>
                          <div className="text-sm text-slate-500">{request.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelFriendRequest(request.request_id)}
                        className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'add' && (
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-slate-500 text-center py-8">Searching...</p>
                  ) : searchResults.length === 0 && searchQuery ? (
                    <p className="text-slate-500 text-center py-8">No users found</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Search for users to add as friends</p>
                  ) : (
                    searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <div className="flex text-left items-center gap-3">
                          <img 
                            src={user.image_url || defaultAvatar} 
                            alt={user.first_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium text-slate-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="px-3 py-1 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded"
                        >
                          Add Friend
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
