import i18n from './index'
import { resolveAppLocale, type LocalePreference } from './locale'
import { applyAppTitle } from './sync-app-title'

export async function changeAppLocale(
  preference: LocalePreference | string,
): Promise<void> {
  const resolved = resolveAppLocale(preference)
  await i18n.changeLanguage(resolved)
  document.documentElement.lang = resolved
  applyAppTitle(i18n.t('app.name'))
}
