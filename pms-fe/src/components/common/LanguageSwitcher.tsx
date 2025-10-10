import React, { useMemo, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { changeLanguage, getCurrentLanguage } from '../../locales/i18n';

type SupportedLanguage = 'en' | 'tr';

type LanguageSwitcherVariant = 'primary' | 'light';

interface LanguageInfo {
  readonly code: SupportedLanguage;
  readonly name: string;
  readonly flag: string;
}

const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
} as const;

interface LanguageSwitcherProps {
  variant?: LanguageSwitcherVariant;
}

function LanguageSwitcher({ variant = 'primary' }: LanguageSwitcherProps): React.JSX.Element {
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

  const containerStyle = useMemo(() => {
    return [
      styles.containerBase,
      variant === 'primary' ? styles.containerPrimary : styles.containerLight,
    ];
  }, [variant]);

  const langTextStyle = useMemo(() => {
    return [
      styles.langTextBase,
      variant === 'primary' ? styles.langTextPrimary : styles.langTextLight,
    ];
  }, [variant]);

  return (
    <TouchableOpacity 
      style={containerStyle}
      onPress={handleLanguageSwitch}
      accessibilityLabel="Switch Language"
      accessibilityHint={`Currently ${getCurrentLanguageInfo().name}, tap to switch`}
    >
      <Text style={styles.flagText}>{getCurrentLanguageInfo().flag}</Text>
      <Text style={langTextStyle}>{currentLanguage.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  containerBase: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderRadius: 25,
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  containerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  flagText: {
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 28,
  },
  langTextBase: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  langTextPrimary: {
    color: '#ffffff',
  },
  langTextLight: {
    color: '#212529',
  },
} as const);

export type { SupportedLanguage };
export default LanguageSwitcher;
