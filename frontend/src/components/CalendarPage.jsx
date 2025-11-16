import React, { useState, useEffect } from 'react';
import API_BASE from '../utils/apiBase';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AddEventModal from './AddEventModal';

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
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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
          recurrence: e.recurrence || e.recurring || null,
        }));
        setEventsRaw(mapped);
      }
    })();
  }, []);

  const handleAddEvent = (newEvent) => {
    // if backend returned an id, use it; otherwise assign a local id
    const id = (newEvent && newEvent.id !== undefined) ? newEvent.id : (events.length ? Math.max(...events.map((e) => e.id)) + 1 : 0);
    setEvents((prev) => [...prev, { ...newEvent, id }]);
    setIsModalOpen(false);
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
      padding: '2px 4px'
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 w-full max-w-5xl">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>Your Calendar</h2>

        <div className="my-4 flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200"
            onClick={() => setIsModalOpen(true)}
          >
            <i className="fa-solid fa-plus"></i> Add Event
          </button>
        </div>

        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(v) => setView(v)}
          date={date}
          onNavigate={(newDate) => setDate(newDate)}
          onRangeChange={handleRangeChange}
          eventPropGetter={eventStyleGetter}
          selectable
          style={{ height: 600 }}
          defaultDate={new Date()}
        />
        <AddEventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddEvent}
        />
      </div>
    </div>
  );
}