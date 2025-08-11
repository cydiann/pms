import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchAdminStats,
  fetchRecentActivity,
  selectAdminStats,
  selectRecentActivity,
  selectAdminLoading,
} from '@/store/slices/adminSlice';
import { showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { SCREENS } from '@/constants/app';
import { formatDate } from '@/utils/helpers';

interface AdminStats {
  requests: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  worksites: {
    total: number;
    active: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  icon: string;
  color: string;
}

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const stats = useAppSelector(selectAdminStats);
  const recentActivity = useAppSelector(selectRecentActivity);
  const isLoading = useAppSelector(selectAdminLoading);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchAdminStats()),
        dispatch(fetchRecentActivity({ limit: 10 })),
      ]);
    } catch (error) {
      dispatch(showErrorNotification('Failed to load dashboard data'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as never);
  };

  const getActivityIcon = (action: string): string => {
    switch (action) {
      case 'request_created': return 'add-box';
      case 'request_approved': return 'check-circle';
      case 'request_rejected': return 'cancel';
      case 'user_created': return 'person-add';
      case 'user_deactivated': return 'person-off';
      case 'password_reset': return 'lock-reset';
      default: return 'info';
    }
  };

  const getActivityColor = (action: string): string => {
    switch (action) {
      case 'request_created': return Colors.primary;
      case 'request_approved': return Colors.success;
      case 'request_rejected': return Colors.error;
      case 'user_created': return Colors.primary;
      case 'user_deactivated': return Colors.warning;
      case 'password_reset': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderStatsCard = () => (
    <Card style={styles.statsCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          System Overview
        </Text>

        {/* Request Stats */}
        <View style={styles.statsSection}>
          <Text variant="titleSmall" style={styles.statsSubtitle}>
            Requests
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.text }]}>
                {stats?.requests.total || 0}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>
                {stats?.requests.pending || 0}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {stats?.requests.approved || 0}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>
                {stats?.requests.completed || 0}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* User Stats */}
        <View style={styles.statsSection}>
          <Text variant="titleSmall" style={styles.statsSubtitle}>
            Users
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.text }]}>
                {stats?.users.total || 0}
              </Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {stats?.users.active || 0}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.textSecondary }]}>
                {stats?.users.inactive || 0}
              </Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Worksite Stats */}
        <View style={styles.statsSection}>
          <Text variant="titleSmall" style={styles.statsSubtitle}>
            Worksites
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.text }]}>
                {stats?.worksites.total || 0}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {stats?.worksites.active || 0}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionsGrid}>
          <Button
            mode="outlined"
            onPress={() => navigateToScreen(SCREENS.ALL_REQUESTS)}
            style={styles.actionButton}
            icon="assignment"
            contentStyle={styles.actionButtonContent}
          >
            All Requests
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigateToScreen(SCREENS.ALL_USERS)}
            style={styles.actionButton}
            icon="group"
            contentStyle={styles.actionButtonContent}
          >
            Manage Users
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigateToScreen('PasswordReset')}
            style={styles.actionButton}
            icon="lock-reset"
            contentStyle={styles.actionButtonContent}
          >
            Password Resets
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigateToScreen('SystemSettings')}
            style={styles.actionButton}
            icon="settings"
            contentStyle={styles.actionButtonContent}
          >
            System Settings
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderRecentActivity = () => (
    <Card style={styles.activityCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent Activity
        </Text>

        {recentActivity && recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
            <View key={activity.id}>
              <List.Item
                title={activity.description}
                description={`${activity.user} • ${formatDate(activity.timestamp, true)}`}
                left={() => (
                  <View style={styles.activityIcon}>
                    <Icon
                      name={getActivityIcon(activity.action)}
                      size={20}
                      color={getActivityColor(activity.action)}
                    />
                  </View>
                )}
                titleNumberOfLines={2}
                descriptionStyle={styles.activityDescription}
                style={styles.activityItem}
              />
              {index < recentActivity.length - 1 && (
                <Divider style={styles.activityDivider} />
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyActivity}>
            <Icon name="history" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        )}

        <Button
          mode="text"
          onPress={() => navigateToScreen('ActivityLog')}
          style={styles.viewAllButton}
        >
          View All Activity
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderStatsCard()}
      {renderQuickActions()}
      {renderRecentActivity()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  statsCard: {
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  quickActionsCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  activityCard: {
    ...Shadow.small,
  },
  sectionTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  statsSection: {
    marginBottom: Spacing.md,
  },
  statsSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.divider,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '48%',
    maxWidth: '48%',
  },
  actionButtonContent: {
    height: 48,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  activityItem: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
  },
  activityDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityDivider: {
    backgroundColor: Colors.divider,
    marginLeft: 56,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
});

export default AdminDashboardScreen;