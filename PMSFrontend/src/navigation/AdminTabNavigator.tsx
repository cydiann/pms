import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors, Dimensions } from '../constants/theme';
import { SCREENS, TABS } from '../constants/app';

import DashboardScreen from '../screens/employee/DashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';
import AllRequestsScreen from '../screens/admin/AllRequestsScreen';
import AllUsersScreen from '../screens/admin/AllUsersScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type AdminTabParamList = {
  [SCREENS.DASHBOARD]: undefined;
  [SCREENS.MY_REQUESTS]: undefined;
  [SCREENS.MY_TEAM]: undefined;
  [SCREENS.ALL_REQUESTS]: undefined;
  [SCREENS.ALL_USERS]: undefined;
  [SCREENS.PROFILE]: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName={SCREENS.DASHBOARD}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'dashboard';

          switch (route.name) {
            case SCREENS.DASHBOARD:
              iconName = 'dashboard';
              break;
            case SCREENS.MY_REQUESTS:
              iconName = 'list-alt';
              break;
            case SCREENS.MY_TEAM:
              iconName = 'group';
              break;
            case SCREENS.ALL_REQUESTS:
              iconName = 'assignment';
              break;
            case SCREENS.ALL_USERS:
              iconName = 'people';
              break;
            case SCREENS.PROFILE:
              iconName = 'person';
              break;
          }

          return (
            <Icon
              name={iconName}
              size={focused ? size + 2 : size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10, // Smaller to fit 6 tabs
          fontWeight: '500',
        },
        tabBarStyle: {
          height: 70, // Taller for 6 tabs
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarItemStyle: {
          minHeight: Dimensions.touchTarget.min,
          paddingHorizontal: 2, // Less padding for more tabs
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name={SCREENS.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          title: 'Admin Dashboard',
        }}
      />
      <Tab.Screen
        name={SCREENS.ALL_REQUESTS}
        component={AllRequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          title: 'All Requests',
        }}
      />
      <Tab.Screen
        name={SCREENS.MY_TEAM}
        component={MyTeamScreen}
        options={{
          tabBarLabel: 'Team',
          title: 'My Team',
        }}
      />
      <Tab.Screen
        name={SCREENS.ALL_USERS}
        component={AllUsersScreen}
        options={{
          tabBarLabel: 'Users',
          title: 'All Users',
        }}
      />
      <Tab.Screen
        name={SCREENS.MY_REQUESTS}
        component={MyRequestsScreen}
        options={{
          tabBarLabel: 'Mine',
          title: 'My Requests',
        }}
      />
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;