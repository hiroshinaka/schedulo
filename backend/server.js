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
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  }
}));

app.use((req, res, next) => {
  res.locals.username = req.session?.username;
  res.locals.userId = req.session?.userId;
  res.locals.authenticated = req.session?.authenticated;
  res.locals.email = req.session?.email;
  next();
});

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res) => {
    res.status(404).send('404 Not Found');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});