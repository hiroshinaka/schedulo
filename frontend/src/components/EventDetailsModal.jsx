import React from 'react';
import API_BASE from '../utils/apiBase';

export default function EventDetailsModal({ isOpen, event, onClose, onDeleteSuccess, onEdit }) {
  if (!isOpen || !event) return null;

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
        </div>
        <div className="text-sm mb-4">
          <div><strong>Start:</strong> {new Date(event.start).toLocaleString()}</div>
          <div><strong>End:</strong> {new Date(event.end).toLocaleString()}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded border border-gray-300 bg-white" onClick={onClose}>Close</button>
          {onEdit && (
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => { onEdit(event); onClose(); }}>Edit</button>
          )}
          <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={() => {
            if (typeof window !== 'undefined' && window.confirm && window.confirm('Move this event to trash?')) {
              handleDelete();
            }
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
