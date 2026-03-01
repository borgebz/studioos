import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import pt from './locales/pt-pt/common.json'
import en from './locales/en-us/common.json'

const storedLng = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null

i18n.use(initReactI18next).init({
  resources: {
    pt: { common: pt },
    en: { common: en },
  },
  lng: storedLng === 'en' || storedLng === 'pt' ? storedLng : 'pt',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
