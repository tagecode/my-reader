import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resolveSystemLocale } from './locale'
import { en } from './resources/en'
import { zhCN } from './resources/zh-CN'
import { zhTW } from './resources/zh-TW'

const initialLocale = resolveSystemLocale()

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: 'en',
  supportedLngs: ['zh-CN', 'zh-TW', 'en'],
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
})

document.documentElement.lang = initialLocale

export default i18n
