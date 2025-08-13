import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/AuthContext';
import EmployeeTabNavigator from './EmployeeTabNavigator';
import SupervisorTabNavigator from './SupervisorTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';
import RequestDetailScreen from '../screens/common/RequestDetailScreen';
import CreateRequestScreen from '../screens/common/CreateRequestScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  RequestDetail: { requestId: number };
  CreateRequest: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

const MainStack: React.FC = () => {
  const { authState } = useAuth();
  
  // Determine which tab navigator to use based on user role
  const getTabNavigator = () => {
    const user = authState.user;
    
    if (!user) {
      return EmployeeTabNavigator; // Default fallback
    }
    
    // Check for admin role first
    if (user.is_superuser || user.is_admin) {
      return AdminTabNavigator;
    }
    
    // Check for supervisor role
    if (user.is_supervisor) {
      return SupervisorTabNavigator;
    }
    
    // Default to employee
    return EmployeeTabNavigator;
  };

  const TabNavigator = getTabNavigator();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007bff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RequestDetail" 
        component={RequestDetailScreen}
        options={{ title: 'Request Details' }}
      />
      <Stack.Screen 
        name="CreateRequest" 
        component={CreateRequestScreen}
        options={{ 
          title: 'Create Request',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;