const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js');
const eventQueries = require('../database/dbQueries/eventsQueries.js');
const { getBusyIntervalsForUsers, checkUsersBusyForInterval, fetchEventInvitesByUserID, respondToEventInvite } = require('../database/dbQueries/eventsQueries.js');

function requireSessionUser(req, res, next) {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'unauthenticated' });
    next();
}

// Create an event (owner = current user)
router.post('/', requireSessionUser, async (req, res) => {
    try {
        const { title, startDate, endDate, recurring, recurrence, color } = req.body || {};
        const recurringVal = (recurrence !== undefined && recurrence !== null) ? recurrence : recurring;
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

        if (!title || !startDate || !endDate || !color) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const event = await eventQueries.createEvent(pool, uid, title, startDate, endDate, recurringVal, color);
        return res.json({ event });
    } catch (err) {
        console.error('POST /api/events error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Create event and invite attendees in one request
router.post('/invite', requireSessionUser, async (req, res) => {
    try {
        const { title, startDate, endDate, recurring, recurrence, color, attendees } = req.body || {};
        const recurringVal = (recurrence !== undefined && recurrence !== null) ? recurrence : recurring;
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

        if (!title || !startDate || !endDate || !color) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // attendees expected as array of user ids
        const inviteeIds = Array.isArray(attendees) ? [...new Set(attendees.map(String))] : [];
        // remove owner if present
        const filteredInvitees = inviteeIds.filter(id => id !== String(uid));

        // check for conflicts for each invitee
        if (filteredInvitees.length) {
            const conflicts = await eventQueries.checkUsersBusyForInterval(pool, filteredInvitees, startDate, endDate);
            if (conflicts && conflicts.length) {
                return res.status(409).json({ error: 'conflicts', conflicts });
            }
        }

        const event = await eventQueries.createEventWithAttendees(pool, uid, title, startDate, endDate, recurringVal, color, inviteeIds || []);
        return res.json({ event });
    } catch (err) {
        console.error('POST /api/events/invite error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Invite additional users to an existing event
router.post('/:eventId/invite', requireSessionUser, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { attendees } = req.body || {};
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        if (!Array.isArray(attendees) || attendees.length === 0) return res.status(400).json({ error: 'attendees required' });

        // fetch event times to check conflicts
        const [evRows] = await pool.query('SELECT start_time, end_time FROM event WHERE event_id = ?', [eventId]);
        const evSet = Array.isArray(evRows[0]) ? evRows[0] : evRows;
        if (!evSet || !evSet.length) return res.status(404).json({ error: 'event not found' });
        const ev = evSet[0];
        const start = ev.start_time;
        const end = ev.end_time;

        const inviteeIds = Array.isArray(attendees) ? [...new Set(attendees.map(String))] : [];
        const filteredInvitees = inviteeIds.filter(id => id !== String(uid));
        if (filteredInvitees.length) {
            const conflicts = await eventQueries.checkUsersBusyForInterval(pool, filteredInvitees, start, end);
            if (conflicts && conflicts.length) {
                return res.status(409).json({ error: 'conflicts', conflicts });
            }
        }

        await eventQueries.inviteFriendsToEvent(pool, eventId, uid, attendees);
        return res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/events/:eventId/invite error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Update an event (owner only)
router.put('/:eventId', requireSessionUser, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { title, startDate, endDate, recurring, recurrence, color } = req.body || {};
        const recurringVal = (recurrence !== undefined && recurrence !== null) ? recurrence : recurring;
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        if (!title || !startDate || !endDate || !color) return res.status(400).json({ error: 'Missing required fields' });
        const updated = await eventQueries.updateEvent(pool, eventId, uid, title, startDate, endDate, recurringVal, color);
        if (!updated) return res.status(404).json({ error: 'not found or not permitted' });
        return res.json({ event: updated });
    } catch (err) {
        console.error('PUT /api/events/:eventId error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// List events for the current session user
router.get('/', requireSessionUser, async (req, res) => {
    try {
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        const rows = await eventQueries.fetchEventsByUserID(pool, uid);
        // Map DB rows to frontend-friendly event objects, including invite status
        const events = (rows || []).map(r => ({
            id: r.id,
            title: r.title,
            owner_id: r.owner_id,
            start_time: r.start_time,
            end_time: r.end_time,
            colour: r.colour,
            recurrence: r.recurrence || null,
            // attendee status for the current user, if any
            attendee_id: r.attendee_id || null,
            attendee_status_id: r.attendee_status_id || null,
            attendee_status_name: r.attendee_status_name || null,
            inviter_first_name: r.inviter_first_name || null,
            inviter_last_name: r.inviter_last_name || null,
            // mark invited vs owned for calendar styling
            is_invited: String(r.owner_id) !== String(uid),
        }));
        return res.json({ events });
    } catch (err) {
        console.error('GET /api/events error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// List event invites for the current session user (defaults to pending only)
router.get('/invites', requireSessionUser, async (req, res) => {
    try {
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        // optionally accept a comma-separated list of status ids, e.g. "1,2,3"
        const statusParam = req.query.statuses;
        let statuses = [1];
        if (statusParam) {
            statuses = String(statusParam)
                .split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => !isNaN(n));
            if (!statuses.length) statuses = [1];
        }

        const rows = await fetchEventInvitesByUserID(pool, uid, statuses);
        const invites = (rows || []).map(r => ({
            id: r.id,
            event_id: r.event_id,
            user_id: r.user_id,
            role_id: r.role_id,
            status_id: r.status_id,
            status_name: r.status_name,
            invited_by: r.invited_by,
            invited_by_first_name: r.invited_by_first_name,
            invited_by_last_name: r.invited_by_last_name,
            invited_at: r.invited_at,
            responded_at: r.responded_at,
            event_title: r.event_title,
            event_location: r.event_location,
            start_time: r.start_time,
            end_time: r.end_time,
        }));
        return res.json({ invites });
    } catch (err) {
        console.error('GET /api/events/invites error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Find availability for a list of users
router.post('/availability', requireSessionUser, async (req, res) => {
    try {
        const { attendees, durationMinutes, rangeStart, rangeEnd } = req.body || {};
        // attendees: array of user ids (strings or numbers)
        // include the requester as well
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        const userIds = Array.isArray(attendees) ? [...new Set(attendees.map(String))] : [];
        if (!userIds.includes(uid)) userIds.push(uid);

        const dur = Number(durationMinutes || 30);
        if (!dur || dur <= 0) return res.status(400).json({ error: 'durationMinutes required and must be > 0' });

        const start = rangeStart ? new Date(rangeStart) : new Date();
        const end = rangeEnd ? new Date(rangeEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return res.status(400).json({ error: 'invalid range' });

        // fetch busy intervals for all users
        const busy = await getBusyIntervalsForUsers(pool, userIds, start.toISOString().slice(0,19).replace('T',' '), end.toISOString().slice(0,19).replace('T',' '));

        // Build busy intervals per user by querying each user's busy times (we already fetched combined busy intervals above),
        // but to implement per-user free windows we will fetch per-user sets as well.
        const perUserBusy = {};
        for (const u of userIds) perUserBusy[u] = [];

        // We'll run smaller queries to fetch per-user busy times to allow per-user merging
        for (const u of userIds) {
            const rows = await pool.query(
                `SELECT DISTINCT e.start_time AS start_time, e.end_time AS end_time
                 FROM event e
                 LEFT JOIN event_attendee ea ON e.event_id = ea.event_id
                 WHERE (e.owner_id = ? OR ea.user_id = ?) AND NOT (e.end_time <= ? OR e.start_time >= ?)`,
                [u, u, start.toISOString().slice(0,19).replace('T',' '), end.toISOString().slice(0,19).replace('T',' ')]
            );
            // rows is [rows, fields] from mysql2 when using pool.query; normalize
            const rowset = Array.isArray(rows[0]) ? rows[0] : rows;
            perUserBusy[u] = (rowset || []).map(r => ({ start: new Date(r.start_time), end: new Date(r.end_time) }));
        }

        // helper to merge intervals
        const mergeIntervals = (intervals) => {
            if (!intervals || !intervals.length) return [];
            const arr = intervals.slice().sort((a,b) => new Date(a.start) - new Date(b.start));
            const out = [];
            let cur = { start: new Date(arr[0].start), end: new Date(arr[0].end) };
            for (let i = 1; i < arr.length; i++) {
                const it = { start: new Date(arr[i].start), end: new Date(arr[i].end) };
                if (it.start <= cur.end) {
                    if (it.end > cur.end) cur.end = it.end;
                } else {
                    out.push(cur);
                    cur = it;
                }
            }
            out.push(cur);
            return out;
        };

        // compute per-user free intervals within [start,end]
        const perUserFree = {};
        for (const u of userIds) {
            const merged = mergeIntervals(perUserBusy[u]);
            const free = [];
            let cursor = new Date(start);
            for (const b of merged) {
                if (b.start > cursor) free.push({ start: new Date(cursor), end: new Date(b.start) });
                if (b.end > cursor) cursor = new Date(b.end);
            }
            if (cursor < end) free.push({ start: new Date(cursor), end: new Date(end) });
            perUserFree[u] = free;
        }

        // intersect free windows across all users
        const intersectTwoLists = (a, b) => {
            const out = [];
            let i=0,j=0;
            while (i < a.length && j < b.length) {
                const s = new Date(Math.max(a[i].start, b[j].start));
                const e = new Date(Math.min(a[i].end, b[j].end));
                if (s < e) out.push({ start: s, end: e });
                if (a[i].end < b[j].end) i++; else j++;
            }
            return out;
        };

        // start with first user's free list
        const users = Object.keys(perUserFree);
        let common = perUserFree[users[0]] || [];
        for (let k = 1; k < users.length; k++) {
            common = intersectTwoLists(common, perUserFree[users[k]] || []);
            if (!common.length) break;
        }

        // filter for duration
        const durMs = dur * 60 * 1000;
        const slots = [];
        for (const c of common) {
            const slotLen = c.end.getTime() - c.start.getTime();
            if (slotLen >= durMs) {
                // add earliest possible occurrences within that free window (we can also split into multiple slots)
                slots.push({ start: c.start.toISOString(), end: new Date(c.start.getTime() + durMs).toISOString() });
            }
        }

        return res.json({ slots });
    } catch (err) {
        console.error('POST /api/events/availability error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// List deleted events (trash) for current user
router.get('/trash', requireSessionUser, async (req, res) => {
    try {
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        const rows = await eventQueries.fetchDeletedEventsByUserID(pool, uid);
        const events = (rows || []).map(r => ({
            id: r.id,
            title: r.title,
            start_time: r.start_time,
            end_time: r.end_time,
            colour: r.colour,
            recurrence: r.recurrence || null,
            deleted_at: r.deleted_at
        }));
        return res.json({ events });
    } catch (err) {
        console.error('GET /api/events/trash error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Soft-delete an event (mark deleted_at). Only owner may delete.
router.delete('/:eventId', requireSessionUser, async (req, res) => {
    try {
        const { eventId } = req.params;
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        const ok = await eventQueries.softDeleteEvent(pool, eventId, uid);
        if (!ok) return res.status(404).json({ error: 'not found or already deleted' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/events/:eventId error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Restore a soft-deleted event (only if not older than 30 days)
router.post('/:eventId/restore', requireSessionUser, async (req, res) => {
    try {
        const { eventId } = req.params;
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        const result = await eventQueries.restoreEvent(pool, eventId, uid, 30);
        if (!result.ok) {
            if (result.reason === 'too_old') return res.status(410).json({ error: 'cannot restore, too old' });
            if (result.reason === 'not_deleted') return res.status(400).json({ error: 'event is not deleted' });
            return res.status(404).json({ error: 'not found' });
        }
        return res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/events/:eventId/restore error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Purge old deleted events (permanently). This is intended for admin/cron use.
router.post('/purge-old', async (req, res) => {
    try {
        // optional safeguard: require ADMIN_SECRET env var to be sent
        const secret = process.env.ADMIN_SECRET || null;
        if (secret) {
            const provided = req.headers['x-admin-secret'] || req.body && req.body.adminSecret;
            if (!provided || String(provided) !== String(secret)) return res.status(403).json({ error: 'forbidden' });
        }
        const days = Number(req.body && req.body.days) || 30;
        const deleted = await eventQueries.purgeOldDeletedEvents(pool, days);
        return res.json({ deleted });
    } catch (err) {
        console.error('POST /api/events/purge-old error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Respond to an event invite (update status_id for the attendee row)
// Expected body: { status_id: number } where 1=pending, 2=going, 3=maybe, 4=not going
router.post('/invites/:eventAttendeeId/respond', requireSessionUser, async (req, res) => {
    try {
        const { eventAttendeeId } = req.params;
        const { status_id } = req.body || {};
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

        if (!eventAttendeeId) return res.status(400).json({ error: 'eventAttendeeId required' });
        const newStatus = parseInt(status_id, 10);
        if (![1, 2, 3, 4].includes(newStatus)) {
            return res.status(400).json({ error: 'invalid status_id' });
        }

        const ok = await respondToEventInvite(pool, eventAttendeeId, uid, newStatus);
        if (!ok) return res.status(404).json({ error: 'invite not found or not permitted' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/events/invites/:eventAttendeeId/respond error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Check conflicts for a candidate interval for a set of users (preflight)
router.post('/check-conflicts', requireSessionUser, async (req, res) => {
    try {
        const { attendees, startDate, endDate } = req.body || {};
        if (!Array.isArray(attendees) || attendees.length === 0) return res.status(400).json({ error: 'attendees required' });
        if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });

        const inviteeIds = attendees.map(String);
        const conflicts = await checkUsersBusyForInterval(pool, inviteeIds, startDate, endDate);
        return res.json({ conflicts });
    } catch (err) {
        console.error('POST /api/events/check-conflicts error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});
module.exports = router;