import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';

const STATUS_LABELS = {
  1: 'Pending',
  2: 'Going',
  3: 'Maybe',
  4: 'Not going',
};

export default function EventInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadInvites = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/events/invites?statuses=1`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError('Failed to load invites.');
        setInvites([]);
        return;
      }
      const data = await res.json();
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (err) {
      console.error('Failed to load invites', err);
      setError('Failed to load invites.');
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const respond = async (inviteId, statusId) => {
    try {
      const res = await fetch(`${API_BASE}/api/events/invites/${inviteId}/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: statusId }),
      });
      if (!res.ok) {
        console.error('Respond failed', await res.text());
        return;
      }
      // After responding, remove this invite from the pending list
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error('Respond error', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Event Invites</h2>
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-gray-600">Loading invites...</div>}
      {!loading && invites.length === 0 && !error && (
        <div className="text-sm text-gray-500">You have no pending invites.</div>
      )}
      {!loading && invites.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Event</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">When</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Invited By</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const start = inv.start_time ? new Date(inv.start_time) : null;
                const end = inv.end_time ? new Date(inv.end_time) : null;
                const when = start
                  ? `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` +
                    (end
                      ? ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : '')
                  : 'TBD';
                const inviter = [inv.invited_by_first_name, inv.invited_by_last_name]
                  .filter(Boolean)
                  .join(' ') || 'Unknown';
                return (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 align-top text-center">
                      <div className="font-medium text-gray-900 text-sm">{inv.event_title}</div>
                      {inv.event_location && (
                        <div className="text-[11px] text-gray-500">{inv.event_location}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700 text-center align-middle">{when}</td>
                    <td className="px-4 py-2 text-gray-700 text-center align-middle">{inviter}</td>
                    <td className="px-4 py-2 text-center align-middle">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {STATUS_LABELS[inv.status_id] || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => respond(inv.id, 2)}
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                        >
                          Going
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(inv.id, 3)}
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600"
                        >
                          Maybe
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(inv.id, 4)}
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white hover:bg-red-600"
                        >
                          Not going
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
