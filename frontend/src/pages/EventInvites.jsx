import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
    <div className="container py-6 md:py-10 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Event Invitations</h2>
        <p className="text-muted-foreground">Manage your pending event invites</p>
      </div>
      {error && (
        <div className="mb-4 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading invites...</p>
        </div>
      )}
      {!loading && invites.length === 0 && !error && (
        <Card className="shadow-md">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-muted-foreground font-medium">You have no pending invites</div>
              <p className="text-sm text-muted-foreground">Event invitations will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}
      {!loading && invites.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Event</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">When</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Invited By</th>
                <th className="px-6 py-4 text-center font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
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
                  <tr key={inv.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 align-middle">
                      <div className="font-semibold text-foreground">{inv.event_title}</div>
                      {inv.event_location && (
                        <div className="text-sm text-muted-foreground mt-0.5">{inv.event_location}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-foreground align-middle">{when}</td>
                    <td className="px-6 py-4 text-foreground align-middle">{inviter}</td>
                    <td className="px-6 py-4 text-center align-middle">
                      <Badge variant="secondary" className="font-medium">
                        {STATUS_LABELS[inv.status_id] || 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => respond(inv.id, 2)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respond(inv.id, 3)}
                          variant="outline"
                        >
                          Maybe
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => respond(inv.id, 4)}
                        >
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
