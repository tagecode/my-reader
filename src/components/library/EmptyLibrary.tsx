import { BookOpenIcon, UploadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface EmptyLibraryProps {
  onImport: () => void
  dragActive?: boolean
  disabled?: boolean
}

export function EmptyLibrary({
  onImport,
  dragActive,
  disabled,
}: EmptyLibraryProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center transition-colors ${
        dragActive ? 'border-primary bg-accent/30' : 'border-muted-foreground/30'
      }`}
    >
      <BookOpenIcon className="size-16 text-muted-foreground" />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('library.emptyTitle')}</h2>
        <p className="max-w-md text-muted-foreground">
          {t('library.emptyDescription')}
        </p>
      </div>
      <Button onClick={onImport} disabled={disabled}>
        <UploadIcon />
        {disabled ? t('common.importing') : t('library.importBooks')}
      </Button>
    </div>
  )
}
