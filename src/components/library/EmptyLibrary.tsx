import { BookOpenIcon, UploadIcon } from 'lucide-react'
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
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center transition-colors ${
        dragActive ? 'border-primary bg-accent/30' : 'border-muted-foreground/30'
      }`}
    >
      <BookOpenIcon className="size-16 text-muted-foreground" />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">书库还是空的</h2>
        <p className="max-w-md text-muted-foreground">
          导入 EPUB、TXT 或 PDF 电子书，或将文件拖拽到此处
        </p>
      </div>
      <Button onClick={onImport} disabled={disabled}>
        <UploadIcon />
        {disabled ? '导入中…' : '导入书籍'}
      </Button>
    </div>
  )
}
