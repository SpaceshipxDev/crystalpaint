import crypto from 'crypto'
import db from './db'

// Create users table if it doesn't exist
// columns: id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT
// sessions table: token TEXT PRIMARY KEY, user_id INTEGER, expires_at INTEGER

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
)`)

db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`)

export interface User {
  id: number
  username: string
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function createUser(username: string, password: string): User {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
  const result = stmt.run(username, hashPassword(password))
  return { id: result.lastInsertRowid as number, username }
}

export function findUserByUsername(username: string): User | undefined {
  return db.prepare('SELECT id, username FROM users WHERE username = ?').get(username) as User | undefined
}

export function verifyUser(username: string, password: string): User | null {
  const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as { id: number, username: string, password_hash: string } | undefined
  if (!row) return null
  const hash = hashPassword(password)
  return row.password_hash === hash ? { id: row.id, username: row.username } : null
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  return token
}

export function getUserBySession(token: string): User | null {
  const row = db.prepare('SELECT users.id as id, users.username as username, sessions.expires_at as exp FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ?').get(token) as { id: number, username: string, exp: number } | undefined
  if (!row) return null
  if (row.exp < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  return { id: row.id, username: row.username }
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}
