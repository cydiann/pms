import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';

export type AuthStackParamList = {
  readonly Login: undefined;
  readonly ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

/**
 * AuthStack - Authentication flow navigation stack
 * 
 * Currently defines navigation structure for authentication screens.
 * Designed for future expansion with forgot password, registration, etc.
 * Note: Currently unused in AppNavigator (uses LoginScreen directly)
 * 
 * @returns React Navigation stack for authentication flow
 */
function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false as const, // Hide header for auth screens
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
      />
    </Stack.Navigator>
  );
};

export type { AuthStackParamList };
export default AuthStack as () => React.JSX.Element;