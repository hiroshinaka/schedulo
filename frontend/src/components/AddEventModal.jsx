import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from "react-colorful";

export default function AddEventModal({isOpen, onClose, onSave}) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [recurring, setRecurring] = useState('');
    const [color, setColor] = useState('#aabbcc');
    const [inviteQuery, setInviteQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [invitedUsers, setInvitedUsers] = useState([]);
    const inviteTimer = useRef(null);
    const [error, setError] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

    useEffect(() => {
        if (!isOpen){
            setTitle('');
            setStartDate('');
            setEndDate('');
            setRecurring('');
            setError(null);
            setColor('#aabbcc');
            setInviteQuery('');
            setSuggestions([]);
            setInvitedUsers([]);
            setConflicts([]);
        }
        return () => {
            if (inviteTimer.current) clearTimeout(inviteTimer.current);
        };
    }, [isOpen]);

    const handleSubmit = async (e) => {
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

        // If there are invited users, call backend create+invite endpoint
        try {
                if (invitedUsers && invitedUsers.length) {
                const attendeeIds = invitedUsers.map(u => u.id);
                // if conflicts exist, prevent submit and show message
                if (conflicts && conflicts.length) {
                    setError('Some invitees have conflicting events. Resolve conflicts before inviting.');
                    return;
                }

                const resp = await fetch('/api/events/invite', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title.trim(),
                        startDate: startDate,
                            endDate: endDate,
                            recurring: recurring || '',
                        color,
                        attendees: attendeeIds
                    })
                });
                if (!resp.ok) throw new Error('Failed to create event');
                const data = await resp.json();
                if (data && data.event) {
                    const e = data.event;
                    const eventObj = {
                        id: e.id,
                        title: e.title,
                        start: new Date(e.start_time),
                        end: new Date(e.end_time),
                        recurrence: e.recurrence || recurring || '',
                        color: e.colour || e.color || color,
                    };
                    if (onSave) onSave(eventObj);
                    return;
                }
            }

            // If no invited users, create via backend /api/events so it's persisted
            const resp2 = await fetch('/api/events', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    startDate: startDate,
                    endDate: endDate,
                    recurring: recurring || '',
                    color
                })
            });
            if (!resp2.ok) throw new Error('Failed to create event');
            const data2 = await resp2.json();
            if (data2 && data2.event) {
                const e = data2.event;
                const eventObj = {
                    id: e.id,
                    title: e.title,
                    start: new Date(e.start_time),
                    end: new Date(e.end_time),
                    recurrence: e.recurrence || recurring || '',
                    color: e.colour || e.color || color,
                };
                if (onSave) onSave(eventObj);
                return;
            }
        } catch (err) {
            console.error('Create event failed', err);
            setError('Failed to save event.');
        }
    };

    // debounce conflict checks when invitees or time change
    useEffect(() => {
        // clear previous timer if any
        if (inviteTimer.current) clearTimeout(inviteTimer.current);
        setConflicts([]);
        setError(null);
        if (!invitedUsers || invitedUsers.length === 0) return;
        if (!startDate || !endDate) return;
        inviteTimer.current = setTimeout(async () => {
            try {
                setIsCheckingConflicts(true);
                const attendeeIds = invitedUsers.map(u => u.id);
                const resp = await fetch('/api/events/check-conflicts', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendees: attendeeIds, startDate, endDate })
                });
                if (!resp.ok) {
                    // treat as no conflicts but show nothing
                    setConflicts([]);
                    setIsCheckingConflicts(false);
                    return;
                }
                const data = await resp.json();
                setConflicts(data.conflicts || []);
            } catch (err) {
                console.error('Conflict check failed', err);
                setConflicts([]);
            } finally {
                setIsCheckingConflicts(false);
            }
        }, 400);
        return () => { if (inviteTimer.current) clearTimeout(inviteTimer.current); };
    }, [invitedUsers, startDate, endDate]);

    if (!isOpen) return null;

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
                            <select
                                id="recurring"
                                value={recurring}
                                onChange={(e) => setRecurring(e.target.value)}
                                className="mt-1 block w-full border bg-white border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="">Does not repeat</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <label className="sm:col-span-1 text-sm font-medium text-right pr-4">Invite</label>
                        <div className="sm:col-span-2">
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    value={inviteQuery}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setInviteQuery(v);
                                        setSuggestions([]);
                                        if (inviteTimer.current) clearTimeout(inviteTimer.current);
                                        if (!v || !v.trim()) return;
                                        inviteTimer.current = setTimeout(async () => {
                                            try {
                                                const resp = await fetch(`/api/friends/search?q=${encodeURIComponent(v)}`, { credentials: 'include' });
                                                if (!resp.ok) return;
                                                const data = await resp.json();
                                                setSuggestions(data.friends || []);
                                            } catch (err) {
                                                console.error('Friend search failed', err);
                                            }
                                        }, 250);
                                    }}
                                    placeholder="Type a friend name or email"
                                    className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />

                                {suggestions.length > 0 && (
                                    <ul className="border rounded mt-1 bg-white max-h-40 overflow-auto">
                                        {suggestions.map((s) => (
                                            <li key={s.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => {
                                                if (!invitedUsers.find(u => String(u.id) === String(s.id))) {
                                                    setInvitedUsers(prev => [...prev, s]);
                                                }
                                                setInviteQuery('');
                                                setSuggestions([]);
                                            }}>
                                                <div>
                                                    <div className="text-sm font-medium">{s.first_name} {s.last_name}</div>
                                                    <div className="text-xs text-gray-500">{s.email}</div>
                                                </div>
                                                <div className="text-xs text-gray-400">Add</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {invitedUsers.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {invitedUsers.map((u) => (
                                            <div key={u.id} className="bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                                                <div className="text-sm">{u.first_name} {u.last_name}</div>
                                                <button type="button" aria-label="Remove" className="text-xs text-red-500" onClick={() => setInvitedUsers(prev => prev.filter(x => String(x.id) !== String(u.id)))}>x</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                    {isCheckingConflicts && <p className="text-sm text-yellow-600">Checking invitee availability...</p>}
                    {(!isCheckingConflicts && conflicts && conflicts.length > 0) && (
                        <div className="p-2 border border-red-200 bg-red-50 rounded">
                            <div className="text-sm font-medium text-red-700">Conflicts detected for invitees:</div>
                            <ul className="text-sm mt-1 list-disc list-inside">
                                {invitedUsers.map(u => {
                                    const uConf = conflicts.find(c => String(c.userId) === String(u.id));
                                    if (!uConf) return null;
                                    return (
                                        <li key={u.id}>
                                            <strong>{u.first_name} {u.last_name}</strong>: conflicting event from {new Date(uConf.start).toLocaleString()} to {new Date(uConf.end).toLocaleString()}
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="text-xs text-red-600 mt-2">Resolve these conflicts or remove the invitees before saving.</div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={(conflicts && conflicts.length > 0)} className={`px-3 py-1 rounded ${conflicts && conflicts.length > 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-brand-main text-brand-contrast hover:brightness-90'}`}>
                            {conflicts && conflicts.length > 0 ? 'Resolve Conflicts' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}