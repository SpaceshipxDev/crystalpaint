const fs = require('fs/promises');
const path = require('path');
const Database = require('better-sqlite3');

// base columns same as lib/baseColumns.ts
const baseColumns = [
  { id: 'create',      title: '建单' },
  { id: 'quote',       title: '报价' },
  { id: 'send',        title: '发出' },
  { id: 'archive',     title: '报价归档' },
  { id: 'sheet',       title: '制单' },
  { id: 'approval',    title: '审批' },
  { id: 'outsourcing', title: '外协' },
  { id: 'program',     title: '编程' },
  { id: 'operate',     title: '操机' },
  { id: 'manual',      title: '手工' },
  { id: 'surface',     title: '表面处理' },
  { id: 'inspect',     title: '检验' },
  { id: 'ship',        title: '出货' },
  { id: 'archive2',    title: '完成归档' }
];

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'metadata.db');

async function main() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      columnId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      representative TEXT NOT NULL,
      inquiryDate TEXT NOT NULL,
      deliveryDate TEXT,
      notes TEXT NOT NULL,
      taskFolderPath TEXT NOT NULL,
      files TEXT NOT NULL,
      ynmxId TEXT,
      orderIndex INTEGER NOT NULL
    );
  `);
  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM columns').get();
  if (cnt === 0) {
    const stmt = db.prepare('INSERT INTO columns (id,title,position) VALUES (?,?,?)');
    baseColumns.forEach((c, i) => stmt.run(c.id, c.title, i));
    console.log('Database initialized');
  } else {
    console.log('Database already initialized');
  }
}

main();
