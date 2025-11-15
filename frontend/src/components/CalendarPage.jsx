import React, { useState, useEffect } from 'react';
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
    const res = await fetch('/api/events', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    console.log(data.events)
    return data.events || [];
  } catch (err) {
    console.error('Error fetching events', err);
    return [];
  }
}
// tiny sample events
const initialEvents = [
  {
    id: 0,
    title: 'Meeting',
    start: new Date(2025, 10, 12, 10, 0), // Nov 12, 2025 10:00
    end: new Date(2025, 10, 12, 11, 0),
  },
  {
    id: 1,
    title: 'Lunch',
    start: new Date(2025, 10, 13, 12, 0),
    end: new Date(2025, 10, 13, 13, 0),
  },
];

export default function CalendarPage() {
  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'
  const [events, setEvents] = useState(initialEvents);
  const [date, setDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const ev = await fetchEvents();
      if (ev && ev.length) {
        // map backend rows to calendar events with Date objects
        const mapped = ev.map((e) => ({
          id: e.id,
          title: e.title,
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          color: e.colour,
        }));
        setEvents(mapped);
      }
    })();
  }, []);

  const handleAddEvent = (newEvent) => {
    // if backend returned an id, use it; otherwise assign a local id
    const id = (newEvent && newEvent.id !== undefined) ? newEvent.id : (events.length ? Math.max(...events.map((e) => e.id)) + 1 : 0);
    setEvents((prev) => [...prev, { ...newEvent, id }]);
    setIsModalOpen(false);
  };

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