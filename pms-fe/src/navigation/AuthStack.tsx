import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header for auth screens
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
      />
    </Stack.Navigator>
  );
};

export default AuthStack;