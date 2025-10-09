import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { useTab } from '../../store/TabContext';
import requestService from '../../services/requestService';
import { Request, RequestStatus } from '../../types/requests';
import RequestDetailModal from '../../components/modals/RequestDetailModal';

type QueueStats = {
  readonly total: number;
  readonly approved: number;
  readonly purchasing: number;
};

const MAX_PREVIEW_ITEMS = 5;

function PurchasingDashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { setActiveTab } = useTab();

  const [stats, setStats] = useState<QueueStats>({ total: 0, approved: 0, purchasing: 0 });
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const response = await requestService.getPurchasingQueue({ page_size: 100 });
      const requests = response.results ?? [];
      const statusCounts = requests.reduce<Record<string, number>>((acc, req) => {
        acc[req.status] = (acc[req.status] ?? 0) + 1;
        return acc;
      }, {});

      setStats({
        total: response.count ?? requests.length,
        approved: statusCounts[RequestStatus.APPROVED] ?? 0,
        purchasing: statusCounts[RequestStatus.PURCHASING] ?? 0,
      });
      setRecentRequests(requests.slice(0, MAX_PREVIEW_ITEMS));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load purchasing dashboard');
      setStats({ total: 0, approved: 0, purchasing: 0 });
      setRecentRequests([]);
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

  const handleViewQueue = useCallback((): void => {
    setActiveTab('purchasingQueue');
  }, [setActiveTab]);

  const handleViewDeliveries = useCallback((): void => {
    setActiveTab('deliveryTracking');
  }, [setActiveTab]);

  const handleRequestPress = useCallback((request: Request): void => {
    setSelectedRequest(request);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback((): void => {
    setModalVisible(false);
    setSelectedRequest(null);
  }, []);

  const handleRequestUpdated = useCallback((): void => {
    loadDashboardData();
  }, [loadDashboardData]);

  const hasData = useMemo(() => stats.total > 0, [stats.total]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centeredContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.errorTitle}>{t('messages.error')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          {t('dashboard.welcome')}, {authState.user?.first_name}!
        </Text>
        <Text style={styles.subtitle}>{t('purchasing.queue')}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('dashboard.totalRequests')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.approved}</Text>
          <Text style={styles.statLabel}>{t('status.approved')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.purchasing}</Text>
          <Text style={styles.statLabel}>{t('status.purchasing')}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleViewQueue}>
          <Text style={styles.actionButtonText}>📦 {t('purchasing.queue')}</Text>
          <Text style={styles.actionButtonSubtext}>
            {t('dashboard.viewMyRequests')} ({stats.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleViewDeliveries}>
          <Text style={styles.actionButtonText}>🚚 {t('delivery.tracking')}</Text>
          <Text style={styles.actionButtonSubtext}>{t('dashboard.pendingRequests')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('purchasing.actions')}</Text>
        {hasData ? (
          recentRequests.map(request => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestRow}
              onPress={() => handleRequestPress(request)}
              activeOpacity={0.7}
            >
              <View style={styles.requestHeaderRow}>
                <Text style={styles.requestNumber}>{request.request_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: requestService.getStatusColor(request.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{t(`status.${request.status}`)}</Text>
                </View>
              </View>
              <Text style={styles.requestTitle}>{request.item}</Text>
              <Text style={styles.requestMeta}>
                {t('requests.requestedBy')}: {request.created_by_name}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{t('purchasing.noRequestsTitle')}</Text>
            <Text style={styles.emptyStateMessage}>{t('purchasing.noRequestsMessage')}</Text>
          </View>
        )}
      </View>
      <RequestDetailModal
        visible={modalVisible}
        onClose={handleModalClose}
        request={selectedRequest}
        onRequestUpdated={handleRequestUpdated}
        canApprove={false}
        canPurchase={true}
      />
    </ScrollView>
  );
}

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
  centeredContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#6c757d',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  requestRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  requestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 14,
    color: '#6c757d',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default PurchasingDashboardScreen;
