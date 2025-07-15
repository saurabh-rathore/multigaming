const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('snake-scores.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS scores (player TEXT, score INTEGER)");
});

module.exports = db;
