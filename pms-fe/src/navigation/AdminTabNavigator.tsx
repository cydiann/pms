import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AllRequestsScreen from '../screens/admin/AllRequestsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import WorksiteManagementScreen from '../screens/admin/WorksiteManagementScreen';
import AllUsersScreen from '../screens/admin/AllUsersScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type AdminTabParamList = {
  Dashboard: undefined;
  AllRequests: undefined;
  UserManagement: undefined;
  WorksiteManagement: undefined;
  Reports: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabNavigator: React.FC = () => {
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
        component={AdminDashboardScreen}
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AllRequests"
        component={AllRequestsScreen}
        options={{
          title: t('navigation.allRequests'),
          tabBarLabel: t('navigation.requests'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          title: t('navigation.userManagement'),
          tabBarLabel: t('navigation.users'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="WorksiteManagement"
        component={WorksiteManagementScreen}
        options={{
          title: t('worksiteManagement.title'),
          tabBarLabel: t('navigation.worksites'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏢</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={AllUsersScreen}
        options={{
          title: t('navigation.reports'),
          tabBarLabel: t('navigation.reports'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;