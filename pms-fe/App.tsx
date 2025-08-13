/**
 * PMS Frontend App - React Native with Web Support
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';
import './src/locales/i18n'; // Initialize i18n

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

export default Root;
