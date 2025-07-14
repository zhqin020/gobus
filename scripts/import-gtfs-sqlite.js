const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const parse = require('csv-parse/sync').parse;

const GTFS_DIR = path.join(__dirname, '../data/google_transit');
const DB_PATH = path.join(__dirname, '../data/gtfs.sqlite');
const LOCK_FILE = path.join(__dirname, '../data/import.lock');

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
  if (fs.existsSync(LOCK_FILE)) {
    console.log('[GTFS Import] Import already in progress. Exiting.');
    return;
  }
  try {
    fs.writeFileSync(LOCK_FILE, 'lock', { flag: 'wx' });
  } catch (err) {
    console.log('[GTFS Import] Could not create lock file, another import may be running. Exiting.');
    return;
  }

  console.log('[GTFS Import] Starting import process');
  try {
    const dbExists = fs.existsSync(DB_PATH);
    const db = new sqlite3.Database(DB_PATH);

    // Load version info
    let versionInfo = {};
    const versionFilePath = path.join(__dirname, '../data/gtfs_version.json');
    if (fs.existsSync(versionFilePath)) {
      try {
        versionInfo = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      } catch (e) {
        console.warn('[GTFS Import] Failed to parse version file, ignoring.');
      }
    }

    if (!dbExists) {
      console.log('[GTFS Import] Creating new SQLite database');
    } else {
      console.log('[GTFS Import] Using existing database for incremental update');
    }

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

    // Check restroom data version
    const restroomVersion = versionInfo.restroomVersion || 0;
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (now - restroomVersion > oneWeek) {
      console.log('[GTFS Import] Restroom data is expired or missing, updating...');

      // Fetch restroom data from public API and update database here
      const fetch = require('node-fetch');

      // Example: Fetch from Vancouver open data API
      const VANCOUVER_API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-washrooms/records?limit=100';

      try {
        const response = await fetch(VANCOUVER_API);
        if (!response.ok) {
          throw new Error(`Failed to fetch restroom data: ${response.statusText}`);
        }
        const data = await response.json();

        // Parse and map data to restroom objects
        const restrooms = data.records.map((record) => {
          const fields = record.fields;
          return {
            id: record.recordid,
            name: fields.name || '',
            address: fields.address || '',
            lat: fields.latitude,
            lon: fields.longitude,
            distance: null, // to be calculated on query
            is_open: true, // assume true or parse if available
          };
        });

        // Create restrooms table if not exists
        await new Promise((resolve, reject) => {
          db.run(`CREATE TABLE IF NOT EXISTS restrooms (
            id TEXT PRIMARY KEY,
            name TEXT,
            address TEXT,
            lat REAL,
            lon REAL,
            distance REAL,
            is_open INTEGER
          );`, (err) => {
            if (err) reject(err);
            else resolve(null);
          });
        });

        // Upsert restroom data
        const upsertStmt = db.prepare(`INSERT INTO restrooms (id, name, address, lat, lon, distance, is_open)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            address=excluded.address,
            lat=excluded.lat,
            lon=excluded.lon,
            distance=excluded.distance,
            is_open=excluded.is_open;`);

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          for (const restroom of restrooms) {
            upsertStmt.run([
              restroom.id,
              restroom.name,
              restroom.address,
              restroom.lat,
              restroom.lon,
              restroom.distance,
              restroom.is_open ? 1 : 0
            ]);
          }
          db.run('COMMIT');
        });

        upsertStmt.finalize();
        console.log(`[GTFS Import] Imported ${restrooms.length} restrooms`);

        // Update version info
        versionInfo.restroomVersion = now;
        fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));
      } catch (error) {
        console.error('[GTFS Import] Error updating restroom data:', error);
      }
    } else {
      console.log('[GTFS Import] Restroom data is up to date, skipping update.');
    }

    db.close((err) => {
      if (err) {
        console.error('[GTFS Import] Error closing database:', err);
      } else {
        console.log('[GTFS Import] Successfully imported all GTFS tables and restrooms to gtfs.sqlite');
      }
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (e) {
        console.warn('[GTFS Import] Failed to remove lock file:', e);
      }
    });
  } catch (err) {
    console.error('[GTFS Import] Critical error during import:', err);
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {
      console.warn('[GTFS Import] Failed to remove lock file:', e);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  importAll();
}
