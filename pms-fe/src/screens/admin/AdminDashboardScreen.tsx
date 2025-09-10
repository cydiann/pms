import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { useTab } from '../../store/TabContext';
import requestService from '../../services/requestService';
import { AdminStats, Request } from '../../types/requests';

function AdminDashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { setActiveTab } = useTab();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      // Load admin statistics for entire system
      const adminStats = await requestService.getAdminStats();
      setStats(adminStats);

      // Load recent system requests
      const recentResponse = await requestService.getAllRequests({
        ordering: '-created_at',
        page_size: 5
      });
      setRecentRequests(recentResponse.results);
    } catch (error) {
      // TODO: Add proper error handling/user feedback
      console.error('Error loading admin dashboard:', error);
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

  const renderRecentRequestItem = useCallback(({ item }: { item: Request }): React.JSX.Element => (
    <TouchableOpacity style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestTitle}>{item.item}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: requestService.getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{item.status_display}</Text>
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
          {t('dashboard.adminSubtitle')}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.total_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.totalRequests')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.totalUsers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pending_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.pendingApprovals')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.systemOverview')}</Text>
        
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNumber}>{stats?.approved_requests || 0}</Text>
            <Text style={styles.overviewLabel}>{t('dashboard.approvedRequests')}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNumber}>{stats?.completed_requests || 0}</Text>
            <Text style={styles.overviewLabel}>{t('dashboard.completedRequests')}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNumber}>{stats?.rejected_requests || 0}</Text>
            <Text style={styles.overviewLabel}>{t('dashboard.rejectedRequests')}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNumber}>{stats?.active_users || 0}</Text>
            <Text style={styles.overviewLabel}>{t('dashboard.activeUsers')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.recentRequests')}</Text>
        {recentRequests.length > 0 ? (
          <FlatList
            data={recentRequests}
            renderItem={renderRecentRequestItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.placeholder}>{t('dashboard.noRecentRequests')}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setActiveTab('allRequests')}
        >
          <Text style={styles.actionButtonText}>
            📋 {t('dashboard.manageRequests')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {t('dashboard.viewAllRequests')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setActiveTab('userManagement')}
        >
          <Text style={styles.actionButtonText}>
            👥 {t('dashboard.manageUsers')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {stats?.total_users || 0} {t('dashboard.totalSystemUsers')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setActiveTab('worksiteManagement')}
        >
          <Text style={styles.actionButtonText}>
            🏢 {t('navigation.worksites')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {t('worksiteManagement.title')}
          </Text>
        </TouchableOpacity>
      </View>

      {stats && stats.total_requests > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.systemStatusBreakdown')}</Text>
          
          {Object.entries(stats.requests_by_status).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: requestService.getStatusColor(status) }
              ]} />
              <Text style={styles.statusLabel}>
                {requestService.getStatusDisplay(status)}
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
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
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
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
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
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default AdminDashboardScreen as () => React.JSX.Element;