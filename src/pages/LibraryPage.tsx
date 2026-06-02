import {
  GridIcon,
  ListIcon,
  SearchIcon,
  UploadIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BookCard } from '@/components/library/BookCard'
import { EmptyLibrary } from '@/components/library/EmptyLibrary'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptySearch, PageLoading } from '@/components/ui/page-state'
import { StatusMessage } from '@/components/ui/status-message'
import {
  formatImportFeedback,
  importBookPaths,
  importFromDialog,
} from '@/lib/importBooks'
import { generateMissingPdfCovers } from '@/lib/generatePdfCovers'
import { useAppStore } from '@/stores/app-store'
import type { Book } from '@/types/electron'
import type { StatusVariant } from '@/components/ui/status-message'

type ImportFeedback = {
  variant: StatusVariant
  title?: string
  message: string
  details: string[]
}

export function LibraryPage() {
  const books = useAppStore((s) => s.books)
  const loading = useAppStore((s) => s.loading)
  const importing = useAppStore((s) => s.importing)
  const error = useAppStore((s) => s.error)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const libraryView = useAppStore((s) => s.libraryView)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setLibraryView = useAppStore((s) => s.setLibraryView)
  const loadBooks = useAppStore((s) => s.loadBooks)
  const setImporting = useAppStore((s) => s.setImporting)
  const setPage = useAppStore((s) => s.setPage)
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId)

  const [dragActive, setDragActive] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Book | null>(null)
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(
    null,
  )
  const [coversSyncing, setCoversSyncing] = useState(false)

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

  useEffect(() => {
    let cancelled = false
    setCoversSyncing(true)
    void generateMissingPdfCovers()
      .then((n) => {
        if (cancelled || n === 0) return
        void loadBooks(searchQuery || undefined)
      })
      .finally(() => {
        if (!cancelled) setCoversSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadBooks, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBooks(searchQuery || undefined)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, loadBooks])

  const runImport = useCallback(
    async (runner: () => Promise<ImportFeedback | null>) => {
      setImportFeedback(null)
      setImporting(true)
      try {
        const feedback = await runner()
        if (feedback) setImportFeedback(feedback)
        await loadBooks(searchQuery || undefined)
      } finally {
        setImporting(false)
      }
    },
    [loadBooks, searchQuery, setImporting],
  )

  const handleImport = useCallback(async () => {
    await runImport(async () => {
      const result = await importFromDialog()
      if (!result) return null
      return formatImportFeedback(result)
    })
  }, [runImport])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (!window.electronAPI) return

      const paths = Array.from(e.dataTransfer.files)
        .map((f) => window.electronAPI.getPathForFile(f))
        .filter(Boolean)
      if (paths.length === 0) return

      await runImport(async () => {
        const result = await importBookPaths(paths)
        return formatImportFeedback(result)
      })
    },
    [runImport],
  )

  const handleOpen = (book: Book) => {
    setCurrentBookId(book.id)
    setPage('reader')
  }

  const handleRemoveConfirm = async () => {
    if (!removeTarget || !window.electronAPI) return
    await window.electronAPI.removeBook(removeTarget.id)
    setRemoveTarget(null)
    await loadBooks(searchQuery || undefined)
  }

  const showEmptyLibrary =
    !loading && !importing && books.length === 0 && !searchQuery.trim()
  const showEmptySearch =
    !loading && !importing && books.length === 0 && !!searchQuery.trim()

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-4 p-4"
      onDragOver={(e) => {
        e.preventDefault()
        if (!importing) setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        if (!importing) void handleDrop(e)
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索书名或作者…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={importing}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            size="icon"
            variant={libraryView === 'grid' ? 'secondary' : 'ghost'}
            onClick={() => setLibraryView('grid')}
            aria-label="网格视图"
            disabled={importing}
          >
            <GridIcon />
          </Button>
          <Button
            size="icon"
            variant={libraryView === 'list' ? 'secondary' : 'ghost'}
            onClick={() => setLibraryView('list')}
            aria-label="列表视图"
            disabled={importing}
          >
            <ListIcon />
          </Button>
        </div>
        <Button onClick={() => void handleImport()} disabled={importing}>
          <UploadIcon />
          {importing ? '导入中…' : '导入'}
        </Button>
      </div>

      {importing && (
        <StatusMessage variant="info" title="正在导入">
          正在解析文件并写入书库，请稍候…
        </StatusMessage>
      )}

      {importFeedback && !importing && (
        <StatusMessage
          variant={importFeedback.variant}
          title={importFeedback.title}
        >
          <p>{importFeedback.message}</p>
          {importFeedback.details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              {importFeedback.details.slice(0, 5).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {importFeedback.details.length > 5 && (
                <li>还有 {importFeedback.details.length - 5} 项…</li>
              )}
            </ul>
          )}
        </StatusMessage>
      )}

      {error && (
        <StatusMessage variant="error" title="书库加载失败">
          {error}
        </StatusMessage>
      )}

      {loading && books.length === 0 ? (
        <PageLoading message="正在加载书库…" />
      ) : showEmptyLibrary ? (
        <EmptyLibrary
          onImport={() => void handleImport()}
          dragActive={dragActive}
          disabled={importing}
        />
      ) : showEmptySearch ? (
        <EmptySearch query={searchQuery.trim()} />
      ) : (
        <div
          className={
            libraryView === 'grid'
              ? 'grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 overflow-y-auto'
              : 'flex flex-1 flex-col gap-3 overflow-y-auto'
          }
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              view={libraryView}
              onOpen={handleOpen}
              onRemove={setRemoveTarget}
            />
          ))}
        </div>
      )}

      {coversSyncing && (
        <p className="text-center text-xs text-muted-foreground">
          正在生成 PDF 封面…
        </p>
      )}

      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除书籍</DialogTitle>
            <DialogDescription>
              确定从书库移除「{removeTarget?.title}」？不会删除磁盘上的原文件。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleRemoveConfirm()}>
              移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
