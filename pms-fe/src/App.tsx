import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from './store/AuthContext';
import LoginScreen from './screens/auth/LoginScreen';
import { useTranslation } from 'react-i18next';

// Simple Dashboard placeholder - will be replaced with proper navigation later
const DashboardPlaceholder: React.FC = () => {
  const { t } = useTranslation();
  const { authState, logout } = useAuth();

  return (
    <View style={styles.dashboardContainer}>
      <Text style={styles.title}>
        {t('dashboard.title')} - PMS
      </Text>
      
      <Text style={styles.welcomeText}>
        Welcome back, {authState.user?.first_name} {authState.user?.last_name}!
      </Text>
      
      <Text style={styles.userInfo}>
        Username: {authState.user?.username}
      </Text>
      
      <Text style={styles.userInfo}>
        Role: {authState.user?.is_superuser ? 'Admin' : 'Employee'}
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>
            {t('auth.logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Loading screen component
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007bff" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Main app component that handles authentication routing
const AppContent: React.FC = () => {
  const { authState } = useAuth();

  // Show loading screen while checking authentication
  if (authState.loading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!authState.isAuthenticated) {
    return <LoginScreen />;
  }

  // Show dashboard if authenticated
  return <DashboardPlaceholder />;
};

// Root app component with providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  dashboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 20,
    marginBottom: 16,
    color: '#495057',
    textAlign: 'center',
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 8,
    color: '#6c757d',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 30,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;