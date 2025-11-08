require('./utils.js');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

//Database connections
const {database} = include('database/sqlConnections.js');
const dbUtils = include('database/db_utils.js');
const success = dbUtils.printMySQLVersion();

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
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://kit.fontawesome.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://kit.fontawesome.com https://ka-f.fontawesome.com; " +
        "img-src 'self' data: https: http:; " +
        "font-src 'self' https://kit.fontawesome.com https://cdn.jsdelivr.net https://ka-f.fontawesome.com; " +
        "connect-src 'self' https://kit.fontawesome.com https://ka-f.fontawesome.com; " +
        "frame-src 'none';"
    );
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: node_session_secret,
    resave: true,
    saveUninitialized: true,
    store: mongoStore
}));

//To be Replaced with 404.ejs
app.get('*', (req, res) => {
    res.status(404).send('404 Not Found');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});