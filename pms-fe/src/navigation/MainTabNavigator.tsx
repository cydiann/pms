import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

// Import screens
import EmployeeDashboardScreen from '../screens/employee/DashboardScreen';
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import TeamRequestsScreen from '../screens/supervisor/TeamRequestsScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';
import AllRequestsScreen from '../screens/admin/AllRequestsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  MyRequests: undefined;
  TeamRequests: undefined;
  MyTeam: undefined;
  AllRequests: undefined;
  UserManagement: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const user = authState.user;
  
  console.log('MainTabNavigator rendering, user:', user?.username);

  // Determine which dashboard screen to use
  const getDashboardScreen = () => {
    if (user?.is_superuser || user?.is_admin) {
      return AdminDashboardScreen;
    } else if (user?.is_supervisor) {
      return SupervisorDashboardScreen;
    }
    return EmployeeDashboardScreen;
  };

  const DashboardScreen = getDashboardScreen();

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
        headerRight: () => <LanguageSwitcher />,
      }}
    >
      {/* Dashboard - Always available */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
        }}
      />

      {/* My Requests - Available for all roles */}
      <Tab.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{
          title: t('navigation.myRequests'),
          tabBarLabel: t('navigation.myRequests'),
        }}
      />


      {/* Team Requests - Only for supervisors */}
      {user?.is_supervisor && (
        <Tab.Screen
          name="TeamRequests"
          component={TeamRequestsScreen}
          options={{
            title: t('navigation.teamRequests'),
            tabBarLabel: t('navigation.team'),
          }}
        />
      )}

      {/* My Team - Only for supervisors */}
      {user?.is_supervisor && (
        <Tab.Screen
          name="MyTeam"
          component={MyTeamScreen}
          options={{
            title: t('navigation.myTeam'),
            tabBarLabel: t('navigation.myTeam'),
          }}
        />
      )}

      {/* All Requests - Only for admins */}
      {(user?.is_superuser || user?.is_admin) && (
        <Tab.Screen
          name="AllRequests"
          component={AllRequestsScreen}
          options={{
            title: t('navigation.allRequests'),
            tabBarLabel: t('navigation.requests'),
          }}
        />
      )}

      {/* User Management - Only for admins */}
      {(user?.is_superuser || user?.is_admin) && (
        <Tab.Screen
          name="UserManagement"
          component={UserManagementScreen}
          options={{
            title: t('navigation.userManagement'),
            tabBarLabel: t('navigation.users'),
          }}
        />
      )}

      {/* Profile - Always available */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;