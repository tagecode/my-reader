import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { LibraryPage } from '@/pages/LibraryPage'
import { ReaderPage } from '@/pages/ReaderPage'
import { SettingsPage } from '@/pages/SettingsPage'
import {
  formatImportFeedback,
  importBookPaths,
} from '@/lib/importBooks'
import { useAppStore } from '@/stores/app-store'

function App() {
  const page = useAppStore((s) => s.page)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const loadBooks = useAppStore((s) => s.loadBooks)
  const setImporting = useAppStore((s) => s.setImporting)
  const setPage = useAppStore((s) => s.setPage)
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!window.electronAPI?.onOpenFiles) return
    const unsubscribe = window.electronAPI.onOpenFiles((paths) => {
      setImporting(true)
      void importBookPaths(paths)
        .then(async (result) => {
          const feedback = formatImportFeedback(result)
          await loadBooks()
          if (feedback && result.imported.length > 0) {
            const firstId = result.imported[0]
            setCurrentBookId(firstId)
            setPage('reader')
          }
        })
        .finally(() => setImporting(false))
    })
    return () => {
      unsubscribe()
    }
  }, [loadBooks, setImporting, setCurrentBookId, setPage])

  return (
    <AppShell>
      {page === 'library' && <LibraryPage />}
      {page === 'reader' && <ReaderPage />}
      {page === 'settings' && <SettingsPage />}
    </AppShell>
  )
}

export default App
