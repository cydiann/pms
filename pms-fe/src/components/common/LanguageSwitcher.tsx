import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { changeLanguage, getCurrentLanguage } from '../../locales/i18n';

const LanguageSwitcher: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  
  console.log('LanguageSwitcher rendering, current language:', currentLanguage);

  const handleLanguageSwitch = () => {
    console.log('Language switcher clicked!');
    const newLanguage = currentLanguage === 'en' ? 'tr' : 'en';
    switchLanguage(newLanguage);
  };

  const switchLanguage = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  const getCurrentFlag = () => {
    return currentLanguage === 'en' ? '🇺🇸' : '🇹🇷';
  };

  const getNextFlag = () => {
    return currentLanguage === 'en' ? '🇹🇷' : '🇺🇸';
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleLanguageSwitch}
      accessibilityLabel="Switch Language"
      accessibilityHint={`Currently ${currentLanguage === 'en' ? 'English' : 'Turkish'}, tap to switch`}
    >
      <Text style={styles.flagText}>{getCurrentFlag()}</Text>
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
});

export default LanguageSwitcher;