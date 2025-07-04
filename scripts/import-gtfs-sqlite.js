// 使用 better-sqlite3（同步）和 csv-parse 导入 GTFS txt 到 SQLite
// 依赖: npm install better-sqlite3 csv-parse
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const parse = require('csv-parse/sync').parse;

const GTFS_DIR = path.join(__dirname, '../data/google_transit');
const DB_PATH = path.join(__dirname, '../data/gtfs.sqlite');

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
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const types = columns.map(col => inferType(rows[0][col]));
  const sql = `CREATE TABLE IF NOT EXISTS ${table} (${columns.map((c, i) => `${c} ${types[i]}`).join(',')});`;
  db.prepare(sql).run();
}

function insertRows(db, table, rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(',');
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(columns.map(c => row[c]));
    }
  });
  insertMany(rows);
}

function importAll() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = new Database(DB_PATH);
  const files = fs.readdirSync(GTFS_DIR).filter(f => f.endsWith('.txt'));
  for (const file of files) {
    const table = file.replace('.txt', '');
    const rows = parseCsv(path.join(GTFS_DIR, file));
    if (!rows.length) {
      console.log(`Skip ${file} (empty)`);
      continue;
    }
    createTable(db, table, rows);
    insertRows(db, table, rows);
    console.log(`Imported ${file} -> ${table} (${rows.length} rows)`);
  }
  db.close();
  console.log('All GTFS tables imported to gtfs.sqlite');
}

if (require.main === module) {
  importAll();
}
