const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js')
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const bcrypt = require('bcrypt');
const joi = require('joi');
const { ok } = require('assert');
const saltRounds = 10;
const initFirebaseAdmin = require('../database/firebaseAdmin');
const chatRouter = require('./chat');
const eventsRouter = require('./events');
const friendsRouter = require('./friends');
const profileRouter = require('./profile');

//Database Queries imports
const { createUser, getUserByEmail } = require('../database/dbQueries/userQueries.js');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Return current session user
router.get('/me', (req, res) => {
    try {
        if (req.session && req.session.user) {
            return res.json({ ok: true, user: req.session.user });
        }
        return res.json({ ok: false });
    } catch (err) {
        console.error('/me error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error', err);
                return res.status(500).json({ ok: false, message: 'Logout failed' });
            }
            res.clearCookie('connect.sid');
            return res.json({ ok: true });
        });
    } catch (err) {
        console.error('/logout error', err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

router.post('/signup', async(req, res)=>{
    try{
        const {first_name, last_name, email, password} = req.body;

        if(!first_name || !last_name || !email || !password){
            return res.status(400).json({message: "All fields are required"});
        }

        const schema = joi.object({
            first_name: joi.string().max(50).required(),
            last_name: joi.string().max(50).required(),
            email: joi.string().email().max(100).required(),
            password: joi.string().min(10).max(100).pattern(
				new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"\\\\|,.<>/?]).+$')
			).required()			.messages({
				'string.pattern.base':
				'Password must include uppercase, lowercase, number, and special character.',
			}),
        });

        const {error} = schema.validate({first_name, last_name, email, password});
        if(error){
            return res.status(400).json({message: error.details[0].message});   
        }

        const existingUser = await getUserByEmail(pool, email);
		if (existingUser) {
			return res.status(409).json({ ok: false, message: 'Email already taken.' });
		}

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await createUser(pool, first_name, last_name, email, hashedPassword);
        res.json({ok: true, message: "User created successfully"});
    } catch(err){
        console.error(err);
        res.status(500).json({ok: false, message: err.message});
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('/api/login attempt for', email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and Password are required' });
        }

        const user = await getUserByEmail(pool, email);
        console.log('/api/login fetched user row:', !!user, user ? { id: user.id, email: user.email, hasPassword: !!user.password } : null);

        if (!user || !user.password) {
            console.warn('login failed - missing user or password hash for', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        let passwordMatch = false;
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
            console.log('bcrypt compare result for', email, passwordMatch);
        } catch (err) {
            console.error('bcrypt compare error', err);
            return res.status(500).json({ ok: false, message: 'Authentication error' });
        }

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        req.session.user = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        };
        res.json({ ok: true, message: 'User logged in successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// Issue a Firebase custom token for the currently authenticated session user
router.post('/firebase-token', async (req, res) => {
    try {
        if (!req.session || !req.session.user) return res.status(401).json({ ok: false, message: 'unauthenticated' });
        const admin = initFirebaseAdmin();
        const uid = String(req.session.user.id);
        const additionalClaims = { email: req.session.user.email };
        const token = await admin.auth().createCustomToken(uid, additionalClaims);
        return res.json({ ok: true, token });
    } catch (err) {
        console.error('Error creating firebase token', err);
        return res.status(500).json({ ok: false, message: 'token_error' });
    }
});

// Mount chat routes
router.use('/chats', chatRouter);
// Mount events routes
router.use('/events', eventsRouter);
// Mount friends
router.use('/friends', friendsRouter);
router.use('/profile', profileRouter);

module.exports = router;