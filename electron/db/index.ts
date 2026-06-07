import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { getDbPath } from '../app-paths'
import { applyPendingMigrations } from './migrate'
import { DB_VERSION, MIGRATIONS } from './schema'

let db: Database.Database | null = null

export { getDbPath } from '../app-paths'

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  for (const sql of MIGRATIONS) {
    db.exec(sql)
  }

  applyPendingMigrations(db, DB_VERSION)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
