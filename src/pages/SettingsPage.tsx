import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StatusMessage } from '@/components/ui/status-message'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoading } from '@/components/ui/page-state'
import { useAppStore } from '@/stores/app-store'

function ReadingSettingsForm({
  settings,
  onPersist,
  onReset,
}: {
  settings: Record<string, string>
  onPersist: (patch: Record<string, string>) => Promise<void>
  onReset: () => Promise<void>
}) {
  const [fontSize, setFontSize] = useState(settings.fontSize ?? '18')
  const [readingWidth, setReadingWidth] = useState(settings.readingWidth ?? '720')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>默认阅读设置</CardTitle>
          <CardDescription>新打开书籍时使用的默认值</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fontSize">字号 (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min={12}
              max={32}
              className="w-32"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="readingWidth">阅读宽度 (px)</Label>
            <Input
              id="readingWidth"
              type="number"
              min={480}
              max={1200}
              className="w-32"
              value={readingWidth}
              onChange={(e) => setReadingWidth(e.target.value)}
            />
          </div>
          <Button onClick={() => void onPersist({ fontSize, readingWidth })}>
            保存阅读设置
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => void onReset()}>
        恢复默认设置
      </Button>
    </>
  )
}

function ThemeSettings({
  theme,
  onThemeChange,
}: {
  theme: string
  onThemeChange: (value: string) => Promise<void>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>主题</CardTitle>
        <CardDescription>切换日间或夜间模式，全局生效</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          onClick={() => void onThemeChange('light')}
        >
          日间
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          onClick={() => void onThemeChange('dark')}
        >
          夜间
        </Button>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const applyTheme = useAppStore((s) => s.applyTheme)
  const [dataPath, setDataPath] = useState('')
  const [feedback, setFeedback] = useState<{
    variant: 'success' | 'info'
    message: string
  } | null>(null)

  const settingsFormKey = `${settings.fontSize ?? ''}|${settings.readingWidth ?? ''}|${settings.theme ?? ''}`
  const theme = settings.theme ?? 'light'

  useEffect(() => {
    void loadSettings()
    if (window.electronAPI) {
      void window.electronAPI.getDataPath().then(setDataPath)
    }
  }, [loadSettings])

  const persist = async (patch: Record<string, string>) => {
    if (!window.electronAPI) return
    for (const [key, value] of Object.entries(patch)) {
      await window.electronAPI.setSetting(key, value)
    }
    await loadSettings()
    setFeedback({ variant: 'success', message: '设置已保存' })
    setTimeout(() => setFeedback(null), 2500)
  }

  const handleThemeChange = async (value: string) => {
    applyTheme(value)
    await persist({ theme: value })
  }

  const handleReset = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.resetSettings()
    await loadSettings()
    const next = useAppStore.getState().settings
    applyTheme(next.theme ?? 'light')
    setFeedback({ variant: 'info', message: '已恢复默认阅读设置' })
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-2xl font-semibold">设置</h1>

      {feedback && (
        <StatusMessage variant={feedback.variant}>{feedback.message}</StatusMessage>
      )}

      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">阅读</TabsTrigger>
          <TabsTrigger value="data">数据</TabsTrigger>
        </TabsList>

        <TabsContent value="reading" className="flex flex-col gap-4 pt-4">
          <ThemeSettings theme={theme} onThemeChange={handleThemeChange} />

          <ReadingSettingsForm
            key={settingsFormKey}
            settings={settings}
            onPersist={persist}
            onReset={handleReset}
          />
        </TabsContent>

        <TabsContent value="data" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>本地数据</CardTitle>
              <CardDescription>所有书库与进度均保存在本机</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label>数据库路径</Label>
              {dataPath ? (
                <code className="rounded-md bg-muted p-3 text-xs break-all">
                  {dataPath}
                </code>
              ) : (
                <PageLoading message="正在读取路径…" className="min-h-16" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
    </div>
  )
}
