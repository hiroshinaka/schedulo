import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
export default function CalendarPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>Your Calendar</h2>
        <Calendar />
      </div>
    </div>
  );
}
