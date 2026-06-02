import { create } from 'zustand'
import type { Book } from '@/types/electron'

export type AppPage = 'library' | 'reader' | 'settings'
export type LibraryView = 'grid' | 'list'

interface AppState {
  page: AppPage
  libraryView: LibraryView
  books: Book[]
  currentBookId: string | null
  searchQuery: string
  loading: boolean
  importing: boolean
  error: string | null
  settings: Record<string, string>
  setPage: (page: AppPage) => void
  setLibraryView: (view: LibraryView) => void
  setSearchQuery: (query: string) => void
  setCurrentBookId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setImporting: (importing: boolean) => void
  setError: (error: string | null) => void
  loadBooks: (search?: string) => Promise<void>
  loadSettings: () => Promise<void>
  applyTheme: (theme: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  page: 'library',
  libraryView: 'grid',
  books: [],
  currentBookId: null,
  searchQuery: '',
  loading: false,
  importing: false,
  error: null,
  settings: {},

  setPage: (page) => {
    set({ page })
    if (page === 'library') {
      void get().loadBooks(get().searchQuery || undefined)
    }
  },
  setLibraryView: (view) => set({ libraryView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentBookId: (id) => set({ currentBookId: id }),
  setLoading: (loading) => set({ loading }),
  setImporting: (importing) => set({ importing }),
  setError: (error) => set({ error }),

  applyTheme: (theme) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  },

  loadSettings: async () => {
    if (!window.electronAPI) return
    const settings = (await window.electronAPI.getSettings()) as Record<
      string,
      string
    >
    get().applyTheme(settings.theme ?? 'light')
    set({ settings })
  },

  loadBooks: async (search) => {
    if (!window.electronAPI) return
    set({ loading: true, error: null })
    try {
      const books = (await window.electronAPI.listBooks(search)) as Book[]
      set({ books, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '加载书库失败',
      })
    }
  },
}))
