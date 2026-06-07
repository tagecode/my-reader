import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { filterFlatToc, flattenToc } from '@/lib/toc-utils'
import type { TocItem } from '@/types/reader-navigation'

interface TocTreeProps {
  items: TocItem[]
  onSelect: (href: string) => void
  searchQuery?: string
}

const ROW_HEIGHT = 28

export function TocTree({ items, onSelect, searchQuery = '' }: TocTreeProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const flatItems = useMemo(
    () => filterFlatToc(flattenToc(items), searchQuery),
    [items, searchQuery],
  )

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
  })

  if (flatItems.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
        {searchQuery.trim()
          ? t('reader.tocSearchEmpty')
          : t('reader.tocEmpty')}
      </p>
    )
  }

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index]!
          return (
            <button
              key={item.key}
              type="button"
              className="absolute left-0 w-full truncate rounded py-1 text-left text-sm hover:bg-accent"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                paddingLeft: `${8 + item.depth * 12}px`,
                paddingRight: '8px',
              }}
              onClick={() => void onSelect(item.href)}
            >
              {item.label || t('common.chapter')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
