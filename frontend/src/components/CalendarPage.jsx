import React, { useState, useEffect } from 'react';
import API_BASE from '../utils/apiBase';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import endOfWeek from 'date-fns/endOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AddEventModal from './AddEventModal';
import EventDetailsModal from './EventDetailsModal';
import { Button } from './ui/button';
import { Card } from './ui/card';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/events`, { credentials: 'include' });
    if (!res.ok) {
      // try to read body for debugging
      let txt = '';
      try { txt = await res.text(); } catch (e) { /* ignore */ }
      console.error('fetch /api/events failed', res.status, res.statusText, txt);
      return [];
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      // server returned a non-JSON body (HTML/login redirect etc.) — read it for debugging
      const raw = await res.text();
      console.error('fetch /api/events received non-JSON response:', raw);
      return [];
    }

    const data = await res.json();
    console.log('fetched events', data.events);
    return data.events || [];
  } catch (err) {
    console.error('Error fetching events', err);
    return [];
  }
}
// tiny sample events

export default function CalendarPage() {
  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'
  const [eventsRaw, setEventsRaw] = useState([]); // events as returned from backend
  const [events, setEvents] = useState([]); // displayed events (including expanded recurrences)
  const [date, setDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [range, setRange] = useState(() => {
    const now = new Date();
    // Use the visible calendar range (start of week containing 1st to end of week containing last day)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return { start, end };
  });

  useEffect(() => {
    (async () => {
      const ev = await fetchEvents();
      if (ev && ev.length) {
        const mapped = ev.map((e) => ({
          id: e.id,
          title: e.title,
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          color: e.colour || e.color || null,
          // prefer `recurrence` returned by backend (from recurring_type.name)
          recurrence: e.recurrence || null,
          is_invited: !!e.is_invited,
          owner_id: e.owner_id,
          attendee_id: e.attendee_id,
          attendee_status_id: e.attendee_status_id,
          attendee_status_name: e.attendee_status_name,
          inviter_first_name: e.inviter_first_name || null,
          inviter_last_name: e.inviter_last_name || null,
        }));
        setEventsRaw(mapped);
      }
    })();
  }, []);

  const handleAddEvent = (newEvent) => {
    // if backend returned an id, use it; otherwise assign a local id
    const id = (newEvent && newEvent.id !== undefined) ? newEvent.id : (events.length ? Math.max(...events.map((e) => e.id)) + 1 : 0);
    // if editingEvent exists (we were updating), replace existing
    if (editingEvent && editingEvent.id) {
      setEventsRaw(prev => {
        const next = (prev || []).map(ev => (String(ev.id) === String(newEvent.id) ? { ...ev, ...newEvent } : ev));
        const expanded = expandRecurringEvents(next, range.start, range.end);
        setEvents(expanded.length ? expanded : next);
        return next;
      });
      setEditingEvent(null);
      setIsModalOpen(false);
      return;
    }

    setEvents((prev) => [...prev, { ...newEvent, id }]);
    setIsModalOpen(false);
  };

  const handleEventClick = (evt) => {
    // evt has start/end/title/id; map to our internal shape
    setSelectedEvent({
      id: evt.id,
      title: evt.title,
      start: evt.start,
      end: evt.end,
      recurrence: evt.recurrence || null,
      color: evt.color || evt.colour || null,
      is_invited: !!evt.is_invited,
      owner_id: evt.owner_id,
      attendee_id: evt.attendee_id,
      attendee_status_id: evt.attendee_status_id,
      attendee_status_name: evt.attendee_status_name,
      inviter_name: evt.inviter_first_name || evt.inviter_last_name
        ? `${evt.inviter_first_name || ''} ${evt.inviter_last_name || ''}`.trim()
        : null,
    });
    setIsDetailsOpen(true);
  };

  const handleEditFromDetails = (evt) => {
    // open AddEventModal prefilled
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  const handleDeleteSuccess = (deletedId) => {
    // remove from raw events and recompute displayed
    setEventsRaw(prev => {
      const next = (prev || []).filter(e => String(e.id) !== String(deletedId));
      // recompute expanded events
      const expanded = expandRecurringEvents(next, range.start, range.end);
      setEvents(expanded.length ? expanded : next);
      return next;
    });
  };

  // when an invitee updates their status from the details modal, update local state
  const handleStatusChange = (eventId, attendeeId, attendeeStatusId) => {
    setEventsRaw(prev => {
      const next = (prev || []).map(e =>
        String(e.id) === String(eventId)
          ? { ...e, attendee_id: attendeeId, attendee_status_id: attendeeStatusId }
          : e
      );
      const expanded = expandRecurringEvents(next, range.start, range.end);
      setEvents(expanded.length ? expanded : next);
      return next;
    });
    setSelectedEvent(prev => prev && String(prev.id) === String(eventId)
      ? { ...prev, attendee_id: attendeeId, attendee_status_id: attendeeStatusId }
      : prev
    );
  };

  // when raw events or visible range changes, compute displayed events
  useEffect(() => {
    if (!eventsRaw || !eventsRaw.length) return;
    const expanded = expandRecurringEvents(eventsRaw, range.start, range.end);
    setEvents(expanded.length ? expanded : eventsRaw);
  }, [eventsRaw, range.start, range.end]);

  const eventStyleGetter = (event) => {
    const bg = event.color || event.colour || '#2563eb';
    const style = {
      backgroundColor: bg,
      borderRadius: '6px',
      color: '#ffffff',
      border: 'none',
      padding: '2px 4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    };
    return { style };
  };

  /**   
 * Expand recurring events from a list of events within a given range.
 * @param {Array<Object>} evList - list of events with possible recurrence rules
 * @param {Date} rangeStart - start of the range to expand recurring events
 * @param {Date} rangeEnd - end of the range to expand recurring events
 * @returns {Array<Object>} - list of expanded events with no recurrence rules
 * 
  */
  function expandRecurringEvents(evList, rangeStart, rangeEnd) {
    if (!Array.isArray(evList)) return [];
    const out = [];
    const maxOccurrences = 500;
    for (const e of evList) {
      if (!e.recurrence) {
        out.push(e);
        continue;
      }
      const rule = String(e.recurrence).toLowerCase();
      const origStart = new Date(e.start);
      const duration = (new Date(e.end)).getTime() - origStart.getTime();

      // if original start is after rangeEnd, but might still want first occurrence if within range
      let cursor = new Date(origStart);

      // fast-forward cursor to be at or after rangeStart
      if (cursor < rangeStart) {
        if (rule === 'daily') {
          const days = Math.floor((rangeStart - cursor) / (24 * 60 * 60 * 1000));
          cursor.setDate(cursor.getDate() + days);
        } else if (rule === 'weekly') {
          const weeks = Math.floor((rangeStart - cursor) / (7 * 24 * 60 * 60 * 1000));
          cursor.setDate(cursor.getDate() + weeks * 7);
        } else if (rule === 'monthly') {
          const months = (rangeStart.getFullYear() - cursor.getFullYear()) * 12 + (rangeStart.getMonth() - cursor.getMonth());
          cursor.setMonth(cursor.getMonth() + months);
        } else if (rule === 'yearly') {
          const years = rangeStart.getFullYear() - cursor.getFullYear();
          cursor.setFullYear(cursor.getFullYear() + years);
        }
      }

      let count = 0;
      while (cursor <= rangeEnd && count < maxOccurrences) {
        if (cursor >= rangeStart && cursor <= rangeEnd) {
          out.push({
            ...e,
            start: new Date(cursor),
            end: new Date(cursor.getTime() + duration),
          });
        }
        // advance cursor
        if (rule === 'daily') cursor.setDate(cursor.getDate() + 1);
        else if (rule === 'weekly') cursor.setDate(cursor.getDate() + 7);
        else if (rule === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
        else if (rule === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1);
        else break; // unknown rule
        count += 1;
      }
    }
    return out;
  }

  // handle when calendar range changes (month/week/day)
  const handleRangeChange = (newRange) => {
    // newRange can be an array of dates (month view) or { start, end }
    let start, end;
    if (Array.isArray(newRange) && newRange.length) {
      start = new Date(Math.min(...newRange.map(d => new Date(d).getTime())));
      end = new Date(Math.max(...newRange.map(d => new Date(d).getTime())));
    } else if (newRange && newRange.start && newRange.end) {
      start = new Date(newRange.start);
      end = new Date(newRange.end);
    } else if (newRange instanceof Date) {
      start = new Date(newRange);
      end = new Date(newRange);
    } else {
      // fallback to current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    setRange({ start, end });
    // expand using raw events
    const expanded = expandRecurringEvents(eventsRaw.length ? eventsRaw : [], start, end);
    setEvents(expanded.length ? expanded : (eventsRaw.length ? eventsRaw : []));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-6 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Your Calendar</h2>
            <p className="text-muted-foreground">Manage your schedule and upcoming events</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="lg">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </Button>
        </div>

        <Card className="p-4 md:p-6 shadow-md">
          <BigCalendar
            localizer={localizer}
            events={events}
            onSelectEvent={handleEventClick}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={(v) => setView(v)}
            date={date}
            onNavigate={(newDate) => setDate(newDate)}
            onRangeChange={handleRangeChange}
            eventPropGetter={eventStyleGetter}
            components={{
              event: ({ event }) => {
                let prefix = '';
                if (event.is_invited) {
                  // map attendee status to an emoji
                  if (event.attendee_status_id === 2 || event.attendee_status_name === 'going') prefix = '✅ ';
                  else if (event.attendee_status_id === 3 || event.attendee_status_name === 'maybe') prefix = '🤔 ';
                  else if (event.attendee_status_id === 4 || event.attendee_status_name === 'declined') prefix = '❌ ';
                  else prefix = '📩 ';
                }
                return <span>{prefix}{event.title}</span>;
              },
            }}
            selectable
            style={{ height: 600 }}
            defaultDate={new Date()}
          />
        </Card>
        <AddEventModal
          isOpen={isModalOpen}
          initialEvent={editingEvent}
          onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
          onSave={handleAddEvent}
        />
        <EventDetailsModal
          isOpen={isDetailsOpen}
          event={selectedEvent}
          onClose={() => setIsDetailsOpen(false)}
          onDeleteSuccess={handleDeleteSuccess}
          onEdit={handleEditFromDetails}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}