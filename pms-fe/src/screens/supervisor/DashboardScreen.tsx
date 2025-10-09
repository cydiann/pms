import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { useTab } from '../../store/TabContext';
import requestService from '../../services/requestService';
import { RequestStats, Request } from '../../types/requests';

function SupervisorDashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { setActiveTab } = useTab();
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      // Load supervisor statistics (for subordinates)
      const supervisorStats = await requestService.getSubordinateStats();
      setStats(supervisorStats);

      // Load pending approval requests (requests that need this supervisor's approval)
      const pendingResponse = await requestService.getPendingApprovals();
      // Take only first 5 for dashboard display
      setPendingRequests(pendingResponse.slice(0, 5));
    } catch (error) {
      // Handle error appropriately without console logging
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleReviewRequests = useCallback((): void => {
    setActiveTab('teamRequests');
  }, [setActiveTab]);

  const handleManageTeam = useCallback((): void => {
    setActiveTab('myTeam');
  }, [setActiveTab]);

  const handleViewPendingApprovals = useCallback((): void => {
    setActiveTab('pendingApprovals');
  }, [setActiveTab]);

  const getStatusIndicatorStyle = useCallback((status: string): ViewStyle => ({
    ...styles.statusIndicator,
    backgroundColor: requestService.getStatusColor(status),
  }), []);

  const renderPendingRequestItem = useCallback(({ item }: { item: Request }): React.JSX.Element => (
    <TouchableOpacity style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestTitle}>{item.item}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{t(`status.${item.status}`)}</Text>
        </View>
      </View>
      <Text style={styles.requestCreator}>By: {item.created_by_name}</Text>
      <Text style={styles.requestDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('forms.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          {t('dashboard.welcome')}, {authState.user?.first_name}!
        </Text>
        <Text style={styles.subtitle}>
          {t('dashboard.supervisorSubtitle')}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={handleViewPendingApprovals}
          activeOpacity={0.8}
        >
          <Text style={styles.statNumber}>{stats?.pending_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.pendingApprovals')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={handleReviewRequests}
          activeOpacity={0.8}
        >
          <Text style={styles.statNumber}>{stats?.total_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.teamRequests')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={handleReviewRequests}
          activeOpacity={0.8}
        >
          <Text style={styles.statNumber}>{stats?.approved_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.approved')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.pendingApprovals')}</Text>
        {pendingRequests.length > 0 ? (
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequestItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.placeholder}>{t('dashboard.noPendingRequests')}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleReviewRequests}
        >
          <Text style={styles.actionButtonText}>
            📋 {t('dashboard.reviewRequests')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {stats?.pending_requests || 0} {t('dashboard.awaitingApproval')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleManageTeam}
        >
          <Text style={styles.actionButtonText}>
            👥 {t('dashboard.manageTeam')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {t('dashboard.viewTeamRequests')}
          </Text>
        </TouchableOpacity>
      </View>

      {stats && stats.total_requests > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.teamStatusBreakdown')}</Text>
          
          {Object.entries(stats.requests_by_status).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <View style={getStatusIndicatorStyle(status)} />
              <Text style={styles.statusLabel}>
                {t(`status.${status}`)}
              </Text>
              <Text style={styles.statusCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  statsContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center' as const,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#007bff',
    marginBottom: 4,
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
  requestItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  requestCreator: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomColor: '#f1f3f4',
    borderBottomWidth: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center' as const,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic' as const,
  },
} as const);

export default SupervisorDashboardScreen as () => React.JSX.Element;
