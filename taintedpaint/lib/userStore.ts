import { mkdirSync } from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import crypto from 'crypto'
import { STORAGE_ROOT } from './storagePaths'

const DB_PATH = path.join(STORAGE_ROOT, 'users.sqlite')
mkdirSync(STORAGE_ROOT, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT
)`)

db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  expires_at INTEGER
)`)

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hashed === hash
}

export function findUser(username: string) {
  return db.prepare('SELECT * FROM users WHERE username=?').get(username) as { id: number; username: string; password_hash: string } | undefined
}

export function createUser(username: string, password: string) {
  const password_hash = hashPassword(password)
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash)
  return info.lastInsertRowid as number
}

export function createSession(userId: number) {
  const token = crypto.randomBytes(24).toString('hex')
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  return token
}

export function getUserBySession(token: string) {
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token=?').get(token) as { user_id: number; expires_at: number } | undefined
  if (!row) return null
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token)
    return null
  }
  const user = db.prepare('SELECT id, username FROM users WHERE id=?').get(row.user_id) as { id: number; username: string } | undefined
  return user || null
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token=?').run(token)
}

export function verifyUserPassword(username: string, password: string) {
  const user = findUser(username)
  if (!user) return null
  if (!verifyPassword(password, user.password_hash)) return null
  return { id: user.id, username: user.username }
}
