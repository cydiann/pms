import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import EmployeeDashboardScreen from '../screens/employee/DashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type EmployeeTabParamList = {
  Dashboard: undefined;
  MyRequests: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

const EmployeeTabNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: '#6c757d',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e9ecef',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#007bff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={EmployeeDashboardScreen}
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
          // TODO: Add proper icons when react-native-vector-icons is configured
        }}
      />
      <Tab.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{
          title: t('navigation.myRequests'),
          tabBarLabel: t('navigation.requests'),
          // TODO: Add proper icons
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
          // TODO: Add proper icons
        }}
      />
    </Tab.Navigator>
  );
};

export default EmployeeTabNavigator;