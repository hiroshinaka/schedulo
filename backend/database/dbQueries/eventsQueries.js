let createEvent = async(pool, user_id, title, start_date, end_date, recurring, color) => {
    const [result] = await pool.query(
        `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, recurring, deleted_at, created_at, updated_at)
        VALUES (?, ?, '', ?, ?, ?, ?, NULL, NOW(), NOW());`,
        [user_id, title, start_date, end_date, color, (recurring && recurring !== '') ? recurring : null]);
    const insertId = result.insertId;
    const [rows] = await pool.query(
        'SELECT event_id AS id, owner_id, title, location, start_time, end_time, colour, recurring AS recurrence, deleted_at, created_at, updated_at FROM event WHERE event_id = ?',
        [insertId]
    );
    if (!rows.length) {
        throw new Error('Failed to retrieve created event');
    }
    // Attach recurrence info passed in (if DB doesn't yet store it)
    const row = rows[0];
    if (recurring) row.recurrence = recurring;
    return row;
};

// Create an event and insert attendee rows (owner + invited) inside a transaction
let createEventWithAttendees = async(pool, owner_id, title, start_date, end_date, recurring, color, attendees = []) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, recurring, deleted_at, created_at, updated_at)
            VALUES (?, ?, '', ?, ?, ?, ?, NULL, NOW(), NOW());`,
            [owner_id, title, start_date, end_date, color, (recurring && recurring !== '') ? recurring : null]
        );
        const eventId = result.insertId;

        // Insert owner as attendee with role 'owner' and status 'going'
        await conn.query(
            `INSERT INTO event_attendee (event_id, user_id, role, status, invited_by, invited_at, responded_at)
            VALUES (?, ?, 'owner', 'going', ?, NOW(), NULL)`,
            [eventId, owner_id, owner_id]
        );

        // Insert invited attendees (role 'guest', status 'pending')
        if (Array.isArray(attendees) && attendees.length) {
            const insertPromises = [];
            for (const a of attendees) {
                // avoid inserting owner again
                if (String(a) === String(owner_id)) continue;
                insertPromises.push(
                    conn.query(
                        `INSERT INTO event_attendee (event_id, user_id, role, status, invited_by, invited_at)
                        VALUES (?, ?, 'guest', 'pending', ?, NOW())`,
                        [eventId, a, owner_id]
                    )
                );
            }
            if (insertPromises.length) await Promise.all(insertPromises);
        }

        await conn.commit();

        // fetch and return created event row
        const [rows] = await pool.query(
            'SELECT event_id AS id, owner_id, title, location, start_time, end_time, colour, recurring AS recurrence, deleted_at, created_at, updated_at FROM event WHERE event_id = ?',
            [eventId]
        );
        const eventRow = rows[0];
        if (recurring) eventRow.recurrence = recurring;
        return eventRow;
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ignore */ }
        throw err;
    } finally {
        conn.release();
    }
};

let inviteFriendsToEvent =  async(pool, eventId, inviterId, attendees = []) => {
    // Insert attendees for an existing event (inviter included as owner if needed)
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Ensure owner row exists (upsert-like): attempt insert owner if not exists
        await conn.query(
            `INSERT IGNORE INTO event_attendee (event_id, user_id, role, status, invited_by, invited_at)
            VALUES (?, ?, 'owner', 'going', ?, NOW())`,
            [eventId, inviterId, inviterId]
        );

        if (Array.isArray(attendees) && attendees.length) {
            const insertPromises = [];
            for (const a of attendees) {
                if (String(a) === String(inviterId)) continue;
                insertPromises.push(
                    conn.query(
                        `INSERT IGNORE INTO event_attendee (event_id, user_id, role, status, invited_by, invited_at)
                        VALUES (?, ?, 'guest', 'pending', ?, NOW())`,
                        [eventId, a, inviterId]
                    )
                );
            }
            if (insertPromises.length) await Promise.all(insertPromises);
        }

        await conn.commit();
        return true;
    } catch (err) {
        try { await conn.rollback(); } catch (e) { }
        throw err;
    } finally {
        conn.release();
    }
};

let fetchEventsByUserID = async (pool, user_id) => {
    const [rows] = await pool.query(
        `SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, e.recurring AS recurrence, e.deleted_at, e.created_at, e.updated_at FROM event e
        WHERE e.owner_id = ?`,
        [user_id]

    );
    return rows;
};

// Fetch busy intervals (start_time, end_time) for any of the given user IDs within a time range
let getBusyIntervalsForUsers = async (pool, userIds = [], rangeStart, rangeEnd) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    // build placeholders for IN clause
    const ownerPlaceholders = userIds.map(() => '?').join(',');
    const attendeePlaceholders = userIds.map(() => '?').join(',');

    const sql = `SELECT DISTINCT e.start_time AS start_time, e.end_time AS end_time
        FROM event e
        LEFT JOIN event_attendee ea ON e.event_id = ea.event_id
        WHERE (e.owner_id IN (${ownerPlaceholders}) OR ea.user_id IN (${attendeePlaceholders}))
          AND NOT (e.end_time <= ? OR e.start_time >= ?)`;

    const params = [...userIds, ...userIds, rangeStart, rangeEnd];
    const [rows] = await pool.query(sql, params);
    return rows.map(r => ({ start: r.start_time, end: r.end_time }));
};

// Check if any of the given users have busy occurrences overlapping a candidate interval
let checkUsersBusyForInterval = async (pool, userIds = [], candStart, candEnd) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    const conflicts = [];
    const startDate = new Date(candStart);
    const endDate = new Date(candEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return conflicts;

    // For each user, fetch their events (owner or attendee) that might be relevant
    for (const u of userIds) {
        const [rows] = await pool.query(
            `SELECT e.event_id AS event_id, e.start_time AS start_time, e.end_time AS end_time, e.recurring AS recurrence
             FROM event e
             LEFT JOIN event_attendee ea ON e.event_id = ea.event_id
             WHERE (e.owner_id = ? OR ea.user_id = ?) AND (e.end_time >= ? OR e.recurring IS NOT NULL)`,
            [u, u, startDate.toISOString().slice(0,19).replace('T',' ')]
        );

        const rowset = Array.isArray(rows[0]) ? rows[0] : rows;
        for (const r of rowset) {
            const evtStart = new Date(r.start_time);
            const evtEnd = new Date(r.end_time);
            const recurrence = r.recurrence || null;

            // if no recurrence, simple overlap test
            if (!recurrence) {
                if (!(evtEnd <= startDate || evtStart >= endDate)) {
                    conflicts.push({ userId: u, eventId: r.event_id, start: evtStart, end: evtEnd });
                }
                continue;
            }

            // recurrence exists: expand occurrences from original start until after candEnd
            const rule = String(recurrence).toLowerCase();
            const duration = evtEnd.getTime() - evtStart.getTime();
            // start cursor at original event start
            let cursor = new Date(evtStart);
            // fast-forward approximate to candStart
            if (cursor < startDate) {
                if (rule === 'daily') {
                    const days = Math.floor((startDate - cursor) / (24 * 60 * 60 * 1000));
                    cursor.setDate(cursor.getDate() + days);
                } else if (rule === 'weekly') {
                    const weeks = Math.floor((startDate - cursor) / (7 * 24 * 60 * 60 * 1000));
                    cursor.setDate(cursor.getDate() + weeks * 7);
                } else if (rule === 'monthly') {
                    const months = (startDate.getFullYear() - cursor.getFullYear()) * 12 + (startDate.getMonth() - cursor.getMonth());
                    cursor.setMonth(cursor.getMonth() + months);
                } else if (rule === 'yearly') {
                    const years = startDate.getFullYear() - cursor.getFullYear();
                    cursor.setFullYear(cursor.getFullYear() + years);
                }
            }

            // iterate occurrences until past candEnd or a safety limit
            let iter = 0; const maxIter = 500;
            while (cursor <= endDate && iter < maxIter) {
                const occStart = new Date(cursor);
                const occEnd = new Date(occStart.getTime() + duration);
                if (!(occEnd <= startDate || occStart >= endDate)) {
                    conflicts.push({ userId: u, eventId: r.event_id, start: occStart, end: occEnd });
                    break; // conflict found for this event/user
                }
                // advance cursor
                if (rule === 'daily') cursor.setDate(cursor.getDate() + 1);
                else if (rule === 'weekly') cursor.setDate(cursor.getDate() + 7);
                else if (rule === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
                else if (rule === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1);
                else break;
                iter++;
            }
        }
    }

    return conflicts;
};

module.exports = {createEvent, createEventWithAttendees, inviteFriendsToEvent, fetchEventsByUserID, getBusyIntervalsForUsers, checkUsersBusyForInterval};