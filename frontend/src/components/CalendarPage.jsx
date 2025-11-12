import React, { useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// tiny sample events
const sampleEvents = [
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 w-full max-w-5xl">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>Your Calendar</h2>

        <div className="my-4 flex gap-2">
          <button onClick={() => setView('month')} className="px-3 py-1 rounded bg-gray-200">Month</button>
          <button onClick={() => setView('week')} className="px-3 py-1 rounded bg-gray-200">Week</button>
          <button onClick={() => setView('day')} className="px-3 py-1 rounded bg-gray-200">Day</button>
        </div>

        <BigCalendar
          localizer={localizer}
          events={sampleEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(v) => setView(v)}
          selectable
          style={{ height: 600 }}
          defaultDate={new Date()}
        />
      </div>
    </div>
  );
}