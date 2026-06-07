import { BookmarkIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TocTree } from '@/components/reader/TocTree'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseBookmarkPosition } from '@/hooks/useBookmarks'
import { formatPercent } from '@/lib/utils'
import type { Bookmark } from '@/types/electron'
import type { TocItem } from '@/types/reader-navigation'

export type ReaderSidebarTab = 'toc' | 'bookmarks'

interface ReaderSidebarProps {
  toc: TocItem[]
  showToc: boolean
  activeTab: ReaderSidebarTab
  onTabChange: (tab: ReaderSidebarTab) => void
  bookmarks: Bookmark[]
  bookmarksLoading: boolean
  onTocSelect: (href: string) => void
  onBookmarkSelect: (bookmark: Bookmark) => void
  onBookmarkRemove: (id: string) => void
}

export function ReaderSidebar({
  toc,
  showToc,
  activeTab,
  onTabChange,
  bookmarks,
  bookmarksLoading,
  onTocSelect,
  onBookmarkSelect,
  onBookmarkRemove,
}: ReaderSidebarProps) {
  const { t } = useTranslation()

  const effectiveTab = showToc ? activeTab : 'bookmarks'

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <Tabs
        value={effectiveTab}
        onValueChange={(v) => onTabChange(v as ReaderSidebarTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 border-b p-2">
          <TabsList className="grid w-full grid-cols-2">
            {showToc && (
              <TabsTrigger value="toc">{t('reader.toc')}</TabsTrigger>
            )}
            <TabsTrigger value="bookmarks" className={showToc ? undefined : 'col-span-2'}>
              {t('reader.bookmarks')}
            </TabsTrigger>
          </TabsList>
        </div>

        {showToc && (
          <TabsContent
            value="toc"
            className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
          >
            {toc.length > 0 ? (
              <TocTree items={toc} onSelect={onTocSelect} />
            ) : (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('reader.tocEmpty')}
              </p>
            )}
          </TabsContent>
        )}

        <TabsContent
          value="bookmarks"
          className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
        >
          {bookmarksLoading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : bookmarks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-2 py-8 text-center text-sm text-muted-foreground">
              <BookmarkIcon className="size-8 opacity-40" />
              <p>{t('reader.bookmarksEmpty')}</p>
              <p className="text-xs">{t('reader.bookmarksHint')}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {bookmarks.map((bookmark) => {
                const position = parseBookmarkPosition(bookmark.position)
                const subtitle =
                  bookmark.progress_percent != null
                    ? formatPercent(bookmark.progress_percent)
                    : position?.label

                return (
                  <li key={bookmark.id} className="group flex items-start gap-1">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-accent"
                      onClick={() => onBookmarkSelect(bookmark)}
                    >
                      <p className="truncate text-sm font-medium">{bookmark.label}</p>
                      {subtitle && (
                        <p className="truncate text-xs text-muted-foreground">
                          {subtitle}
                        </p>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label={t('reader.removeBookmark')}
                      onClick={() => void onBookmarkRemove(bookmark.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
