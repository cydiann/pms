import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { useAppSelector } from '../store/hooks';
import { selectUserRole } from '../store/slices/authSlice';
import { Colors } from '../constants/theme';
import { SCREENS } from '../constants/app';

import EmployeeTabNavigator from './EmployeeTabNavigator';
import SupervisorTabNavigator from './SupervisorTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';
import RequestDetailsScreen from '../screens/common/RequestDetailsScreen';
import CreateRequestScreen from '../screens/common/CreateRequestScreen';

export type MainStackParamList = {
  [SCREENS.EMPLOYEE_STACK]: undefined;
  [SCREENS.SUPERVISOR_STACK]: undefined;
  [SCREENS.ADMIN_STACK]: undefined;
  [SCREENS.REQUEST_DETAILS]: { requestId: number };
  [SCREENS.CREATE_REQUEST]: { editRequestId?: number };
};

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  const userRole = useAppSelector(selectUserRole);

  // Determine which tab navigator to show based on user role
  const getTabNavigator = () => {
    switch (userRole) {
      case 'admin':
        return AdminTabNavigator;
      case 'supervisor':
        return SupervisorTabNavigator;
      case 'employee':
      default:
        return EmployeeTabNavigator;
    }
  };

  const getInitialRoute = () => {
    switch (userRole) {
      case 'admin':
        return SCREENS.ADMIN_STACK;
      case 'supervisor':
        return SCREENS.SUPERVISOR_STACK;
      case 'employee':
      default:
        return SCREENS.EMPLOYEE_STACK;
    }
  };

  const TabNavigator = getTabNavigator();

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
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
      {/* Role-based tab navigators */}
      <Stack.Screen
        name={SCREENS.EMPLOYEE_STACK}
        component={EmployeeTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.SUPERVISOR_STACK}
        component={SupervisorTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.ADMIN_STACK}
        component={AdminTabNavigator}
        options={{ headerShown: false }}
      />

      {/* Modal screens that appear over tabs */}
      <Stack.Screen
        name={SCREENS.REQUEST_DETAILS}
        component={RequestDetailsScreen}
        options={{
          title: 'Request Details',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name={SCREENS.CREATE_REQUEST}
        component={CreateRequestScreen}
        options={({ route }) => ({
          title: route.params?.editRequestId ? 'Edit Request' : 'Create Request',
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;