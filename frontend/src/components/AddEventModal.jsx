import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from "react-colorful";
import API_BASE from '../utils/apiBase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Badge } from './ui/badge';

export default function AddEventModal({isOpen, onClose, onSave, initialEvent = null}) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [recurrence, setRecurrence] = useState('');
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
            setRecurrence('');
            setError(null);
            setColor('#aabbcc');
            setInviteQuery('');
            setSuggestions([]);
            setInvitedUsers([]);
            setConflicts([]);
        } else if (isOpen && initialEvent) {
            // populate fields for editing
            setTitle(initialEvent.title || '');
            // inputs expect local datetime-local string; if initialEvent.start is a Date or ISO string, convert
            try {
                const s = new Date(initialEvent.start);
                const e = new Date(initialEvent.end);
                const toLocalInput = (d) => {
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                };
                setStartDate(toLocalInput(s));
                setEndDate(toLocalInput(e));
            } catch (err) {
                setStartDate(initialEvent.start || '');
                setEndDate(initialEvent.end || '');
            }
            setRecurrence(initialEvent.recurrence || '');
            setColor(initialEvent.color || initialEvent.colour || '#aabbcc');
        }
        return () => {
            if (inviteTimer.current) clearTimeout(inviteTimer.current);
        };
    }, [isOpen, initialEvent]);

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

        // If editing, call update endpoint
        try {
            const isEditing = initialEvent && initialEvent.id;
            if (isEditing) {
                const resp = await fetch(`${API_BASE}/api/events/${initialEvent.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title.trim(),
                        startDate: startDate,
                        endDate: endDate,
                        recurrence: recurrence || '',
                        color
                    })
                });
                if (!resp.ok) throw new Error('Failed to update event');
                const data = await resp.json();
                if (data && data.event) {
                    const e = data.event;
                    const eventObj = {
                        id: e.id,
                        title: e.title,
                        start: new Date(e.start_time),
                        end: new Date(e.end_time),
                        recurrence: e.recurrence || recurrence || '',
                        color: e.colour || e.color || color,
                    };
                    if (onSave) onSave(eventObj);
                    return;
                }
            }

            if (invitedUsers && invitedUsers.length) {
                const attendeeIds = invitedUsers.map(u => u.id);
                // if conflicts exist, prevent submit and show message
                if (conflicts && conflicts.length) {
                    setError('Some invitees have conflicting events. Resolve conflicts before inviting.');
                    return;
                }

                const resp = await fetch(`${API_BASE}/api/events/invite`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title.trim(),
                        startDate: startDate,
                        endDate: endDate,
                            recurrence: recurrence || '',
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
                        recurrence: e.recurrence || recurrence || '',
                        color: e.colour || e.color || color,
                    };
                    if (onSave) onSave(eventObj);
                    return;
                }
            }

            // If no invited users, create via backend /api/events so it's persisted
            const resp2 = await fetch(`${API_BASE}/api/events`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    startDate: startDate,
                    endDate: endDate,
                    recurrence: recurrence || '',
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
                    recurrence: e.recurrence || recurrence || '',
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
                const resp = await fetch(`${API_BASE}/api/events/check-conflicts`, {
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onClose={onClose}>
                <DialogHeader>
                    <DialogTitle>{initialEvent && initialEvent.id ? 'Edit Event' : 'Add Event'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start</Label>
                            <Input
                                type="datetime-local"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">End</Label>
                            <Input
                                type="datetime-local"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recurrence">Recurring</Label>
                        <Select
                            id="recurrence"
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value)}
                        >
                            <option value="">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invite">Invite Friends</Label>
                        <Input
                            type="text"
                            id="invite"
                            value={inviteQuery}
                            onChange={(e) => {
                                const v = e.target.value;
                                setInviteQuery(v);
                                setSuggestions([]);
                                if (inviteTimer.current) clearTimeout(inviteTimer.current);
                                if (!v || !v.trim()) return;
                                inviteTimer.current = setTimeout(async () => {
                                    try {
                                        const resp = await fetch(`${API_BASE}/api/friends/search?q=${encodeURIComponent(v)}`, { credentials: 'include' });
                                        if (!resp.ok) return;
                                        const data = await resp.json();
                                        setSuggestions(data.friends || []);
                                    } catch (err) {
                                        console.error('Friend search failed', err);
                                    }
                                }, 250);
                            }}
                            placeholder="Type a friend name or email"
                        />

                        {suggestions.length > 0 && (
                            <ul className="border rounded mt-2 bg-background max-h-40 overflow-auto">
                                {suggestions.map((s) => (
                                    <li key={s.id} className="px-3 py-2 hover:bg-accent cursor-pointer flex justify-between items-center" onClick={() => {
                                        if (!invitedUsers.find(u => String(u.id) === String(s.id))) {
                                            setInvitedUsers(prev => [...prev, s]);
                                        }
                                        setInviteQuery('');
                                        setSuggestions([]);
                                    }}>
                                        <div className="flex items-center gap-2">
                                            <img 
                                                src={s.image_url || '/default-avatar.svg'} 
                                                alt={s.first_name}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <div className="text-left">
                                                <div className="text-sm font-medium">{s.first_name} {s.last_name}</div>
                                                <div className="text-xs text-muted-foreground">{s.email}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">Add</div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {invitedUsers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {invitedUsers.map((u) => (
                                    <Badge key={u.id} variant="secondary" className="gap-2">
                                        <span>{u.first_name} {u.last_name}</span>
                                        <button type="button" aria-label="Remove" className="text-xs hover:text-destructive" onClick={() => setInvitedUsers(prev => prev.filter(x => String(x.id) !== String(u.id)))}>✕</button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Event Color</Label>
                        <Input
                            type="text"
                            id="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            aria-label="Hex color value"
                        />
                        <div className="border rounded overflow-hidden w-full max-w-[240px]">
                            <HexColorPicker color={color} onChange={setColor} style={{ width: '100%' }} />
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">{error}</p>}

                    {isCheckingConflicts && <p className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md p-3">Checking invitee availability...</p>}
                    {(!isCheckingConflicts && conflicts && conflicts.length > 0) && (
                        <div className="p-3 border border-destructive/50 bg-destructive/10 rounded-md">
                            <div className="text-sm font-medium text-destructive">Conflicts detected for invitees:</div>
                            <ul className="text-sm mt-2 list-disc list-inside space-y-1">
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
                            <div className="text-xs text-destructive mt-2">Resolve these conflicts or remove the invitees before saving.</div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={(conflicts && conflicts.length > 0)}>
                            {conflicts && conflicts.length > 0 ? 'Resolve Conflicts' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}