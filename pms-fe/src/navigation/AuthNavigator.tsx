import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { Colors } from '../constants/theme';
import { SCREENS } from '../constants/app';

import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

export type AuthStackParamList = {
  [SCREENS.LOGIN]: undefined;
  [SCREENS.FORGOT_PASSWORD]: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={SCREENS.LOGIN}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen
        name={SCREENS.LOGIN}
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={SCREENS.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;