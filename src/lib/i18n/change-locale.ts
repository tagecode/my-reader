import i18n from './index'
import { resolveAppLocale, type LocalePreference } from './locale'

export async function changeAppLocale(
  preference: LocalePreference | string,
): Promise<void> {
  const resolved = resolveAppLocale(preference)
  await i18n.changeLanguage(resolved)
  document.documentElement.lang = resolved
}
