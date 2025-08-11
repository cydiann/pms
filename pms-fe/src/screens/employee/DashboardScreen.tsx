import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { fetchRequests, selectRequestItems, selectRequestsLoading } from '@/store/slices/requestsSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { SCREENS, REQUEST_STATUS_LABELS } from '@/constants/app';
import { formatDate } from '@/utils/helpers';

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const user = useAppSelector(selectUser);
  const requests = useAppSelector(selectRequestItems);
  const isLoading = useAppSelector(selectRequestsLoading);

  useEffect(() => {
    // Load recent requests on mount
    dispatch(fetchRequests({ page: 1, page_size: 10 }));
  }, [dispatch]);

  const onRefresh = () => {
    dispatch(fetchRequests({ page: 1, page_size: 10 }));
  };

  const navigateToCreateRequest = () => {
    navigation.navigate(SCREENS.CREATE_REQUEST as never);
  };

  const navigateToRequestDetails = (requestId: number) => {
    navigation.navigate(SCREENS.REQUEST_DETAILS as never, { requestId });
  };

  // Calculate dashboard stats
  const stats = {
    total: requests.length,
    draft: requests.filter(r => r.status === 'draft').length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.welcomeText}>
              Welcome back, {user?.first_name}!
            </Text>
            <Text variant="bodyMedium" style={styles.welcomeSubtext}>
              Here's your procurement dashboard
            </Text>
          </Card.Content>
        </Card>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: Colors.primary }]}>
              <Card.Content style={styles.statContent}>
                <Icon name="assignment" size={24} color={Colors.textOnPrimary} />
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.total}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Requests
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: Colors.status.draft }]}>
              <Card.Content style={styles.statContent}>
                <Icon name="edit" size={24} color={Colors.textOnPrimary} />
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.draft}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Draft
                </Text>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: Colors.status.pending }]}>
              <Card.Content style={styles.statContent}>
                <Icon name="hourglass-empty" size={24} color={Colors.textOnPrimary} />
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.pending}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Pending
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: Colors.status.completed }]}>
              <Card.Content style={styles.statContent}>
                <Icon name="check-circle" size={24} color={Colors.textOnPrimary} />
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.completed}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Completed
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Recent Requests */}
        <Card style={styles.recentCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Recent Requests
            </Text>
            
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No requests yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first procurement request
                </Text>
              </View>
            ) : (
              requests.slice(0, 5).map((request) => (
                <Card
                  key={request.id}
                  style={styles.requestCard}
                  onPress={() => navigateToRequestDetails(request.id)}
                >
                  <Card.Content style={styles.requestContent}>
                    <View style={styles.requestHeader}>
                      <Text variant="titleMedium" numberOfLines={1}>
                        {request.item}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: Colors.status[request.status] }
                      ]}>
                        <Text style={styles.statusText}>
                          {REQUEST_STATUS_LABELS[request.status]}
                        </Text>
                      </View>
                    </View>
                    
                    <Text variant="bodySmall" style={styles.requestMeta}>
                      {request.request_number} • {formatDate(request.created_at)}
                    </Text>
                    
                    <Text variant="bodyMedium" numberOfLines={2} style={styles.requestDescription}>
                      Qty: {request.quantity} {request.unit}
                      {request.description && ` • ${request.description}`}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="New Request"
        onPress={navigateToCreateRequest}
        style={styles.fab}
        color={Colors.textOnPrimary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  welcomeCard: {
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  welcomeText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  welcomeSubtext: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    marginHorizontal: Spacing.xs / 2,
    ...Shadow.small,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statNumber: {
    color: Colors.textOnPrimary,
    fontWeight: 'bold',
    marginVertical: Spacing.xs,
  },
  statLabel: {
    color: Colors.textOnPrimary,
    textAlign: 'center',
  },
  recentCard: {
    ...Shadow.medium,
  },
  sectionTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  requestCard: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
  },
  requestContent: {
    paddingVertical: Spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.textOnPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  requestMeta: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  requestDescription: {
    color: Colors.text,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
  },
});

export default DashboardScreen;