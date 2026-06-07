import type { Book } from '@/types/electron'

type BookFormat = Book['format']

/** 书签/跳转用的格式相关位置快照 */
export interface BookmarkPosition {
  format: BookFormat
  label?: string
  cfi?: string
  fraction?: number
  href?: string
  page?: number
  scrollTop?: number
  scale?: number
  encoding?: string
  firstByte?: number
}

export interface ReaderNavigationHandle {
  getBookmarkSnapshot: () => BookmarkPosition | null
  goToBookmark: (position: BookmarkPosition) => Promise<void>
}

export interface TocItem {
  label: string
  href: string
  subitems?: TocItem[]
}
