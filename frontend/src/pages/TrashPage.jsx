import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';
import { Link } from 'react-router-dom';

export default function TrashPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/api/events/trash`, { credentials: 'include' });
      if (!resp.ok) {
        console.error('Failed to fetch trash', resp.status);
        setEvents([]);
        return;
      }
      const data = await resp.json();
      setEvents((data && data.events) ? data.events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        recurrence: e.recurrence || null,
        deleted_at: e.deleted_at
      })) : []);
    } catch (err) {
      console.error('Fetch trash error', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/events/${id}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      if (resp.status === 410) {
        alert('Cannot restore: deleted more than 30 days ago.');
        return;
      }
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Restore failed', resp.status, txt);
        alert('Failed to restore event');
        return;
      }
      // remove from local list
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Restore error', err);
      alert('Failed to restore event');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trash</h2>
          <Link to="/app" className="text-sm text-blue-600">Back to calendar</Link>
        </div>

        {loading && <div>Loading...</div>}
        {!loading && events.length === 0 && <div className="text-gray-600">No deleted events.</div>}

        <ul className="space-y-3">
          {events.map(ev => (
            <li key={ev.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="text-xs text-gray-600">{new Date(ev.start).toLocaleString()} — {new Date(ev.end).toLocaleString()}</div>
                <div className="text-xs text-gray-500">{ev.recurrence ? `Repeats: ${ev.recurrence}` : 'One-off'}</div>
                <div className="text-xs text-gray-400">Deleted: {new Date(ev.deleted_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={() => handleRestore(ev.id)}>Restore</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
