import { GridIcon, ListIcon } from 'lucide-react'
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
import { useAppStore, type LibraryView } from '@/stores/app-store'

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
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.readingDefaultsTitle')}</CardTitle>
        <CardDescription>{t('settings.readingDefaultsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
          <Label htmlFor="fontSize">{t('settings.fontSizeLabel')}</Label>
          <Input
            id="fontSize"
            type="number"
            min={12}
            max={32}
            className="w-full max-w-[8rem]"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
          />
          <Label htmlFor="readingWidth">{t('settings.readingWidthLabel')}</Label>
          <Input
            id="readingWidth"
            type="number"
            min={480}
            max={1200}
            className="w-full max-w-[8rem]"
            value={readingWidth}
            onChange={(e) => setReadingWidth(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            className="w-fit"
            onClick={() => void onPersist({ fontSize, readingWidth })}
          >
            {t('settings.saveReading')}
          </Button>
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => void onReset()}
          >
            {t('settings.resetDefaults')}
          </Button>
        </div>
      </CardContent>
    </Card>
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

function LibraryViewSettings({
  libraryView,
  onLibraryViewChange,
}: {
  libraryView: LibraryView
  onLibraryViewChange: (value: LibraryView) => Promise<void>
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.libraryLayoutTitle')}</CardTitle>
        <CardDescription>{t('settings.libraryLayoutDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant={libraryView === 'list' ? 'default' : 'outline'}
          onClick={() => void onLibraryViewChange('list')}
        >
          <ListIcon />
          {t('settings.libraryLayoutList')}
        </Button>
        <Button
          variant={libraryView === 'grid' ? 'default' : 'outline'}
          onClick={() => void onLibraryViewChange('grid')}
        >
          <GridIcon />
          {t('settings.libraryLayoutGrid')}
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

  const libraryView = useAppStore((s) => s.libraryView)
  const setLibraryView = useAppStore((s) => s.setLibraryView)
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
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        </div>

        {feedback && (
          <StatusMessage variant={feedback.variant}>{feedback.message}</StatusMessage>
        )}

        <Tabs defaultValue="reading" className="flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="reading">{t('settings.tabReading')}</TabsTrigger>
            <TabsTrigger value="general">{t('settings.tabGeneral')}</TabsTrigger>
            <TabsTrigger value="data">{t('settings.tabData')}</TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="flex flex-col gap-4">
            <ThemeSettings theme={theme} onThemeChange={handleThemeChange} />

            <ReadingSettingsForm
              key={settingsFormKey}
              settings={settings}
              onPersist={persist}
              onReset={handleReset}
            />
          </TabsContent>

        <TabsContent value="general" className="flex flex-col gap-4">
          <LibraryViewSettings
            libraryView={libraryView}
            onLibraryViewChange={setLibraryView}
          />
          <LanguageSettings locale={locale} onLocaleChange={handleLocaleChange} />
        </TabsContent>

          <TabsContent value="data">
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
    </div>
  )
}
