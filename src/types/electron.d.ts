import type { ElectronAPI } from '../../electron/preload'

export interface Book {
  id: string
  title: string
  author: string | null
  format: 'epub' | 'txt' | 'pdf'
  file_path: string
  file_size: number
  cover_path: string | null
  imported_at: number
  updated_at: number
  progress_percent?: number
}

export interface ReadingProgress {
  book_id: string
  position: string
  progress_percent: number
  updated_at: number
}

export interface ImportBooksResult {
  imported: string[]
  errors: { path: string; error: string }[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
