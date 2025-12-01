let _resolveRecurringTypeId = async (pool, recurring) => {
    // recurring may be null, a numeric id, or a string name like 'daily'
    if (!recurring && recurring !== 0) return null;
    // numeric id
    if (!isNaN(Number(recurring))) return Number(recurring);
    // lookup by name
    const [rows] = await pool.query('SELECT recurring_type_id AS id FROM recurring_type WHERE name = ? LIMIT 1', [String(recurring)]);
    const set = Array.isArray(rows[0]) ? rows[0] : rows;
    if (set && set.length) return set[0].id;
    return null;
};

let createEvent = async(pool, user_id, title, start_date, end_date, recurring, color) => {
    const recurring_type_id = await _resolveRecurringTypeId(pool, recurring);
    const [result] = await pool.query(
        `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, recurring_type_id, deleted_at, created_at, updated_at)
        VALUES (?, ?, '', ?, ?, ?, ?, NULL, NOW(), NOW());`,
        [user_id, title, start_date, end_date, color, recurring_type_id]);
    const insertId = result.insertId;
    const [rows] = await pool.query(
        'SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, rt.name AS recurrence, e.deleted_at, e.created_at, e.updated_at FROM event e LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id WHERE e.event_id = ?',
        [insertId]
    );
    if (!rows.length) {
        throw new Error('Failed to retrieve created event');
    }
    // Attach recurrence info passed in (if DB doesn't yet store it)
    const row = rows[0];
    if (!row.recurrence && recurring) row.recurrence = recurring;
    return row;
};

