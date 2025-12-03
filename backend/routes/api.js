const express = require('express');
const router = express.Router();

let pool;
try {
  pool = require('../database/sqlConnections.js');
  if (!pool) {
    console.error('ERROR: pool is not defined or is null');
    throw new Error('Database pool initialization failed');
  }
  if (!pool.query) {
    console.error('ERROR: pool.query is not a function');
    throw new Error('Database pool does not have query method');
  }
  console.log('Database pool loaded successfully in api.js');
} catch (err) {
  console.error('FATAL: Failed to load database pool in api.js:', err.message);
  console.error(err.stack);
  throw err;
}

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const bcrypt = require('bcrypt');
const joi = require('joi');
const { ok } = require('assert');
const saltRounds = 10;
const initFirebaseAdmin = require('../database/firebaseAdmin');

let chatRouter, eventsRouter, friendsRouter, profileRouter;
try {
  chatRouter = require('./chat');
  console.log('Chat router loaded successfully');
} catch (err) {
  console.error('ERROR loading chat router:', err.message);
  throw err;
}
try {
  eventsRouter = require('./events');
  console.log('Events router loaded successfully');
} catch (err) {
  console.error('ERROR loading events router:', err.message);
  throw err;
}
try {
  friendsRouter = require('./friends');
  console.log('Friends router loaded successfully');
} catch (err) {
  console.error('ERROR loading friends router:', err.message);
  throw err;
}
try {
  profileRouter = require('./profile');
  console.log('Profile router loaded successfully');
} catch (err) {
  console.error('ERROR loading profile router:', err.message);
  throw err;
}

//Database Queries imports
const { createUser, getUserByEmail } = require('../database/dbQueries/userQueries.js');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Return current session user
router.get('/me', (req, res) => {
    // Prevent caching so auth state is always fresh
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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
            image_url: user.image_url,
        };
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ ok: false, message: 'Failed to save session' });
            }
            res.json({ ok: true, message: 'User logged in successfully' });
        });
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