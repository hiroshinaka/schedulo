const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const pool = require('../database/sqlConnections.js');

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

// Get profile data for logged-in user
router.get('/me', requireSessionUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Fetch user data
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

// Upload avatar
router.post('/avatar', requireSessionUser, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        if (!req.file) {
            return res.status(400).json({ ok: false, message: 'No file uploaded' });
        }

        // Upload to Cloudinary
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

        // Update user's image_url in database
        await pool.query(
            'UPDATE `user` SET image_url = ? WHERE user_id = ?',
            [imageUrl, userId]
        );

        // Fetch updated user data
        const [userRows] = await pool.query(
            'SELECT user_id AS id, first_name, last_name, email, image_url FROM `user` WHERE user_id = ?',
            [userId]
        );

        if (userRows.length) {
            // Update session
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

module.exports = router;
