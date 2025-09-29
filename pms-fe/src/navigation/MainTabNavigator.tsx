import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from '../types/auth';
import { UserRoleInfo } from '../types/users';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useUserRole } from '../hooks/useUserRole';

// Import screens
import EmployeeDashboardScreen from '../screens/employee/DashboardScreen';
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import AllRequestsScreen from '../screens/admin/AllRequestsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import WorksiteManagementScreen from '../screens/admin/WorksiteManagementScreen';
import GroupManagementScreen from '../screens/admin/GroupManagementScreen';
import MyTeamScreen from '../screens/supervisor/MyTeamScreen';

// Import new components
import SupervisorRequestsTabs from '../components/supervisor/SupervisorRequestsTabs';
import PurchasingRequestsScreen from '../components/purchasing/PurchasingRequestsScreen';

interface TabItem {
  readonly key: string;
  readonly label: string;
  readonly component: React.ComponentType;
  readonly showWhen: (roleInfo: UserRoleInfo) => boolean;
}

interface MainTabNavigatorProps {
  readonly user: User | null;
  readonly activeTab: string;
  readonly setActiveTab: (tab: string) => void;
  readonly t: (key: string) => string;
}

function MainTabNavigator({
  user,
  activeTab,
  setActiveTab,
  t
}: MainTabNavigatorProps): React.JSX.Element {

  const { roleInfo, loading } = useUserRole();

  // Show loading state while role info is loading
  if (loading || !roleInfo) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  // Define all tabs with role restrictions
  const allTabs: readonly TabItem[] = [
    {
      key: 'dashboard',
      label: t('navigation.dashboard'),
      component: roleInfo.is_admin ? AdminDashboardScreen :
        roleInfo.has_subordinates ? SupervisorDashboardScreen :
          EmployeeDashboardScreen,
      showWhen: () => true, // Everyone has a dashboard
    },
    {
      key: 'requests',
      label: t('navigation.requests'),
      component: roleInfo.has_subordinates ? SupervisorRequestsTabs : MyRequestsScreen,
      showWhen: () => true, // Everyone can see requests
    },
    {
      key: 'purchasing',
      label: t('navigation.purchasing'),
      component: PurchasingRequestsScreen,
      showWhen: (role) => role.can_purchase,
    },
    {
      key: 'myTeam',
      label: t('navigation.myTeam'),
      component: MyTeamScreen,
      showWhen: (role) => role.has_subordinates,
    },
    {
      key: 'allRequests',
      label: t('navigation.allRequests'),
      component: AllRequestsScreen,
      showWhen: (role) => role.can_view_all_requests,
    },
    {
      key: 'userManagement',
      label: t('navigation.users'),
      component: UserManagementScreen,
      showWhen: (role) => role.is_admin,
    },
    {
      key: 'worksiteManagement',
      label: t('navigation.worksites'),
      component: WorksiteManagementScreen,
      showWhen: (role) => role.is_admin,
    },
    {
      key: 'groupManagement',
      label: t('navigation.groups'),
      component: GroupManagementScreen,
      showWhen: (role) => role.is_admin,
    },
    {
      key: 'profile',
      label: t('navigation.profile'),
      component: ProfileScreen,
      showWhen: () => true, // Everyone has profile
    },
  ] as const;

  // Filter tabs based on user role
  const availableTabs = allTabs.filter(tab => tab.showWhen(roleInfo));

  // Get the active component
  const ActiveComponent = availableTabs.find(tab => tab.key === activeTab)?.component || EmployeeDashboardScreen;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#007bff" barStyle="light-content" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
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
    alignItems: 'center' as const,
    backgroundColor: 'transparent' as const,
  },
  activeTopTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  topTabLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  activeTopTabLabel: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
} as const);

export type { MainTabNavigatorProps, TabItem, UserRole, UserGroup };
export default MainTabNavigator as (props: MainTabNavigatorProps) => React.JSX.Element;