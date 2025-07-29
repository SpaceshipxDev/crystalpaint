const fs = require('fs/promises');
const path = require('path');
const Database = require('better-sqlite3');

const OLD_STORAGE = path.join(__dirname, '..', '..', 'storage');
const SMB_ROOT = process.env.SMB_ROOT;
if (!SMB_ROOT) {
  console.error('SMB_ROOT environment variable must be set to the new network share');
  process.exit(1);
}

const OLD_TASKS = path.join(OLD_STORAGE, 'tasks');
const NEW_TASKS = path.join(SMB_ROOT, 'tasks');
const OLD_DB = path.join(OLD_STORAGE, 'board.sqlite');
const NEW_DB = path.join(SMB_ROOT, 'board.sqlite');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function migrate() {
  await fs.mkdir(SMB_ROOT, { recursive: true });

  // Copy the database
  await fs.copyFile(OLD_DB, NEW_DB);

  // Copy all task folders
  await fs.mkdir(NEW_TASKS, { recursive: true });
  const folders = await fs.readdir(OLD_TASKS);
  for (const folder of folders) {
    await copyDir(path.join(OLD_TASKS, folder), path.join(NEW_TASKS, folder));
  }

  // Update taskFolderPath values in the new DB
  const db = new Database(NEW_DB);
  const row = db.prepare('SELECT data FROM board_data WHERE id=1').get();
  const board = row && row.data ? JSON.parse(row.data) : { tasks: {}, columns: [] };
  for (const [id, task] of Object.entries(board.tasks)) {
    task.taskFolderPath = `tasks/${id}`;
  }
  db.prepare('UPDATE board_data SET data=? WHERE id=1').run(JSON.stringify(board, null, 2));
  db.close();

  console.log('Migration complete. Files and metadata copied to SMB share.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
