import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { TabProvider, useTab } from '../store/TabContext';
import LoginScreen from '../screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';

// Inner component that uses TabContext hooks
function AuthenticatedApp(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { activeTab, setActiveTab } = useTab();
  
  return (
    <MainTabNavigator 
      user={authState.user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      t={t}
    />
  );
}

function AppNavigator(): React.JSX.Element {
  const { authState } = useAuth();

  // Show loading screen while checking authentication
  if (authState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return authState.isAuthenticated ? (
    <TabProvider>
      <AuthenticatedApp />
    </TabProvider>
  ) : <LoginScreen />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
} as const);

export { AuthenticatedApp };
export default AppNavigator as () => React.JSX.Element;