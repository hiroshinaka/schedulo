const database = require('./sqlConnections');

async function printMySQLVersion() {
	let sqlQuery = `
		SHOW VARIABLES LIKE 'version';
	`;
	let sqlName =`SELECT DATABASE() AS CurrentDatabaseName;`
	
	try {
		const results = await database.query(sqlQuery);
		const dbName = await database.query(sqlName);
		console.log("Successfully connected to MySQL");
		console.log(results[0]);
		console.log(dbName[0]);
		return true;
	}
	catch(err) {
		console.log("Error getting version from MySQL");
        console.log(err);
		return false;
	}
}

module.exports = {printMySQLVersion};