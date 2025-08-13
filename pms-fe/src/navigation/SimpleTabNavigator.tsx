import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';

// Import screens
import EmployeeDashboardScreen from '../screens/employee/DashboardScreen';
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import CreateRequestScreen from '../screens/common/CreateRequestScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import TeamRequestsScreen from '../screens/supervisor/TeamRequestsScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';
import AllRequestsScreen from '../screens/admin/AllRequestsScreen';
import AllUsersScreen from '../screens/admin/AllUsersScreen';

interface TabItem {
  key: string;
  label: string;
  component: React.ComponentType;
  roles: string[];
}

const SimpleTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const user = authState.user;

  // Determine user role
  const getUserRole = () => {
    if (user?.is_superuser) return 'admin';
    // Check if user has subordinates (is a supervisor)
    // For now, we'll use groups to determine supervisor role
    const hasAdminGroup = user?.groups?.some((group: { id: number; name: string }) => group.name === 'Administrator');
    const hasSupervisorGroup = user?.groups?.some((group: { id: number; name: string }) => group.name === 'Supervisor');
    
    if (hasAdminGroup) return 'admin';
    if (hasSupervisorGroup) return 'supervisor';
    return 'employee';
  };

  const userRole = getUserRole();

  // Define all tabs with role restrictions
  const allTabs: TabItem[] = [
    {
      key: 'dashboard',
      label: t('navigation.dashboard'),
      component: userRole === 'admin' ? AdminDashboardScreen :
                userRole === 'supervisor' ? SupervisorDashboardScreen :
                EmployeeDashboardScreen,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      key: 'myRequests',
      label: t('navigation.myRequests'),
      component: MyRequestsScreen,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      key: 'createRequest',
      label: t('navigation.create'),
      component: CreateRequestScreen,
      roles: ['employee', 'supervisor'],
    },
    {
      key: 'teamRequests',
      label: t('navigation.team'),
      component: TeamRequestsScreen,
      roles: ['supervisor'],
    },
    {
      key: 'myTeam',
      label: t('navigation.myTeam'),
      component: MyTeamScreen,
      roles: ['supervisor'],
    },
    {
      key: 'allRequests',
      label: t('navigation.requests'),
      component: AllRequestsScreen,
      roles: ['admin'],
    },
    {
      key: 'userManagement',
      label: t('navigation.users'),
      component: AllUsersScreen,
      roles: ['admin'],
    },
    {
      key: 'profile',
      label: t('navigation.profile'),
      component: ProfileScreen,
      roles: ['employee', 'supervisor', 'admin'],
    },
  ];

  // Filter tabs based on user role
  const availableTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.key || 'dashboard');

  // Get the active component
  const ActiveComponent = availableTabs.find(tab => tab.key === activeTab)?.component || EmployeeDashboardScreen;

  return (
    <SafeAreaView style={styles.container}>
      {/* Main content area */}
      <View style={styles.content}>
        <ActiveComponent />
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {availableTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.activeTabItem,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopColor: '#e9ecef',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    // Active tab styling handled by text color
  },
  tabLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#007bff',
    fontWeight: '600',
  },
});

export default SimpleTabNavigator;