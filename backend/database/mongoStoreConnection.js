const MongoStore = require('connect-mongo');

require('dotenv').config();

const mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`,
    crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
    },
    touchAfter: 24 * 3600
})

module.exports = mongoStore;