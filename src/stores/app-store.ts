import { create } from 'zustand'
import { changeAppLocale } from '@/lib/i18n/change-locale'
import i18n from '@/lib/i18n'
import type { Book } from '@/types/electron'
import {
  buildListBooksQuery,
  parseLibraryFormatFilter,
  parseLibrarySort,
  parseLibrarySortOrder,
  parseLibraryStatusFilter,
  type LibraryFormatFilter,
  type LibrarySortField,
  type LibrarySortOrder,
  type LibraryStatusFilter,
} from '@/types/library'

export type AppPage = 'library' | 'reader' | 'settings'
export type LibraryView = 'grid' | 'list'

export function parseLibraryView(value: string | undefined | null): LibraryView {
  return value === 'grid' ? 'grid' : 'list'
}

async function persistSetting(key: string, value: string) {
  if (!window.electronAPI) return
  await window.electronAPI.setSetting(key, value)
  useAppStore.setState((state) => ({
    settings: { ...state.settings, [key]: value },
  }))
}

interface AppState {
  page: AppPage
  libraryView: LibraryView
  librarySort: LibrarySortField
  librarySortOrder: LibrarySortOrder
  libraryFormatFilter: LibraryFormatFilter
  libraryStatusFilter: LibraryStatusFilter
  books: Book[]
  recentBooks: Book[]
  currentBookId: string | null
  searchQuery: string
  loading: boolean
  importing: boolean
  error: string | null
  settings: Record<string, string>
  setPage: (page: AppPage) => void
  setLibraryView: (view: LibraryView) => Promise<void>
  setLibrarySort: (sort: LibrarySortField) => Promise<void>
  setLibraryFormatFilter: (format: LibraryFormatFilter) => Promise<void>
  setLibraryStatusFilter: (status: LibraryStatusFilter) => Promise<void>
  setSearchQuery: (query: string) => void
  setCurrentBookId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setImporting: (importing: boolean) => void
  setError: (error: string | null) => void
  loadBooks: () => Promise<void>
  loadRecentBooks: () => Promise<void>
  refreshLibrary: () => Promise<void>
  toggleFavorite: (bookId: string, favorite: boolean) => Promise<void>
  clearRecentReading: (bookId: string) => Promise<void>
  loadSettings: () => Promise<void>
  applyTheme: (theme: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  page: 'library',
  libraryView: 'list',
  librarySort: 'recentImport',
  librarySortOrder: 'desc',
  libraryFormatFilter: 'all',
  libraryStatusFilter: 'all',
  books: [],
  recentBooks: [],
  currentBookId: null,
  searchQuery: '',
  loading: false,
  importing: false,
  error: null,
  settings: {},

  setPage: (page) => {
    set({ page })
    if (page === 'library') {
      void get().refreshLibrary()
    }
  },
  setLibraryView: async (view) => {
    set({ libraryView: view })
    await persistSetting('libraryView', view)
  },
  setLibrarySort: async (sort) => {
    const sortOrder =
      sort === 'title' || sort === 'author' ? 'asc' : ('desc' as const)
    set({ librarySort: sort, librarySortOrder: sortOrder })
    await persistSetting('librarySort', sort)
    await persistSetting('librarySortOrder', sortOrder)
    await get().loadBooks()
  },
  setLibraryFormatFilter: async (format) => {
    set({ libraryFormatFilter: format })
    await persistSetting('libraryFormatFilter', format)
    await get().refreshLibrary()
  },
  setLibraryStatusFilter: async (status) => {
    set({ libraryStatusFilter: status })
    await persistSetting('libraryStatusFilter', status)
    await get().refreshLibrary()
  },
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
    await changeAppLocale(settings.locale ?? 'system')
    set({
      settings,
      libraryView: parseLibraryView(settings.libraryView),
      librarySort: parseLibrarySort(settings.librarySort),
      librarySortOrder: parseLibrarySortOrder(settings.librarySortOrder),
      libraryFormatFilter: parseLibraryFormatFilter(settings.libraryFormatFilter),
      libraryStatusFilter: parseLibraryStatusFilter(settings.libraryStatusFilter),
    })
  },

  loadBooks: async () => {
    if (!window.electronAPI) return
    const state = get()
    set({ loading: true, error: null })
    try {
      const query = buildListBooksQuery(state)
      const books = (await window.electronAPI.listBooks(query)) as Book[]
      set({ books, loading: false })
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : i18n.t('library.loadBooksFailed'),
      })
    }
  },

  loadRecentBooks: async () => {
    if (!window.electronAPI) return
    try {
      const recentBooks = (await window.electronAPI.listRecentBooks(8)) as Book[]
      set({ recentBooks })
    } catch {
      set({ recentBooks: [] })
    }
  },

  refreshLibrary: async () => {
    await Promise.all([get().loadBooks(), get().loadRecentBooks()])
  },

  toggleFavorite: async (bookId, favorite) => {
    if (!window.electronAPI) return
    await window.electronAPI.setBookFavorite(bookId, favorite)
    await get().refreshLibrary()
  },

  clearRecentReading: async (bookId) => {
    if (!window.electronAPI) return
    await window.electronAPI.clearRecentReading(bookId)
    await get().refreshLibrary()
  },
}))
