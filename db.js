const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

// Initialize tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('user', 'manager')) NOT NULL,
      approved INTEGER DEFAULT 0 CHECK(approved IN (0, 1))
    )
  `);
});

module.exports = db;