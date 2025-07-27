import { promises as fs } from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { baseColumns } from './baseColumns'
import type { BoardData, Task } from '@/types'

const STORAGE_DIR = path.join(process.cwd(), '..', 'storage')
const DB_FILE = path.join(STORAGE_DIR, 'metadata.db')

let db: Database | null = null

async function initDb() {
  if (db) return
  await fs.mkdir(STORAGE_DIR, { recursive: true })
  db = new Database(DB_FILE)
  db.pragma('journal_mode = WAL')
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
  `)
  const count = db.prepare('SELECT COUNT(*) as cnt FROM columns').get().cnt
  if (count === 0) {
    const stmt = db.prepare('INSERT INTO columns (id,title,position) VALUES (?,?,?)')
    baseColumns.forEach((c, i) => stmt.run(c.id, c.title, i))
  }
}

export async function readBoardData(): Promise<BoardData> {
  await initDb()
  const colRows = db!.prepare('SELECT id,title,position FROM columns ORDER BY position').all()
  const taskRows = db!.prepare('SELECT * FROM tasks ORDER BY orderIndex').all()
  const tasks: Record<string, Task> = {}
  for (const r of taskRows) {
    tasks[r.id] = {
      id: r.id,
      columnId: r.columnId,
      customerName: r.customerName,
      representative: r.representative,
      inquiryDate: r.inquiryDate,
      deliveryDate: r.deliveryDate ?? undefined,
      notes: r.notes,
      taskFolderPath: r.taskFolderPath,
      files: JSON.parse(r.files || '[]'),
      ynmxId: r.ynmxId ?? undefined,
    }
  }
  const columnTaskMap: Record<string, string[]> = {}
  for (const r of taskRows) {
    if (!columnTaskMap[r.columnId]) columnTaskMap[r.columnId] = []
    columnTaskMap[r.columnId].push(r.id)
  }
  const columns = colRows.map((c: any) => ({
    id: c.id,
    title: c.title,
    taskIds: columnTaskMap[c.id] || [],
  }))
  return { tasks, columns }
}

export async function updateBoardData(
  updater: (data: BoardData) => void | Promise<void>
): Promise<BoardData> {
  await initDb()
  const data = await readBoardData()
  await updater(data)
  const tx = db!.transaction((bd: BoardData) => {
    const colStmt = db!.prepare(
      'INSERT INTO columns (id,title,position) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, position=excluded.position'
    )
    bd.columns.forEach((c, i) => colStmt.run(c.id, c.title, i))
    const existingCols = db!.prepare('SELECT id FROM columns').all().map((r: any) => r.id)
    existingCols.forEach(id => {
      if (!bd.columns.some(c => c.id === id)) {
        db!.prepare('DELETE FROM columns WHERE id=?').run(id)
        db!.prepare('DELETE FROM tasks WHERE columnId=?').run(id)
      }
    })

    const taskStmt = db!.prepare(
      `INSERT INTO tasks (id,columnId,customerName,representative,inquiryDate,deliveryDate,notes,taskFolderPath,files,ynmxId,orderIndex)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET columnId=excluded.columnId, customerName=excluded.customerName, representative=excluded.representative, inquiryDate=excluded.inquiryDate, deliveryDate=excluded.deliveryDate, notes=excluded.notes, taskFolderPath=excluded.taskFolderPath, files=excluded.files, ynmxId=excluded.ynmxId, orderIndex=excluded.orderIndex`
    )
    const allTaskIds = Object.keys(bd.tasks)
    for (const [id, t] of Object.entries(bd.tasks)) {
      const column = bd.columns.find(c => c.id === t.columnId)
      const orderIndex = column ? column.taskIds.indexOf(id) : 0
      taskStmt.run(
        t.id,
        t.columnId,
        t.customerName,
        t.representative,
        t.inquiryDate,
        t.deliveryDate ?? null,
        t.notes,
        t.taskFolderPath,
        JSON.stringify(t.files || []),
        t.ynmxId ?? null,
        orderIndex
      )
    }
    const existingTasks = db!.prepare('SELECT id FROM tasks').all().map((r: any) => r.id)
    existingTasks.forEach(id => {
      if (!allTaskIds.includes(id)) db!.prepare('DELETE FROM tasks WHERE id=?').run(id)
    })
  })
  tx(data)
  return data
}
