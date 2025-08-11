import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors, Dimensions } from '../constants/theme';
import { SCREENS, TABS } from '../constants/app';

import DashboardScreen from '../screens/employee/DashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';
import CreateRequestScreen from '../screens/common/CreateRequestScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type SupervisorTabParamList = {
  [SCREENS.DASHBOARD]: undefined;
  [SCREENS.MY_REQUESTS]: undefined;
  [SCREENS.MY_TEAM]: undefined;
  [SCREENS.CREATE_REQUEST]: { editRequestId?: number };
  [SCREENS.PROFILE]: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const SupervisorTabNavigator: React.FC = () => {
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
            case SCREENS.CREATE_REQUEST:
              iconName = 'add-circle';
              break;
            case SCREENS.PROFILE:
              iconName = 'person';
              break;
          }

          return (
            <Icon
              name={iconName}
              size={focused ? size + 4 : size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11, // Slightly smaller to fit more tabs
          fontWeight: '500',
        },
        tabBarStyle: {
          height: 65, // Slightly taller for 5 tabs
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarItemStyle: {
          minHeight: Dimensions.touchTarget.min,
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
          tabBarLabel: TABS.DASHBOARD,
          title: 'Dashboard',
        }}
      />
      <Tab.Screen
        name={SCREENS.MY_REQUESTS}
        component={MyRequestsScreen}
        options={{
          tabBarLabel: TABS.MY_REQUESTS,
          title: 'My Requests',
        }}
      />
      <Tab.Screen
        name={SCREENS.MY_TEAM}
        component={MyTeamScreen}
        options={{
          tabBarLabel: TABS.MY_TEAM,
          title: 'My Team',
          tabBarBadge: undefined, // Can be set dynamically for pending approvals
        }}
      />
      <Tab.Screen
        name={SCREENS.CREATE_REQUEST}
        component={CreateRequestScreen}
        options={{
          tabBarLabel: TABS.CREATE,
          title: 'Create Request',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="add-circle"
              size={size + 6}
              color={Colors.primary}
            />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarLabel: TABS.PROFILE,
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default SupervisorTabNavigator;