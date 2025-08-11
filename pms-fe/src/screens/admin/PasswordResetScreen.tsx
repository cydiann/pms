import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Searchbar, IconButton, Badge, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchPasswordResetRequests,
  processPasswordReset,
  selectPasswordResetRequests,
  selectPasswordResetLoading,
} from '@/store/slices/authSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { formatDate, debounce } from '@/utils/helpers';

interface PasswordResetRequest {
  id: number;
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  worksite_name: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_by_admin: boolean;
  reason?: string;
  processed_by?: string;
  processed_at?: string;
  notes?: string;
}

interface FilterOptions {
  statuses: ('pending' | 'approved' | 'rejected' | 'completed')[];
  sortBy: 'requested_at' | 'username' | 'status' | 'worksite';
  sortOrder: 'asc' | 'desc';
}

const PasswordResetScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const resetRequests = useAppSelector(selectPasswordResetRequests);
  const isLoading = useAppSelector(selectPasswordResetLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    statuses: ['pending'],
    sortBy: 'requested_at',
    sortOrder: 'desc',
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    // Load password reset requests on mount
    loadPasswordResetRequests();
  }, []);

  const loadPasswordResetRequests = () => {
    const orderingPrefix = filters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${filters.sortBy}`;
    
    dispatch(fetchPasswordResetRequests({ 
      ordering,
      status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
    }));
  };

  // Apply filters and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = resetRequests;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(request =>
        request.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.worksite_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter (client-side for immediate feedback)
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(request => 
        filters.statuses.includes(request.status)
      );
    }

    return filtered;
  }, [resetRequests, searchQuery, filters]);

  const onRefresh = () => {
    loadPasswordResetRequests();
  };

  const handleSearchChange = (query: string) => {
    debouncedSearch(query);
  };

  const handleApproveReset = async (request: PasswordResetRequest) => {
    Alert.alert(
      'Approve Password Reset',
      `Approve password reset for ${request.full_name} (${request.username})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(processPasswordReset({
                requestId: request.id,
                action: 'approve',
                notes: 'Approved via mobile admin panel'
              }));

              if (processPasswordReset.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Password reset approved successfully'));
                loadPasswordResetRequests();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to approve password reset'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to approve password reset'));
            }
          }
        }
      ]
    );
  };

  const handleRejectReset = async (request: PasswordResetRequest) => {
    Alert.prompt(
      'Reject Password Reset',
      `Please provide a reason for rejecting ${request.full_name}'s password reset request:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              dispatch(showErrorNotification('Please provide a reason for rejection'));
              return;
            }

            try {
              const result = await dispatch(processPasswordReset({
                requestId: request.id,
                action: 'reject',
                notes: reason.trim()
              }));

              if (processPasswordReset.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Password reset rejected'));
                loadPasswordResetRequests();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to reject password reset'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to reject password reset'));
            }
          }
        }
      ],
      'plain-text',
      '',
      'Enter reason for rejection...'
    );
  };

  const handleSendResetLink = async (request: PasswordResetRequest) => {
    Alert.alert(
      'Send Password Reset Link',
      `Send password reset link to ${request.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(processPasswordReset({
                requestId: request.id,
                action: 'send_link',
                notes: 'Password reset link sent via mobile admin panel'
              }));

              if (processPasswordReset.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Password reset link sent successfully'));
                loadPasswordResetRequests();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to send password reset link'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to send password reset link'));
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'approved': return Colors.primary;
      case 'completed': return Colors.success;
      case 'rejected': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'approved': return 'APPROVED';
      case 'completed': return 'COMPLETED';
      case 'rejected': return 'REJECTED';
      default: return status.toUpperCase();
    }
  };

  const renderActionButtons = (request: PasswordResetRequest) => {
    switch (request.status) {
      case 'pending':
        return (
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              compact
              onPress={() => handleApproveReset(request)}
              style={[styles.actionButton, styles.approveButton]}
              icon="check"
              buttonColor={Colors.success}
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => handleRejectReset(request)}
              style={[styles.actionButton, styles.rejectButton]}
              icon="close"
              textColor={Colors.error}
            >
              Reject
            </Button>
          </View>
        );
      
      case 'approved':
        return (
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              compact
              onPress={() => handleSendResetLink(request)}
              style={[styles.actionButton, styles.sendButton]}
              icon="email"
              buttonColor={Colors.primary}
            >
              Send Reset Link
            </Button>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderRequestItem = ({ item: request }: { item: PasswordResetRequest }) => (
    <Card style={styles.requestCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            <Text variant="titleMedium" style={styles.userName}>
              {request.full_name}
            </Text>
            <Text variant="bodyMedium" style={styles.username}>
              @{request.username}
            </Text>
            <Text variant="bodySmall" style={styles.email}>
              {request.email}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Chip
              compact
              style={[styles.roleChip]}
              textStyle={styles.roleText}
            >
              {request.role.toUpperCase()}
            </Chip>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(request.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusLabel(request.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Icon name="business" size={16} color={Colors.textSecondary} />
            <Text variant="bodySmall" style={styles.detailText}>
              {request.worksite_name}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="schedule" size={16} color={Colors.textSecondary} />
            <Text variant="bodySmall" style={styles.detailText}>
              Requested: {formatDate(request.requested_at, true)}
            </Text>
          </View>

          {request.reason && (
            <View style={styles.detailRow}>
              <Icon name="comment" size={16} color={Colors.textSecondary} />
              <Text variant="bodySmall" style={[styles.detailText, styles.reasonText]}>
                {request.reason}
              </Text>
            </View>
          )}

          {request.processed_at && (
            <View style={styles.detailRow}>
              <Icon name="person" size={16} color={Colors.textSecondary} />
              <Text variant="bodySmall" style={styles.detailText}>
                Processed by {request.processed_by} on {formatDate(request.processed_at, true)}
              </Text>
            </View>
          )}

          {request.notes && (
            <View style={styles.notesContainer}>
              <Text variant="bodySmall" style={styles.notesText}>
                Notes: {request.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {renderActionButtons(request)}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="lock-reset" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No password reset requests</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'All password reset requests are handled!'}
      </Text>
    </View>
  );

  // Get queue statistics
  const queueStats = useMemo(() => {
    const stats = {
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
    };

    filteredAndSortedRequests.forEach(request => {
      stats[request.status]++;
    });

    return stats;
  }, [filteredAndSortedRequests]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search reset requests..."
          onChangeText={handleSearchChange}
          style={styles.searchbar}
        />
      </View>

      {/* Queue Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>{queueStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{queueStats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>{queueStats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>{queueStats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Password Reset Requests List */}
      <FlatList
        data={filteredAndSortedRequests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRequestItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  searchbar: {
    backgroundColor: Colors.surface,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: 12,
    ...Shadow.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
    paddingBottom: 100,
    flexGrow: 1,
  },
  requestCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  cardContent: {
    paddingVertical: Spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  userName: {
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs / 2,
  },
  username: {
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  email: {
    color: Colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  roleChip: {
    height: 20,
    backgroundColor: Colors.primaryContainer,
  },
  roleText: {
    color: Colors.onPrimaryContainer,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: Colors.textOnPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requestDetails: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  detailText: {
    color: Colors.textSecondary,
    flex: 1,
  },
  reasonText: {
    fontStyle: 'italic',
  },
  notesContainer: {
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.sm,
    borderRadius: 6,
    marginTop: Spacing.xs,
  },
  notesText: {
    color: Colors.text,
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  actionButton: {
    minWidth: 100,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    borderColor: Colors.error,
  },
  sendButton: {
    backgroundColor: Colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PasswordResetScreen;