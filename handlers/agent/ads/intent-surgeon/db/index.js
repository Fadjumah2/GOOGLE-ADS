const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'learned_negatives.sqlite');

let db;

function connectDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database:', err.message);
        reject(err);
      } else {
        console.log('Connected to the SQLite database.');
        resolve();
      }
    });
  });
}

async function initDb() {
  await connectDb();
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS learned_negatives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL UNIQUE,
        campaign_id TEXT,
        ad_group_id TEXT,
        match_type TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating learned_negatives table:', err.message);
        reject(err);
      } else {
        console.log('Table "learned_negatives" ensured.');
        resolve();
      }
    });
  });
}

function closeDb() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing the SQLite database:', err.message);
      } else {
        console.log('Closed the SQLite database connection.');
      }
    });
  }
}

// Example usage (for testing purposes during development)
// async function runExample() {
//   await initDb();
//   // Example: Insert a negative keyword
//   db.run(`INSERT OR IGNORE INTO learned_negatives (keyword, campaign_id, match_type) VALUES (?, ?, ?)`,
//     ['unwanted keyword', '12345', 'EXACT'],
//     function(err) {
//       if (err) {
//         return console.log(err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     });
//   // Example: Query all negative keywords
//   db.all("SELECT * FROM learned_negatives", [], (err, rows) => {
//     if (err) {
//       throw err;
//     }
//     console.log(rows);
//   });
//   closeDb();
// }

// runExample();

module.exports = {
  initDb,
  closeDb,
  getDb: () => db // Expose the database instance
};
