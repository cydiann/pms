import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';

import { store, persistor } from './store';
import { PaperTheme } from './constants/theme';
import AppNavigator from './navigation/AppNavigator';
import LoadingScreen from './screens/common/LoadingScreen';
import NotificationManager from './components/common/NotificationManager';

// Ignore specific warnings for development
LogBox.ignoreLogs([
  'Warning: componentWillReceiveProps',
  'Warning: componentWillUpdate',
  'VirtualizedLists should never be nested',
]);

const App: React.FC = () => {
  useEffect(() => {
    // Any app initialization logic can go here
  }, []);

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <PaperProvider theme={PaperTheme}>
          <NavigationContainer>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={PaperTheme.colors.surface}
              translucent={false}
            />
            <AppNavigator />
            <NotificationManager />
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

export default App;