import React, { useState, useEffect } from 'react';
import { HexColorPicker } from "react-colorful";

export default function AddEventModal({isOpen, onClose, onSave}) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [recurring, setRecurring] = useState(false);
    const [color, setColor] = useState('#aabbcc');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen){
            setTitle('');
            setStartDate('');
            setEndDate('');
            setRecurring(false);
            setError(null);
            setColor('#aabbcc');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        if (!title || !startDate || !endDate) {
            setError('Please fill in all required fields.');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setError('Invalid date/time format.');
            return;
        }
        if (end <= start) {
            setError('End time must be after start time.');
            return;
        }

        // Build event object expected by calendar
        const event = {
            title: title.trim(),
            start,
            end,
            recurring: !!recurring,
        };

        if (onSave) onSave(event);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-lg bg-white rounded-md shadow-lg p-6"
            >
                <h3 className="text-lg font-medium mb-4">Add Event</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Title</label>
                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                            />
                        </div>

                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Start</label>
                        <div className="sm:col-span-2">
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                            />
                        </div>

                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">End</label>
                        <div className="sm:col-span-2">
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                            />
                        </div>

                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Recurring</label>
                        <div className="sm:col-span-2">
                            <div className="flex items-center gap-2">
                                <input
                                    id="recurring"
                                    type="checkbox"
                                    checked={recurring}
                                    onChange={(e) => setRecurring(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="recurring" className="text-sm">Repeat this event</label>
                            </div>
                        </div>
                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Friends </label>
                        <div className="sm:col-span-2">
                            <div className="flex items-center gap-2">
                                <input
                                    id="recurring"
                                   type="text"
                                    checked={recurring}
                                    onChange={(e) => setRecurring(e.target.checked)}
                                    className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                 </div>
                        </div>
                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Event Color</label>
                        <div className="sm:col-span-2">
                            <div className="flex flex-col items-start gap-2">
                                <div className="w-[180px]">
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
                                        aria-label="Hex color value"
                                    />
                                </div>

                                <div className="w-[180px] border border-gray-300 rounded overflow-hidden">
                                    <HexColorPicker color={color} onChange={setColor} style={{ width: '100%' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="px-3 py-1 rounded bg-brand-main text-brand-contrast hover:brightness-90">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}