const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = process.env.DB_PATH || './data/mora_shortlink.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createLinksTable = `
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        alias TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        image_url TEXT,
        ios_url TEXT,
        android_url TEXT,
        desktop_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        click_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        expires_at DATETIME
      )
    `;

    const createClicksTable = `
      CREATE TABLE IF NOT EXISTS clicks (
        id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        referer TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        browser TEXT,
        os TEXT,
        device_type TEXT,
        is_mobile BOOLEAN DEFAULT 0,
        country TEXT,
        city TEXT,
        FOREIGN KEY (alias) REFERENCES links (alias) ON DELETE CASCADE
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_links_alias ON links(alias)',
      'CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_clicks_alias ON clicks(alias)',
      'CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_clicks_ip ON clicks(ip)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create tables
        this.db.run(createLinksTable, (err) => {
          if (err) {
            console.error('Error creating links table:', err);
            reject(err);
            return;
          }
        });

        this.db.run(createClicksTable, (err) => {
          if (err) {
            console.error('Error creating clicks table:', err);
            reject(err);
            return;
          }
        });

        // Create indexes
        createIndexes.forEach(indexQuery => {
          this.db.run(indexQuery, (err) => {
            if (err) {
              console.error('Error creating index:', err);
            }
          });
        });

        console.log('Database tables created successfully');
        resolve();
      });
    });
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Backup database
  async backup(backupPath) {
    return new Promise((resolve, reject) => {
      const backup = this.db.backup(backupPath);
      backup.step(-1, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.finish((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // Database maintenance
  async vacuum() {
    return this.run('VACUUM');
  }

  async analyze() {
    return this.run('ANALYZE');
  }

  // Get database statistics
  async getStats() {
    const queries = [
      'SELECT COUNT(*) as count FROM links',
      'SELECT COUNT(*) as count FROM clicks',
      'SELECT COUNT(DISTINCT alias) as count FROM clicks',
      'SELECT COUNT(DISTINCT ip) as count FROM clicks'
    ];

    const [totalLinks, totalClicks, linksWithClicks, uniqueIPs] = await Promise.all(
      queries.map(query => this.get(query))
    );

    return {
      totalLinks: totalLinks.count,
      totalClicks: totalClicks.count,
      linksWithClicks: linksWithClicks.count,
      uniqueIPs: uniqueIPs.count
    };
  }
}

module.exports = Database;