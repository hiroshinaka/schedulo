require('./utils.js');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRouter = require('./routes/api.js');
//Database connections
const {database} = include('database/sqlConnections.js');
const dbUtils = include('database/db_utils.js');
const success = dbUtils.printMySQLVersion();
const cors = require('cors');
const mongoStore = require('./database/mongoStoreConnection.js');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


const allowedOrigins = [
  'https://schedulo-two.vercel.app',
  'http://localhost:3000',
];

if (process.env.FRONTEND_ORIGIN) {
  allowedOrigins.push(process.env.FRONTEND_ORIGIN);
}
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

if (isProduction) {
  // allow secure cookies when running behind a proxy (e.g., Vercel)
  app.set('trust proxy', 1);
}

// Determine if THIS REQUEST is cross-site by checking where it's coming from
// Get the origin of the request to decide cookie settings dynamically
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
  }
}));

// Middleware to set cookie security based on request origin
app.use((req, res, next) => {
  const origin = req.get('origin');
  const isCrossSiteRequest = origin && !origin.includes('localhost');
  
  if (isCrossSiteRequest) {
    // Production: cross-site (Vercel to Render)
    req.session.cookie.sameSite = 'none';
    req.session.cookie.secure = true;
  } else {
    // Development: localhost (same-site or local)
    req.session.cookie.sameSite = 'lax';
    req.session.cookie.secure = false;
  }
  
  next();
});

app.use((req, res, next) => {
  res.locals.username = req.session?.username;
  res.locals.userId = req.session?.userId;
  res.locals.authenticated = req.session?.authenticated;
  res.locals.email = req.session?.email;
  next();
});

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/test-session', (req, res) => {
  if (!req.session.counter) {
    req.session.counter = 1;
  } else {
    req.session.counter += 1;
  }

  req.session.save((err) => {
    console.log('test-session save cb; err =', err);
    console.log('sessionID:', req.sessionID, 'session:', req.session);
    if (err) {
      return res.status(500).json({ ok: false, message: 'session save error' });
    }
    res.json({ ok: true, counter: req.session.counter });
  });
});

app.use((req, res) => {
    res.status(404).send('404 Not Found');
});




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});