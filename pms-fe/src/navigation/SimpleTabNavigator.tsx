import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { useTab } from '../store/TabContext';
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
import WorksiteManagementScreen from '../screens/admin/WorksiteManagementScreen';
import GroupManagementScreen from '../screens/admin/GroupManagementScreen';

interface TabItem {
  key: string;
  label: string;
  component: React.ComponentType;
  roles: string[];
}

const SimpleTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { activeTab, setActiveTab } = useTab();
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
      component: UserManagementScreen,
      roles: ['admin'],
    },
    {
      key: 'worksiteManagement',
      label: t('navigation.worksites'),
      component: WorksiteManagementScreen,
      roles: ['admin'],
    },
    {
      key: 'groupManagement',
      label: t('navigation.groups'),
      component: GroupManagementScreen,
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

  // Get the active component
  const ActiveComponent = availableTabs.find(tab => tab.key === activeTab)?.component || EmployeeDashboardScreen;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Title and Language Switcher */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {availableTabs.find(tab => tab.key === activeTab)?.label || t('navigation.dashboard')}
        </Text>
        <LanguageSwitcher />
      </View>

      {/* Top Navigation Tabs */}
      <View style={styles.topTabBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabScrollContent}
        >
          {availableTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.topTabItem,
                activeTab === tab.key && styles.activeTopTabItem,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.topTabLabel,
                  activeTab === tab.key && styles.activeTopTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        <ActiveComponent />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  topTabBar: {
    backgroundColor: '#0056b3',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabScrollView: {
    flexGrow: 0,
  },
  tabScrollContent: {
    paddingHorizontal: 8,
  },
  topTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTopTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  topTabLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTopTabLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default SimpleTabNavigator;