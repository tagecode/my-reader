import { getDatabase } from './index'

export const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'light',
  fontSize: '18',
  readingWidth: '720',
}

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? DEFAULT_SETTINGS[key] ?? null
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]

  const result = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (@key, @value, @updated_at)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run({ key, value, updated_at: now })
}

export function resetSettings(): Record<string, string> {
  const db = getDatabase()
  db.prepare('DELETE FROM settings').run()
  return getAllSettings()
}
