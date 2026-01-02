const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const dbPath = path.join(__dirname, 'queue.db');
const db = new Database(dbPath);

// Initialize Tables
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS result_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            retries INTEGER DEFAULT 0,
            last_error TEXT
        );
    `);
    logger.info('Database initialized successfully.');
} catch (err) {
    logger.error('Failed to initialize database: ' + err.message);
}

module.exports = {
    getDb: () => db,

    addToQueue: (payload) => {
        const stmt = db.prepare('INSERT INTO result_queue (payload) VALUES (?)');
        return stmt.run(JSON.stringify(payload));
    },

    getNextBatch: (limit = 10) => {
        const stmt = db.prepare("SELECT * FROM result_queue WHERE status = 'PENDING' LIMIT ?");
        return stmt.all(limit);
    },

    markComplete: (id) => {
        const stmt = db.prepare("UPDATE result_queue SET status = 'COMPLETED' WHERE id = ?");
        return stmt.run(id);
    },

    markFailed: (id, error) => {
        const stmt = db.prepare("UPDATE result_queue SET retries = retries + 1, last_error = ? WHERE id = ?");
        return stmt.run(error, id);
    }
};
