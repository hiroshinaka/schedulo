require('./utils.js');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const apiRouter = require('./routes/api.js');
//Database connections
const {database} = include('database/sqlConnections.js');
const dbUtils = include('database/db_utils.js');
const success = dbUtils.printMySQLVersion();
const cors = require('cors');
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`,
    crypto: {
        secret: mongodb_session_secret
    }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Configure trusted proxy (needed when running behind a proxy like Render/Vercel)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Allowed origins should be provided as a comma-separated env var `FRONTEND_ORIGINS`.
// Example: FRONTEND_ORIGINS="https://your-vercel-app.vercel.app,http://localhost:3000"
const rawOrigins = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) {
            // No configured list — fall back to echoing the request origin.
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(session({
    secret: node_session_secret,
    resave: true,
    saveUninitialized: true,
    store: mongoStore,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    }
}));

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res) => {
    res.status(404).send('404 Not Found');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});