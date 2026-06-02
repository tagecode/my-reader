import {
  BookOpenIcon,
  LibraryIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/ui/status-message'
import { cn } from '@/lib/utils'
import { useAppStore, type AppPage } from '@/stores/app-store'

const NAV_ITEMS: { id: AppPage; label: string; icon: typeof LibraryIcon }[] = [
  { id: 'library', label: '书库', icon: LibraryIcon },
  { id: 'settings', label: '设置', icon: SettingsIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const page = useAppStore((s) => s.page)
  const importing = useAppStore((s) => s.importing)
  const setPage = useAppStore((s) => s.setPage)

  if (page === 'reader') {
    return <div className="flex h-screen flex-col bg-background">{children}</div>
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="text-primary" />
          <span className="font-semibold">摸鱼阅读器</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={page === id ? 'secondary' : 'ghost'}
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
          <StatusMessage variant="info" title="正在导入" className="mx-4 mt-3 shrink-0">
            正在将文件加入书库…
          </StatusMessage>
        )}
        {children}
      </main>
    </div>
  )
}
