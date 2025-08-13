import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import storage from '../utils/storage';

// Import translation files
import en from './en.json';
import tr from './tr.json';

// Language detection - simplified for web
const getDeviceLanguage = () => {
  try {
    return navigator.language?.split('-')[0] || 'en';
  } catch {
    return 'en';
  }
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = '@pms_language';

// Save language preference to storage
const saveLanguagePreference = async (language: string) => {
  try {
    await storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Error saving language preference:', error);
  }
};

// Get saved language preference
const getSavedLanguagePreference = async (): Promise<string | null> => {
  try {
    return await storage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Error getting saved language preference:', error);
    return null;
  }
};

// Initialize i18n
const initI18n = async () => {
  const savedLanguage = await getSavedLanguagePreference();
  const deviceLanguage = getDeviceLanguage();
  const initialLanguage = savedLanguage || deviceLanguage;

  await i18n
    .use(initReactI18next)
    .init({
      lng: initialLanguage,
      fallbackLng: 'en',
      debug: false, // Set to true for development debugging
      resources: {
        en: { translation: en },
        tr: { translation: tr },
      },
      interpolation: {
        escapeValue: false,
      },
    });

  // Save the initial language if not already saved
  if (!savedLanguage) {
    await saveLanguagePreference(initialLanguage);
  }
};

// Change language function
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  await saveLanguagePreference(language);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
];

// Initialize on app start
initI18n();

export default i18n;