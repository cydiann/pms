import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import requestService from '../../services/requestService';
import { RequestStats } from '../../types/requests';

const EmployeeDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const dashboardStats = await requestService.getDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

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
          {t('dashboard.employeeSubtitle')}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pending_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.pendingRequests')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.approved_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.approvedRequests')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.draft_requests || 0}</Text>
          <Text style={styles.statLabel}>{t('dashboard.draftRequests')}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            📝 {t('dashboard.createRequest')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {t('dashboard.createRequestSubtext')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            📋 {t('dashboard.viewMyRequests')}
          </Text>
          <Text style={styles.actionButtonSubtext}>
            {stats?.total_requests || 0} {t('dashboard.totalRequests')}
          </Text>
        </TouchableOpacity>
      </View>

      {stats && stats.total_requests > 0 && (
        <View style={styles.statusBreakdown}>
          <Text style={styles.sectionTitle}>{t('dashboard.statusBreakdown')}</Text>
          
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
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  quickActions: {
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
  statusBreakdown: {
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
});

export default EmployeeDashboardScreen;