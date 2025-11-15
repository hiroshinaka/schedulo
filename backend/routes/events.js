const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js');
const eventQueries = require('../database/dbQueries/eventsQueries.js');

function requireSessionUser(req, res, next) {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'unauthenticated' });
    next();
}

// Create an event (owner = current user)
router.post('/', requireSessionUser, async (req, res) => {
    try {
        const { title, startDate, endDate, recurring, color } = req.body || {};
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

        if (!title || !startDate || !endDate || !color) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const event = await eventQueries.createEvent(pool, uid, title, startDate, endDate, recurring, color);
        return res.json({ event });
    } catch (err) {
        console.error('POST /api/events error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// Create event and invite attendees in one request
router.post('/invite', requireSessionUser, async (req, res) => {
    try {
        const { title, startDate, endDate, recurring, color, attendees } = req.body || {};
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);

        if (!title || !startDate || !endDate || !color) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // attendees expected as array of user ids
        const event = await eventQueries.createEventWithAttendees(pool, uid, title, startDate, endDate, recurring, color, attendees || []);
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

        await eventQueries.inviteFriendsToEvent(pool, eventId, uid, attendees);
        return res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/events/:eventId/invite error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});

// List events for the current session user
router.get('/', requireSessionUser, async (req, res) => {
    try {
        const uid = String(req.session.user.id || req.session.user.uid || req.session.user.email);
        const rows = await eventQueries.fetchEventsByUserID(pool, uid);
        // Map DB rows to frontend-friendly event objects
        const events = (rows || []).map(r => ({
            id: r.id,
            title: r.title,
            owner_id: r.owner_id,
            owner_first_name: r.owner_first_name,
            owner_last_name: r.owner_last_name,
            start_time: r.start_time,
            end_time: r.end_time,
            colour: r.colour,
            attendance_status: r.attendance_status,
        }));
        return res.json({ events });
    } catch (err) {
        console.error('GET /api/events error', err);
        res.status(500).json({ error: err.message || 'server error' });
    }
});
module.exports = router;