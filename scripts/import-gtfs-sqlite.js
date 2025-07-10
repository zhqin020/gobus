// 使用 sqlite3（异步）和 csv-parse 导入 GTFS txt 到 SQLite
// 依赖: npm install sqlite3 csv-parse
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const parse = require('csv-parse/sync').parse;

const GTFS_DIR = path.join(__dirname, '../data/google_transit');
const DB_PATH = path.join(__dirname, '../data/gtfs.sqlite');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack || err, '\nModule:', __filename);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION:', reason, '\nPromise:', p, '\nModule:', __filename);
  process.exit(1);
});

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function inferType(val) {
  if (val === undefined || val === null || val === '') return 'TEXT';
  if (!isNaN(Number(val))) return 'REAL';
  return 'TEXT';
}

function createTable(db, table, rows) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      resolve();
      return;
    }
    const columns = Object.keys(rows[0]);
    const types = columns.map(col => inferType(rows[0][col]));
    const sql = `CREATE TABLE IF NOT EXISTS ${table} (${columns.map((c, i) => `${c} ${types[i]}`).join(',')});`;
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function insertRows(db, table, rows) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      resolve();
      return;
    }
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(sql);
      for (const row of rows) {
        stmt.run(columns.map(c => row[c]));
      }
      stmt.finalize((err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
        } else {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) reject(commitErr);
            else resolve();
          });
        }
      });
    });
  });
}

async function importAll() {
  console.log('[GTFS Import] Starting import process');
  try {
    if (fs.existsSync(DB_PATH)) {
      console.log('[GTFS Import] Removing existing database file');
      try {
        fs.unlinkSync(DB_PATH);
      } catch (unlinkErr) {
        console.warn('[GTFS Import] Could not remove database file, it may be in use. Trying to continue...', unlinkErr);
      }
    }

    console.log('[GTFS Import] Creating new SQLite database');
    const db = new sqlite3.Database(DB_PATH);

    const files = fs.readdirSync(GTFS_DIR).filter(f => f.endsWith('.txt'));
    console.log(`[GTFS Import] Found ${files.length} GTFS files to import`);

    for (const file of files) {
      const table = file.replace('.txt', '');
      console.log(`[GTFS Import] Processing ${file} -> ${table}`);

      const rows = parseCsv(path.join(GTFS_DIR, file));
      if (!Array.isArray(rows) || rows.length === 0) {
        console.warn(`[GTFS Import] Skip ${file} - empty or invalid data`);
        continue;
      }

      console.log(`[GTFS Import] Creating table ${table}`);
      await createTable(db, table, rows);

      console.log(`[GTFS Import] Inserting ${rows.length} rows into ${table}`);
      await insertRows(db, table, rows);

      console.log(`[GTFS Import] Completed ${file} -> ${table} (${rows.length} rows)`);
    }

    db.close((err) => {
      if (err) {
        console.error('[GTFS Import] Error closing database:', err);
      } else {
        console.log('[GTFS Import] Successfully imported all GTFS tables to gtfs.sqlite');
      }
    });
  } catch (err) {
    console.error('[GTFS Import] Critical error during import:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  importAll();
}
