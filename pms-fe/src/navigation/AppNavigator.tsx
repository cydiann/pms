import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { TabProvider } from '../store/TabContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SimpleTabNavigator from './SimpleTabNavigator';

const AppNavigator: React.FC = () => {
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
      <SimpleTabNavigator />
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
});

export default AppNavigator;