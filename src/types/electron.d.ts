import type { ElectronAPI } from '../../electron/preload'

export type {
  LibraryFormatFilter,
  LibrarySortField,
  LibrarySortOrder,
  LibraryStatusFilter,
  ListBooksQuery,
} from './library'

export interface Book {
  id: string
  title: string
  author: string | null
  format: 'epub' | 'txt' | 'pdf'
  file_path: string
  file_size: number
  cover_path: string | null
  is_favorite: number
  imported_at: number
  updated_at: number
  progress_percent?: number
  last_read_at?: number | null
}

export interface ReadingProgress {
  book_id: string
  position: string
  progress_percent: number
  last_read_at: number | null
  updated_at: number
}

export interface Bookmark {
  id: string
  book_id: string
  label: string
  position: string
  progress_percent: number | null
  created_at: number
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
