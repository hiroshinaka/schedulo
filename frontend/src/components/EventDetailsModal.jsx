import React from 'react';
import API_BASE from '../utils/apiBase';
import useAuth from '../hooks/useAuth';

export default function EventDetailsModal({ isOpen, event, onClose, onDeleteSuccess, onEdit, onStatusChange }) {
  const { user } = useAuth() || {};
  if (!isOpen || !event) return null;
  const currentUserId = user && (user.id || user.user_id);
  const isOwner = currentUserId && event.owner_id && String(event.owner_id) === String(currentUserId);

  const handleDelete = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Delete failed', resp.status, txt);
        alert('Failed to delete event');
        return;
      }
      if (onDeleteSuccess) onDeleteSuccess(event.id);
      onClose();
    } catch (err) {
      console.error('Delete error', err);
      alert('Failed to delete event');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-white rounded-md shadow-lg p-6">
        <h3 className="text-lg font-medium mb-2">Event Details</h3>
        <div className="mb-3">
          <div className="text-sm font-semibold">{event.title}</div>
          <div className="text-xs text-gray-600">{event.recurrence ? `Repeats: ${event.recurrence}` : 'One-off'}</div>
          <div className="text-xs text-gray-600">Invited by <span className="font-bold">{event.inviter_name || 'Unknown'}</span> </div>
        </div>
        <div className="text-sm mb-4">
          <div><strong>Start:</strong> {new Date(event.start).toLocaleString()}</div>
          <div><strong>End:</strong> {new Date(event.end).toLocaleString()}</div>
        </div>

        {!isOwner && event.attendee_id && (
          <div className="mb-4 text-sm">
            <label className="block text-xs font-semibold mb-1">Your response</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={event.attendee_status_id || ''}
              onChange={async (e) => {
                const newStatusId = parseInt(e.target.value, 10);
                if (!newStatusId) return;
                try {
                  const resp = await fetch(`${API_BASE}/api/events/invites/${event.attendee_id}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status_id: newStatusId }),
                  });
                  if (!resp.ok) {
                    const txt = await resp.text();
                    console.error('Update status failed', resp.status, txt);
                    alert('Failed to update status');
                    return;
                  }
                  if (onStatusChange) {
                    onStatusChange(event.id, event.attendee_id, newStatusId);
                  }
                  onClose();
                } catch (err) {
                  console.error('Update status error', err);
                  alert('Failed to update status');
                }
              }}
            >
              <option value="">Select status...</option>
              <option value="2">Going ✅</option>
              <option value="3">Maybe 🤔</option>
              <option value="4">Not going ❌</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded border border-gray-300 bg-white" onClick={onClose}>Close</button>
          {isOwner && onEdit && (
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => { onEdit(event); onClose(); }}>Edit</button>
          )}
          {isOwner && (
            <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={() => {
              if (typeof window !== 'undefined' && window.confirm && window.confirm('Move this event to trash?')) {
                handleDelete();
              }
            }}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
