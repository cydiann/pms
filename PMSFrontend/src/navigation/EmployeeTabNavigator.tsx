import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors, Dimensions } from '../constants/theme';
import { SCREENS, TABS } from '../constants/app';

import DashboardScreen from '../screens/employee/DashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import CreateRequestScreen from '../screens/common/CreateRequestScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

export type EmployeeTabParamList = {
  [SCREENS.DASHBOARD]: undefined;
  [SCREENS.MY_REQUESTS]: undefined;
  [SCREENS.CREATE_REQUEST]: { editRequestId?: number };
  [SCREENS.PROFILE]: undefined;
};

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

const EmployeeTabNavigator: React.FC = () => {
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
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          height: 60,
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
        name={SCREENS.CREATE_REQUEST}
        component={CreateRequestScreen}
        options={{
          tabBarLabel: TABS.CREATE,
          title: 'Create Request',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="add-circle"
              size={size + 8}
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

export default EmployeeTabNavigator;