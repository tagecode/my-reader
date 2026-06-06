import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StatusMessage } from '@/components/ui/status-message'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoading } from '@/components/ui/page-state'
import { changeAppLocale } from '@/lib/i18n/change-locale'
import type { LocalePreference } from '@/lib/i18n/locale'
import { useAppStore } from '@/stores/app-store'

const LOCALE_OPTIONS: { value: LocalePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.languageSystem' },
  { value: 'zh-CN', labelKey: 'settings.languageZhCN' },
  { value: 'zh-TW', labelKey: 'settings.languageZhTW' },
  { value: 'en', labelKey: 'settings.languageEn' },
]

function ReadingSettingsForm({
  settings,
  onPersist,
  onReset,
}: {
  settings: Record<string, string>
  onPersist: (patch: Record<string, string>) => Promise<void>
  onReset: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [fontSize, setFontSize] = useState(settings.fontSize ?? '18')
  const [readingWidth, setReadingWidth] = useState(settings.readingWidth ?? '720')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.readingDefaultsTitle')}</CardTitle>
          <CardDescription>{t('settings.readingDefaultsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fontSize">{t('settings.fontSizeLabel')}</Label>
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
            <Label htmlFor="readingWidth">{t('settings.readingWidthLabel')}</Label>
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
            {t('settings.saveReading')}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => void onReset()}>
        {t('settings.resetDefaults')}
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
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.themeTitle')}</CardTitle>
        <CardDescription>{t('settings.themeDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          onClick={() => void onThemeChange('light')}
        >
          {t('reader.dayMode')}
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          onClick={() => void onThemeChange('dark')}
        >
          {t('reader.nightMode')}
        </Button>
      </CardContent>
    </Card>
  )
}

function LanguageSettings({
  locale,
  onLocaleChange,
}: {
  locale: string
  onLocaleChange: (value: LocalePreference) => Promise<void>
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.languageTitle')}</CardTitle>
        <CardDescription>{t('settings.languageDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {LOCALE_OPTIONS.map(({ value, labelKey }) => (
          <Button
            key={value}
            variant={locale === value ? 'default' : 'outline'}
            onClick={() => void onLocaleChange(value)}
          >
            {t(labelKey)}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const applyTheme = useAppStore((s) => s.applyTheme)
  const [dataPath, setDataPath] = useState('')
  const [feedback, setFeedback] = useState<{
    variant: 'success' | 'info'
    message: string
  } | null>(null)

  const settingsFormKey = `${settings.fontSize ?? ''}|${settings.readingWidth ?? ''}|${settings.theme ?? ''}|${settings.locale ?? ''}`
  const theme = settings.theme ?? 'light'
  const locale = settings.locale ?? 'system'

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
    setFeedback({ variant: 'success', message: t('settings.saved') })
    setTimeout(() => setFeedback(null), 2500)
  }

  const handleThemeChange = async (value: string) => {
    applyTheme(value)
    await persist({ theme: value })
  }

  const handleLocaleChange = async (value: LocalePreference) => {
    await changeAppLocale(value)
    await persist({ locale: value })
  }

  const handleReset = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.resetSettings()
    await loadSettings()
    const next = useAppStore.getState().settings
    applyTheme(next.theme ?? 'light')
    await changeAppLocale(next.locale ?? 'system')
    setFeedback({ variant: 'info', message: t('settings.resetDone') })
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      {feedback && (
        <StatusMessage variant={feedback.variant}>{feedback.message}</StatusMessage>
      )}

      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">{t('settings.tabReading')}</TabsTrigger>
          <TabsTrigger value="general">{t('settings.tabGeneral')}</TabsTrigger>
          <TabsTrigger value="data">{t('settings.tabData')}</TabsTrigger>
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

        <TabsContent value="general" className="flex flex-col gap-4 pt-4">
          <LanguageSettings locale={locale} onLocaleChange={handleLocaleChange} />
        </TabsContent>

        <TabsContent value="data" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.dataTitle')}</CardTitle>
              <CardDescription>{t('settings.dataDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label>{t('settings.dbPath')}</Label>
              {dataPath ? (
                <code className="rounded-md bg-muted p-3 text-xs break-all">
                  {dataPath}
                </code>
              ) : (
                <PageLoading message={t('settings.loadingPath')} className="min-h-16" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
    </div>
  )
}
