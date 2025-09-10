import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { Subordinate } from '../../types/users';

function MyTeamScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [teamMembers, setTeamMembers] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const subordinates = await userService.getSubordinates();
      setTeamMembers(subordinates);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
      setTeamMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadTeamMembers();
  }, [loadTeamMembers]);

  const renderTeamMemberItem = useCallback(({ item }: { item: Subordinate }): React.JSX.Element => (
    <TouchableOpacity style={styles.memberItem}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.full_name}</Text>
          <Text style={styles.memberUsername}>@{item.username}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive
        ]}>
          <Text style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        {item.worksite_name && (
          <Text style={styles.detailText}>
            🏢 {item.worksite_name}
          </Text>
        )}
        <Text style={styles.detailText}>
          📅 Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      {(item.total_requests !== undefined || item.pending_requests !== undefined) && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.total_requests || 0}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.pending_requests || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.approved_requests || 0}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  ), []);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('supervisor.noTeamMembersTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('supervisor.noTeamMembersMessage')}
      </Text>
    </View>
  ), [t]);

  const renderErrorState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('messages.error')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {error}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTeamMembers}>
        <Text style={styles.retryButtonText}>
          {t('actions.retry', { defaultValue: 'Retry' })}
        </Text>
      </TouchableOpacity>
    </View>
  ), [error, loadTeamMembers, t]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('forms.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('supervisor.myTeamTitle')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('supervisor.teamMemberCount', { count: teamMembers.length })}
        </Text>
      </View>
      
      <FlatList
        data={teamMembers}
        renderItem={renderTeamMemberItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={error ? renderErrorState : renderEmptyState}
        contentContainerStyle={teamMembers.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  memberItem: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  memberHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#28a745',
  },
  statusBadgeInactive: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600' as const,
  },
  memberDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingTop: 12,
    borderTopColor: '#f1f3f4',
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#007bff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center' as const,
  },
} as const);

export default MyTeamScreen as () => React.JSX.Element;