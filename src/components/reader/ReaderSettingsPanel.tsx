import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app-store'

interface ReaderSettingsPanelProps {
  fontSize: number
  readingWidth: number
  onFontSizeChange: (v: number) => void
  onReadingWidthChange: (v: number) => void
}

export function ReaderSettingsPanel({
  fontSize,
  readingWidth,
  onFontSizeChange,
  onReadingWidthChange,
}: ReaderSettingsPanelProps) {
  const settings = useAppStore((s) => s.settings)
  const applyTheme = useAppStore((s) => s.applyTheme)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const theme = settings.theme ?? 'light'

  const handleThemeChange = async (value: 'light' | 'dark') => {
    applyTheme(value)
    await window.electronAPI?.setSetting('theme', value)
    await loadSettings()
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-l bg-card p-4">
      <h2 className="text-sm font-semibold">阅读设置</h2>
      <Separator />
      <div className="flex flex-col gap-2">
        <Label>主题</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={theme === 'light' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => void handleThemeChange('light')}
          >
            日间
          </Button>
          <Button
            size="sm"
            variant={theme === 'dark' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => void handleThemeChange('dark')}
          >
            夜间
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reader-font-size">字号 {fontSize}px</Label>
        <input
          id="reader-font-size"
          type="range"
          min={14}
          max={28}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reader-width">阅读宽度 {readingWidth}px</Label>
        <input
          id="reader-width"
          type="range"
          min={480}
          max={960}
          step={20}
          value={readingWidth}
          onChange={(e) => onReadingWidthChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        调整会立即生效，并保存为默认阅读设置。
      </p>
    </aside>
  )
}
