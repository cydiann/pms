import React from 'react';
import { AuthProvider } from './store/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import GlobalAlert from './components/GlobalAlert';
import { User } from './types/auth';

// Type definitions
type Environment = 'development' | 'staging' | 'production';

// App configuration interface with stricter typing
interface AppConfig {
  readonly apiUrl?: string;
  readonly environment?: Environment;
  readonly features?: Readonly<{
    debugging?: boolean;
    analytics?: boolean;
    devtools?: boolean;
  }>;
}

// Initial auth state interface
interface InitialAuthState {
  readonly isAuthenticated?: boolean;
  readonly user?: User | null;
}

// Main App component props with strict typing
interface AppProps {
  readonly config?: AppConfig;
  readonly AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  readonly initialAuthState?: InitialAuthState;
}

// Default configuration with proper typing
const defaultConfig: AppConfig = {
  environment: 'development',
  features: {
    debugging: false,
    analytics: false,
    devtools: false,
  },
} as const;

// Export interfaces for external use
export type { AppConfig, AppProps, InitialAuthState, Environment };

// Root app component with providers
function App({ 
  config = defaultConfig, 
  AuthProvider: CustomAuthProvider,
  initialAuthState 
}: AppProps): JSX.Element {
  // Use custom AuthProvider if provided (for testing), otherwise use default
  const ActualAuthProvider = CustomAuthProvider || AuthProvider;
  
  // Apply configuration and environment setup
  React.useEffect(() => {
    // Development mode features
    if (config.features?.debugging) {
      console.log('🚀 PMS App Debug Mode Enabled');
      console.log('📋 Configuration:', config);
      if (initialAuthState) {
        console.log('🔐 Initial Auth State:', initialAuthState);
      }
      console.log('🏗️  Environment:', config.environment || 'unknown');
    }

    // Global configuration for the app
    if (config.apiUrl) {
      console.log('🌐 API URL Override:', config.apiUrl);
    }

    // Analytics setup
    if (config.features?.analytics) {
      console.log('📊 Analytics enabled for production');
    }
  }, [config, initialAuthState]);

  return (
    <ActualAuthProvider>
      <AppNavigator />
      {/* Global, consistent alert modal */}
      <GlobalAlert />
    </ActualAuthProvider>
  );
}

// Export component with explicit typing for better module boundaries
export default App as (props: AppProps) => JSX.Element;