// Create an event and insert attendee rows (owner + invited) inside a transaction
let createEventWithAttendees = async(pool, owner_id, title, start_date, end_date, recurring, color, attendees = []) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const recurring_type_id = await _resolveRecurringTypeId(pool, recurring);
        const [result] = await conn.query(
            `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, recurring_type_id, deleted_at, created_at, updated_at)
            VALUES (?, ?, '', ?, ?, ?, ?, NULL, NOW(), NOW());`,
            [owner_id, title, start_date, end_date, color, recurring_type_id]
        );
        const eventId = result.insertId;

        // Insert owner as attendee with role_id=1 (owner) and status_id=2 (going)
        await conn.query(
            `INSERT INTO event_attendee (event_id, user_id, role_id, status_id, invited_by, invited_at, responded_at)
            VALUES (?, ?, 1, 2, ?, NOW(), NULL)`,
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
                        `INSERT INTO event_attendee (event_id, user_id, role_id, status_id, invited_by, invited_at)
                        VALUES (?, ?, 2, 1, ?, NOW())`,
                        [eventId, a, owner_id]
                    )
                );
            }
            if (insertPromises.length) await Promise.all(insertPromises);
        }

        await conn.commit();

        // fetch and return created event row
        const [rows] = await pool.query(
            'SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, rt.name AS recurrence, e.deleted_at, e.created_at, e.updated_at FROM event e LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id WHERE e.event_id = ?',
            [eventId]
        );
        const eventRow = rows[0];
        if (!eventRow.recurrence && recurring) eventRow.recurrence = recurring;
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
            `INSERT IGNORE INTO event_attendee (event_id, user_id, role_id, status_id, invited_by, invited_at)
            VALUES (?, ?, 1, 2, ?, NOW())`,
            [eventId, inviterId, inviterId]
        );

        if (Array.isArray(attendees) && attendees.length) {
            const insertPromises = [];
            for (const a of attendees) {
                if (String(a) === String(inviterId)) continue;
                insertPromises.push(
                    conn.query(
                        `INSERT IGNORE INTO event_attendee (event_id, user_id, role_id, status_id, invited_by, invited_at)
                        VALUES (?, ?, 2, 1, ?, NOW())`,
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
    // Return events the user owns OR is attending (any status), excluding deleted,
    // and include the attendee status for the current user when present.
    const [rows] = await pool.query(
                `SELECT DISTINCT
                     e.event_id AS id,
                     e.owner_id,
                     e.title,
                     e.location,
                     e.start_time,
                     e.end_time,
                     e.colour,
                     rt.name AS recurrence,
                     e.deleted_at,
                     e.created_at,
                     e.updated_at,
                     ea.status_id AS attendee_status_id,
                     eas.status_name AS attendee_status_name,
                     ea.event_attendee_id AS attendee_id,
                     inv.first_name AS inviter_first_name,
                     inv.last_name AS inviter_last_name
                 FROM event e
                 LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id
                 LEFT JOIN event_attendee ea
                     ON e.event_id = ea.event_id AND ea.user_id = ?
                 LEFT JOIN event_attendee_status eas
                     ON ea.status_id = eas.status_id
                 LEFT JOIN user inv
                     ON ea.invited_by = inv.user_id
         WHERE e.deleted_at IS NULL
           AND (
             e.owner_id = ?
             OR ea.user_id = ?
           )`,
        [user_id, user_id, user_id]
    );
    return rows;
};

let fetchDeletedEventsByUserID = async (pool, user_id) => {
    const [rows] = await pool.query(
        `SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, rt.name AS recurrence, e.deleted_at, e.created_at, e.updated_at FROM event e LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id
        WHERE e.owner_id = ? AND e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC`,
        [user_id]
    );
    return rows;
};

// Fetch pending (or any status) event invites for a user, including basic event + inviter info
let fetchEventInvitesByUserID = async (pool, user_id, statuses = [1]) => {
    // statuses is an array of status_id values (1=pending, 2=going, 3=maybe, 4=not going, etc.)
    const statusPlaceholders = statuses.map(() => '?').join(',');
    const params = [user_id, ...statuses];

    const sql = `
        SELECT
            ea.event_attendee_id AS id,
            ea.event_id,
            ea.user_id,
            ea.role_id,
            ea.status_id,
            ea.invited_by,
            ea.invited_at,
            ea.responded_at,
            eas.status_name,
            e.title AS event_title,
            e.location AS event_location,
            e.start_time,
            e.end_time,
            inv.first_name AS invited_by_first_name,
            inv.last_name AS invited_by_last_name
        FROM event_attendee ea
        JOIN event e ON ea.event_id = e.event_id
        JOIN event_attendee_status eas ON ea.status_id = eas.status_id
        LEFT JOIN user inv ON ea.invited_by = inv.user_id
        WHERE ea.user_id = ?
          AND ea.status_id IN (${statusPlaceholders})
          AND e.deleted_at IS NULL
        ORDER BY ea.invited_at DESC
    `;

    const [rows] = await pool.query(sql, params);
    return rows;
};

// Update an invite's status (going/maybe/not going, etc.) for a specific attendee row
let respondToEventInvite = async (pool, eventAttendeeId, userId, newStatusId) => {
    // Only allow the invitee themselves to update their status
    const [res] = await pool.query(
        `UPDATE event_attendee
         SET status_id = ?, status = ?, responded_at = NOW()
         WHERE event_attendee_id = ? AND user_id = ?`,
        [newStatusId, newStatusId, eventAttendeeId, userId]
    );
    return res.affectedRows > 0;
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
                    AND NOT (e.end_time <= ? OR e.start_time >= ?) AND e.deleted_at IS NULL`;

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
               `SELECT e.event_id AS event_id, e.start_time AS start_time, e.end_time AS end_time, rt.name AS recurrence
                   FROM event e
                   LEFT JOIN event_attendee ea ON e.event_id = ea.event_id
                   LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id
                   WHERE (e.owner_id = ? OR ea.user_id = ?) AND (e.end_time >= ? OR e.recurring_type_id IS NOT NULL) AND e.deleted_at IS NULL`,
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

// Soft-delete an event (mark deleted_at). Only the owner may delete.
let softDeleteEvent = async (pool, eventId, ownerId) => {
    const [res] = await pool.query('UPDATE event SET deleted_at = NOW() WHERE event_id = ? AND owner_id = ? AND deleted_at IS NULL', [eventId, ownerId]);
    return res.affectedRows > 0;
};

// Restore a soft-deleted event if not older than `maxAgeDays` days
let restoreEvent = async (pool, eventId, ownerId, maxAgeDays = 30) => {
    // check deleted_at age
    const [rows] = await pool.query('SELECT deleted_at FROM event WHERE event_id = ? AND owner_id = ?', [eventId, ownerId]);
    const set = Array.isArray(rows[0]) ? rows[0] : rows;
    if (!set || !set.length) return { ok: false, reason: 'not_found' };
    const row = set[0];
    if (!row.deleted_at) return { ok: false, reason: 'not_deleted' };
    const deletedAt = new Date(row.deleted_at);
    const ageMs = Date.now() - deletedAt.getTime();
    const maxMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs > maxMs) return { ok: false, reason: 'too_old' };
    const [res] = await pool.query('UPDATE event SET deleted_at = NULL WHERE event_id = ? AND owner_id = ?', [eventId, ownerId]);
    return { ok: res.affectedRows > 0 };
};

// Permanently delete events that were soft-deleted more than `olderThanDays` days ago
let purgeOldDeletedEvents = async (pool, olderThanDays = 30) => {
    const [res] = await pool.query('DELETE FROM event WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL ? DAY)', [olderThanDays]);
    return res.affectedRows || 0;
};

// Update an event (owner only). Returns updated row or null.
let updateEvent = async (pool, eventId, ownerId, title, start_date, end_date, recurring, color) => {
    const recurring_type_id = await _resolveRecurringTypeId(pool, recurring);
    const [res] = await pool.query(
        `UPDATE event SET title = ?, start_time = ?, end_time = ?, colour = ?, recurring_type_id = ?, updated_at = NOW()
         WHERE event_id = ? AND owner_id = ? AND deleted_at IS NULL`,
        [title, start_date, end_date, color, recurring_type_id, eventId, ownerId]
    );
    if (!res.affectedRows) return null;
    const [rows] = await pool.query(
        'SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, rt.name AS recurrence, e.deleted_at, e.created_at, e.updated_at FROM event e LEFT JOIN recurring_type rt ON e.recurring_type_id = rt.recurring_type_id WHERE e.event_id = ?',
        [eventId]
    );
    return (rows && rows[0]) ? rows[0] : null;
};

module.exports = {
    createEvent,
    createEventWithAttendees,
    inviteFriendsToEvent,
    fetchEventsByUserID,
    getBusyIntervalsForUsers,
    checkUsersBusyForInterval,
    fetchDeletedEventsByUserID,
    softDeleteEvent,
    restoreEvent,
    purgeOldDeletedEvents,
    fetchEventInvitesByUserID,
    respondToEventInvite,
    updateEvent,
};