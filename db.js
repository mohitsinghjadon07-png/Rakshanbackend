const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "raksha.db");

const db = new Database(databasePath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Improve reliability/performance
db.pragma("journal_mode = WAL");

console.log("Raksha SQLite database connected.");

module.exports = db;