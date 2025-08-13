import React from 'react';
import { AuthProvider } from './store/AuthContext';
import AppNavigator from './navigation/AppNavigator';

// Root app component with providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;