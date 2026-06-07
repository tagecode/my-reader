import { useTranslation } from 'react-i18next'
import type { TocItem } from '@/types/reader-navigation'

interface TocTreeProps {
  items: TocItem[]
  onSelect: (href: string) => void
  depth?: number
}

export function TocTree({ items, onSelect, depth = 0 }: TocTreeProps) {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <li key={`${depth}-${i}-${item.href}`}>
          <button
            type="button"
            className="w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-accent"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() => void onSelect(item.href)}
          >
            {item.label || t('common.chapter')}
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <TocTree items={item.subitems} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}
