import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { changeLanguage, getCurrentLanguage } from '../../locales/i18n';

type SupportedLanguage = 'en' | 'tr';

interface LanguageInfo {
  readonly code: SupportedLanguage;
  readonly name: string;
  readonly flag: string;
}

const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
} as const;

function LanguageSwitcher(): React.JSX.Element {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (getCurrentLanguage() as SupportedLanguage) || 'en'
  );

  const getCurrentLanguageInfo = (): LanguageInfo => {
    return SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES.en;
  };

  const getNextLanguage = (): SupportedLanguage => {
    return currentLanguage === 'en' ? 'tr' : 'en';
  };

  const handleLanguageSwitch = (): void => {
    const newLanguage = getNextLanguage();
    switchLanguage(newLanguage);
  };

  const switchLanguage = async (languageCode: SupportedLanguage): Promise<void> => {
    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Language change error:', error);
    }
  };


  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleLanguageSwitch}
      accessibilityLabel="Switch Language"
      accessibilityHint={`Currently ${getCurrentLanguageInfo().name}, tap to switch`}
    >
      <Text style={styles.flagText}>{getCurrentLanguageInfo().flag}</Text>
      <Text style={styles.langText}>{currentLanguage.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flagText: {
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 28,
  },
  langText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
} as const);

export type { SupportedLanguage };
export default LanguageSwitcher as () => React.JSX.Element;