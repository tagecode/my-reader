import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/stores/app-store'
import type {
  LibraryFormatFilter,
  LibrarySortField,
  LibraryStatusFilter,
} from '@/types/library'

const selectClassName =
  'h-9 min-w-[8.5rem] rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function LibraryFilters() {
  const { t } = useTranslation()
  const librarySort = useAppStore((s) => s.librarySort)
  const libraryFormatFilter = useAppStore((s) => s.libraryFormatFilter)
  const libraryStatusFilter = useAppStore((s) => s.libraryStatusFilter)
  const importing = useAppStore((s) => s.importing)
  const setLibrarySort = useAppStore((s) => s.setLibrarySort)
  const setLibraryFormatFilter = useAppStore((s) => s.setLibraryFormatFilter)
  const setLibraryStatusFilter = useAppStore((s) => s.setLibraryStatusFilter)

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-sort" className="text-xs text-muted-foreground">
          {t('library.sortLabel')}
        </Label>
        <select
          id="library-sort"
          className={selectClassName}
          value={librarySort}
          disabled={importing}
          onChange={(e) =>
            void setLibrarySort(e.target.value as LibrarySortField)
          }
        >
          <option value="recentRead">{t('library.sortRecentRead')}</option>
          <option value="recentImport">{t('library.sortRecentImport')}</option>
          <option value="title">{t('library.sortTitle')}</option>
          <option value="author">{t('library.sortAuthor')}</option>
          <option value="progress">{t('library.sortProgress')}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-format" className="text-xs text-muted-foreground">
          {t('library.formatLabel')}
        </Label>
        <select
          id="library-format"
          className={selectClassName}
          value={libraryFormatFilter}
          disabled={importing}
          onChange={(e) =>
            void setLibraryFormatFilter(e.target.value as LibraryFormatFilter)
          }
        >
          <option value="all">{t('library.formatAll')}</option>
          <option value="epub">EPUB</option>
          <option value="txt">TXT</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-status" className="text-xs text-muted-foreground">
          {t('library.statusLabel')}
        </Label>
        <select
          id="library-status"
          className={selectClassName}
          value={libraryStatusFilter}
          disabled={importing}
          onChange={(e) =>
            void setLibraryStatusFilter(e.target.value as LibraryStatusFilter)
          }
        >
          <option value="all">{t('library.statusAll')}</option>
          <option value="unread">{t('library.statusUnread')}</option>
          <option value="reading">{t('library.statusReading')}</option>
          <option value="read">{t('library.statusRead')}</option>
          <option value="favorite">{t('library.statusFavorite')}</option>
        </select>
      </div>
    </div>
  )
}
