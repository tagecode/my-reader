import {
  BookOpenIcon,
  LibraryIcon,
  SettingsIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/ui/status-message'
import { cn } from '@/lib/utils'
import { useAppStore, type AppPage } from '@/stores/app-store'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const page = useAppStore((s) => s.page)
  const importing = useAppStore((s) => s.importing)
  const setPage = useAppStore((s) => s.setPage)

  const navItems: { id: AppPage; label: string; icon: typeof LibraryIcon }[] = [
    { id: 'library', label: t('nav.library'), icon: LibraryIcon },
    { id: 'settings', label: t('nav.settings'), icon: SettingsIcon },
  ]

  if (page === 'reader') {
    return <div className="flex h-screen flex-col bg-background">{children}</div>
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="text-primary" />
          <span className="font-semibold">{t('app.name')}</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={page === id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPage(id)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>
      </header>
      <main className={cn('flex min-h-0 flex-1 flex-col')}>
        {importing && page !== 'library' && (
          <StatusMessage variant="info" title={t('library.importingTitle')} className="mx-4 mt-3 shrink-0">
            {t('library.importingShell')}
          </StatusMessage>
        )}
        {children}
      </main>
    </div>
  )
}
