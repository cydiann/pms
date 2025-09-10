/**
 * PMS Frontend App - React Native with Web Support
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App, { AppConfig, Environment } from './src/App';
import './src/locales/i18n'; // Initialize i18n

// Root component props for future extensibility
interface RootProps {
  readonly initialConfig?: Partial<AppConfig>;
}

function Root({ initialConfig }: RootProps = {}): JSX.Element {
  // Create app configuration based on environment with proper typing
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const appConfig: AppConfig = {
    environment: (process.env.NODE_ENV as Environment) || 'development',
    apiUrl: process.env.REACT_APP_API_URL || undefined,
    features: {
      debugging: isDevelopment,
      analytics: isProduction,
      devtools: isDevelopment,
    },
    ...initialConfig, // Allow override of default configuration
  };

  return (
    <SafeAreaProvider>
      <App config={appConfig} />
    </SafeAreaProvider>
  );
}

// Export types for external consumption
export type { RootProps };

// Export component with explicit typing for better module boundaries
export default Root as (props?: RootProps) => JSX.Element;
