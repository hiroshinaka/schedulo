let createEvent = async(pool, user_id, title, start_date, end_date, recurring, color) => {
    const [result] = await pool.query(
        `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, deleted_at, created_at, updated_at)
        VALUES (?, ?, '', ?, ?, ?, NULL, NOW(), NOW());`,
        [user_id, title, start_date, end_date, color]);
    const insertId = result.insertId;
    const [rows] = await pool.query(
        'SELECT event_id AS id, owner_id, title, location, start_time, end_time, colour, deleted_at, created_at, updated_at FROM event WHERE event_id = ?',
        [insertId]
    );
    if (!rows.length) {
        throw new Error('Failed to retrieve created event');
    }
    return rows[0];
};

// Create an event and insert attendee rows (owner + invited) inside a transaction
let createEventWithAttendees = async(pool, owner_id, title, start_date, end_date, recurring, color, attendees = []) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO event (owner_id, title, location, start_time, end_time, colour, deleted_at, created_at, updated_at)
            VALUES (?, ?, '', ?, ?, ?, NULL, NOW(), NOW());`,
            [owner_id, title, start_date, end_date, color]
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
            'SELECT event_id AS id, owner_id, title, location, start_time, end_time, colour, deleted_at, created_at, updated_at FROM event WHERE event_id = ?',
            [eventId]
        );
        const eventRow = rows[0];
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
        `SELECT e.event_id AS id, e.owner_id, e.title, e.location, e.start_time, e.end_time, e.colour, e.deleted_at, e.created_at, e.updated_at FROM event e
        WHERE e.owner_id = ?`,
        [user_id]

    );
    return rows;
};

module.exports = {createEvent, createEventWithAttendees, inviteFriendsToEvent, fetchEventsByUserID};