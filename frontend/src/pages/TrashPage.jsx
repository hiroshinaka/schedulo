import React, { useEffect, useState } from 'react';
import API_BASE from '../utils/apiBase';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-6 md:py-10">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Deleted Events</h2>
            <p className="text-muted-foreground">Restore events deleted within the last 30 days</p>
          </div>
          <Link to="/app">
            <Button variant="outline" size="lg">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Calendar
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading deleted events...</p>
          </div>
        )}
        
        {!loading && events.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="text-muted-foreground font-medium">Trash is empty</div>
                <p className="text-sm text-muted-foreground">Deleted events will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {events.map(ev => (
            <Card key={ev.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-1">{ev.title}</div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{new Date(ev.start).toLocaleString()} — {new Date(ev.end).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>{ev.recurrence ? `Repeats: ${ev.recurrence}` : 'One-time event'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Deleted: {new Date(ev.deleted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => handleRestore(ev.id)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore Event
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
