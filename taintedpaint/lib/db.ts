import { mkdirSync } from 'fs'
import path from 'path'
import { STORAGE_ROOT } from './storagePaths'
import Database from 'better-sqlite3'

const DB_PATH = path.join(STORAGE_ROOT, 'board.sqlite')
mkdirSync(STORAGE_ROOT, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

export default db
