import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import TeamRequestsScreen from '../screens/supervisor/TeamRequestsScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type SupervisorTabParamList = {
  Dashboard: undefined;
  MyRequests: undefined;
  TeamRequests: undefined;
  MyTeam: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const SupervisorTabNavigator: React.FC = () => {
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
        component={SupervisorDashboardScreen}
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
          tabBarLabel: t('navigation.myRequests'),
          // TODO: Add proper icons
        }}
      />
      <Tab.Screen
        name="TeamRequests"
        component={TeamRequestsScreen}
        options={{
          title: t('navigation.teamRequests'),
          tabBarLabel: t('navigation.team'),
          // TODO: Add proper icons
        }}
      />
      <Tab.Screen
        name="MyTeam"
        component={MyTeamScreen}
        options={{
          title: t('navigation.myTeam'),
          tabBarLabel: t('navigation.myTeam'),
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

export default SupervisorTabNavigator;