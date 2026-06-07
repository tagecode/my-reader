export type LibrarySortField =
  | 'recentRead'
  | 'recentImport'
  | 'title'
  | 'author'
  | 'progress'

export type LibrarySortOrder = 'asc' | 'desc'
export type LibraryFormatFilter = 'all' | 'epub' | 'txt' | 'pdf'
export type LibraryStatusFilter =
  | 'all'
  | 'unread'
  | 'reading'
  | 'read'
  | 'favorite'

export interface ListBooksQuery {
  search?: string
  sort?: LibrarySortField
  sortOrder?: LibrarySortOrder
  format?: LibraryFormatFilter
  status?: LibraryStatusFilter
}

export function parseLibrarySort(value: string | undefined | null): LibrarySortField {
  const allowed: LibrarySortField[] = [
    'recentRead',
    'recentImport',
    'title',
    'author',
    'progress',
  ]
  return allowed.includes(value as LibrarySortField)
    ? (value as LibrarySortField)
    : 'recentImport'
}

export function parseLibrarySortOrder(
  value: string | undefined | null,
): LibrarySortOrder {
  return value === 'asc' ? 'asc' : 'desc'
}

export function parseLibraryFormatFilter(
  value: string | undefined | null,
): LibraryFormatFilter {
  const allowed: LibraryFormatFilter[] = ['all', 'epub', 'txt', 'pdf']
  return allowed.includes(value as LibraryFormatFilter)
    ? (value as LibraryFormatFilter)
    : 'all'
}

export function parseLibraryStatusFilter(
  value: string | undefined | null,
): LibraryStatusFilter {
  const allowed: LibraryStatusFilter[] = [
    'all',
    'unread',
    'reading',
    'read',
    'favorite',
  ]
  return allowed.includes(value as LibraryStatusFilter)
    ? (value as LibraryStatusFilter)
    : 'all'
}

export function buildListBooksQuery(state: {
  searchQuery: string
  librarySort: LibrarySortField
  librarySortOrder: LibrarySortOrder
  libraryFormatFilter: LibraryFormatFilter
  libraryStatusFilter: LibraryStatusFilter
}): ListBooksQuery {
  return {
    search: state.searchQuery.trim() || undefined,
    sort: state.librarySort,
    sortOrder: state.librarySortOrder,
    format: state.libraryFormatFilter,
    status: state.libraryStatusFilter,
  }
}

export function isDefaultLibraryFilters(state: {
  searchQuery: string
  libraryFormatFilter: LibraryFormatFilter
  libraryStatusFilter: LibraryStatusFilter
}): boolean {
  return (
    !state.searchQuery.trim() &&
    state.libraryFormatFilter === 'all' &&
    state.libraryStatusFilter === 'all'
  )
}
