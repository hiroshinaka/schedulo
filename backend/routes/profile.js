const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });

let pool;
try {
  pool = require('../database/sqlConnections.js');
} catch (err) {
  console.error('ERROR: Failed to load database pool in profile.js:', err.message);
  throw err;
}

const friendsQueries = require('../database/dbQueries/friendsQueries.js');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function requireSessionUser(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

router.get('/me', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const [userRows] = await pool.query(
            'SELECT user_id AS id, first_name, last_name, email, image_url FROM `user` WHERE user_id = ?',
            [userId]
        );

        if (!userRows.length) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        return res.json({ 
            ok: true, 
            user: userRows[0]
        });
    } catch (err) {
        console.error('GET /api/profile/me error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/avatar', requireSessionUser, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        if (!req.file) {
            return res.status(400).json({ ok: false, message: 'No file uploaded' });
        }

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'schedulo_avatars', resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        const imageUrl = result.secure_url;

        await pool.query(
            'UPDATE `user` SET image_url = ? WHERE user_id = ?',
            [imageUrl, userId]
        );

        const [userRows] = await pool.query(
            'SELECT user_id AS id, first_name, last_name, email, image_url FROM `user` WHERE user_id = ?',
            [userId]
        );

        if (userRows.length) {
            req.session.user = {
                ...req.session.user,
                image_url: imageUrl
            };
        }

        return res.json({ 
            ok: true, 
            message: 'Avatar uploaded successfully',
            user: userRows[0]
        });
    } catch (err) {
        console.error('POST /api/profile/avatar error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.get('/search-users', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const q = String(req.query.q || '').trim();
        
        if (!q) {
            return res.json({ ok: true, users: [] });
        }
        
        const users = await friendsQueries.searchUsers(pool, q, 10, userId);
        return res.json({ ok: true, users });
    } catch (err) {
        console.error('GET /api/profile/search-users error', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            sql: err.sql
        });
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/friends', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const friends = await friendsQueries.getFriends(pool, userId);
        return res.json({ ok: true, friends });
    } catch (err) {
        console.error('GET /api/profile/friends error', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            sql: err.sql
        });
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/friend-requests', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const pending = await friendsQueries.getPendingRequests(pool, userId);
        const sent = await friendsQueries.getSentRequests(pool, userId);
        return res.json({ ok: true, pending, sent });
    } catch (err) {
        console.error('GET /api/profile/friend-requests error', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            sql: err.sql
        });
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/send-friend-request', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { receiverId } = req.body;
        
        if (!receiverId || receiverId == userId) {
            return res.status(400).json({ ok: false, message: 'Invalid receiver' });
        }
        
        const existingRequest = await friendsQueries.checkExistingRequest(pool, userId, receiverId);
        if (existingRequest) {
            return res.status(409).json({ ok: false, message: 'Friend request already exists' });
        }
        
        const isFriend = await friendsQueries.checkFriendship(pool, userId, receiverId);
        if (isFriend) {
            return res.status(409).json({ ok: false, message: 'Already friends' });
        }
        
        await friendsQueries.createFriendRequest(pool, userId, receiverId);
        return res.json({ ok: true, message: 'Friend request sent' });
    } catch (err) {
        console.error('POST /api/profile/send-friend-request error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/accept-friend-request', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { requestId } = req.body;
        
        if (!requestId) {
            return res.status(400).json({ ok: false, message: 'Invalid request' });
        }
        
        const result = await friendsQueries.acceptFriendRequest(pool, requestId, userId);
        return res.json(result);
    } catch (err) {
        console.error('POST /api/profile/accept-friend-request error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/reject-friend-request', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { requestId } = req.body;
        
        if (!requestId) {
            return res.status(400).json({ ok: false, message: 'Invalid request' });
        }
        
        const result = await friendsQueries.rejectFriendRequest(pool, requestId, userId);
        return res.json(result);
    } catch (err) {
        console.error('POST /api/profile/reject-friend-request error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/cancel-friend-request', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { requestId } = req.body;
        
        if (!requestId) {
            return res.status(400).json({ ok: false, message: 'Invalid request' });
        }
        
        const result = await friendsQueries.cancelFriendRequest(pool, requestId, userId);
        return res.json(result);
    } catch (err) {
        console.error('POST /api/profile/cancel-friend-request error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/remove-friend', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ ok: false, message: 'Invalid friend' });
        }
        
        const result = await friendsQueries.removeFriend(pool, userId, friendId);
        return res.json(result);
    } catch (err) {
        console.error('POST /api/profile/remove-friend error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.get('/unread-requests-count', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const count = await friendsQueries.getUnreadRequestCount(pool, userId);
        return res.json({ ok: true, count });
    } catch (err) {
        console.error('GET /api/profile/unread-requests-count error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/mark-requests-read', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await friendsQueries.markRequestsAsRead(pool, userId);
        return res.json(result);
    } catch (err) {
        console.error('POST /api/profile/mark-requests-read error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
