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

// Log environment variable status for debugging
console.log('MongoDB Config Check:');
console.log('MONGODB_USER:', mongodb_user ? 'SET' : 'MISSING');
console.log('MONGODB_PASSWORD:', mongodb_password ? 'SET' : 'MISSING');
console.log('MONGODB_HOST:', mongodb_host ? 'SET' : 'MISSING');
console.log('MONGODB_DATABASE:', mongodb_database ? 'SET' : 'MISSING');

if (!mongodb_user || !mongodb_password || !mongodb_host || !mongodb_database) {
    console.error('ERROR: Missing required MongoDB environment variables');
    process.exit(1);
}

const mongoUrl = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`;

const mongoStore = MongoStore.create({
    mongoUrl: mongoUrl,
    crypto: {
        secret: mongodb_session_secret
    }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


const allowedOrigins = [
  'https://schedulo-two.vercel.app',
  'http://localhost:3000',
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


app.use(session({
    secret: node_session_secret,
    resave: false,
    saveUninitialized: false,
    store: mongoStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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