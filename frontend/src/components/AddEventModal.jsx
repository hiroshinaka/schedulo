import React, { useState, useEffect } from 'react';

export default function AddEventModal({isOpen, onClose, onSave}) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [recurring, setRecurring] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen){
            setTitle('');
            setStartDate('');
            setEndDate('');
            setRecurring(false);
            setError(null);
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
                    <div>
                        <label className="block text-sm font-medium">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full border rounded px-2 py-1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Start</label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full border rounded px-2 py-1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">End</label>
                        <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full border rounded px-2 py-1"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="recurring"
                            type="checkbox"
                            checked={recurring}
                            onChange={(e) => setRecurring(e.target.checked)}
                        />
                        <label htmlFor="recurring" className="text-sm">Recurring</label>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 rounded border bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}