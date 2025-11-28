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

app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';
const sessionOptions = {
  secret: process.env.NODE_SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (mongoStore) sessionOptions.store = mongoStore;

app.use(session(sessionOptions));

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res) => {
    res.status(404).send('404 Not Found');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});