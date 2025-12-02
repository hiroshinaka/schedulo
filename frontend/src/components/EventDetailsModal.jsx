import React from 'react';
import API_BASE from '../utils/apiBase';
import useAuth from '../hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Badge } from './ui/badge';

export default function EventDetailsModal({ isOpen, event, onClose, onDeleteSuccess, onEdit, onStatusChange }) {
  const { user } = useAuth() || {};
  if (!event) return null;
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {event.recurrence ? (
              <Badge variant="secondary" className="mt-1">Repeats: {event.recurrence}</Badge>
            ) : (
              <Badge variant="outline" className="mt-1">One-off event</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {event.inviter_name && (
            <div className="text-sm text-muted-foreground">
              Invited by <span className="font-medium text-foreground">{event.inviter_name}</span>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium w-16">Start:</span>
              <span>{new Date(event.start).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium w-16">End:</span>
              <span>{new Date(event.end).toLocaleString()}</span>
            </div>
          </div>

          {!isOwner && event.attendee_id && (
            <div className="space-y-2">
              <Label htmlFor="status">Your response</Label>
              <Select
                id="status"
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
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isOwner && onEdit && (
            <Button variant="default" onClick={() => { onEdit(event); onClose(); }}>Edit</Button>
          )}
          {isOwner && (
            <Button variant="destructive" onClick={() => {
              if (typeof window !== 'undefined' && window.confirm && window.confirm('Move this event to trash?')) {
                handleDelete();
              }
            }}>Delete</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
