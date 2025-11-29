#!/usr/bin/env node
const pool = require('../database/sqlConnections.js');
const eventQueries = require('../database/dbQueries/eventsQueries.js');

async function run() {
  try {
    const days = Number(process.argv[2]) || 30;
    console.log(`Purging events deleted more than ${days} days ago...`);
    const deleted = await eventQueries.purgeOldDeletedEvents(pool, days);
    console.log(`Deleted ${deleted} events.`);
    process.exit(0);
  } catch (err) {
    console.error('Purge failed', err);
    process.exit(1);
  }
}

run();
