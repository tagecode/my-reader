export type LocalePreference = 'system' | 'zh-CN' | 'zh-TW' | 'en'
export type ResolvedLocale = 'zh-CN' | 'zh-TW' | 'en'

const TRADITIONAL_ZH_PREFIXES = ['zh-tw', 'zh-hk', 'zh-mo']

export function resolveLanguageTag(tag: string): ResolvedLocale | null {
  const normalized = tag.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) return null

  if (normalized.startsWith('zh')) {
    if (
      normalized.includes('hant') ||
      TRADITIONAL_ZH_PREFIXES.some(
        (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`),
      )
    ) {
      return 'zh-TW'
    }
    return 'zh-CN'
  }

  if (normalized.startsWith('en')) return 'en'
  return null
}

export function resolveSystemLocaleFromTags(tags: string[]): ResolvedLocale {
  for (const tag of tags) {
    const resolved = resolveLanguageTag(tag)
    if (resolved) return resolved
  }
  return 'en'
}

export function getSystemLanguageTags(): string[] {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages?.length
      ? [...navigator.languages]
      : []
    if (navigator.language) langs.push(navigator.language)
    return [...new Set(langs.filter(Boolean))]
  }
  return ['en']
}

export function resolveSystemLocale(): ResolvedLocale {
  return resolveSystemLocaleFromTags(getSystemLanguageTags())
}

export function resolveAppLocale(
  preference: string | null | undefined,
): ResolvedLocale {
  if (!preference || preference === 'system') {
    return resolveSystemLocale()
  }
  if (preference === 'zh-CN' || preference === 'zh-TW' || preference === 'en') {
    return preference
  }
  return 'en'
}

export function isLocalePreference(value: string): value is LocalePreference {
  return value === 'system' || value === 'zh-CN' || value === 'zh-TW' || value === 'en'
}
