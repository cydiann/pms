import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import { PaginatedResponse } from '../../types/api';
import RequestDetailModal from '../../components/modals/RequestDetailModal';

function PurchasingQueueScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'purchasing'>('all');

  const loadPurchasingQueue = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response: PaginatedResponse<Request> = await requestService.getPurchasingQueue();
      let filtered = response.results || [];

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
      }

      setRequests(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchasing queue');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPurchasingQueue();
  }, [loadPurchasingQueue]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadPurchasingQueue();
  }, [loadPurchasingQueue]);

  const getStatusColor = useCallback((status: string): string => {
    return requestService.getStatusColor(status);
  }, []);

  const handleRequestPress = useCallback((request: Request): void => {
    setSelectedRequest(request);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback((): void => {
    setModalVisible(false);
    setSelectedRequest(null);
  }, []);

  const handleRequestUpdated = useCallback((): void => {
    loadPurchasingQueue();
  }, [loadPurchasingQueue]);

  const getStatusBadgeStyle = useCallback((status: string): ViewStyle => ({
    ...styles.statusBadge,
    backgroundColor: getStatusColor(status),
  }), [getStatusColor]);

  const getDaysWaiting = useCallback((request: Request): number => {
    const approvedDate = request.submitted_at || request.created_at;
    const now = new Date();
    const diff = now.getTime() - new Date(approvedDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, []);

  const renderRequestItem = useCallback(({ item }: { item: Request }): React.JSX.Element => {
    const daysWaiting = getDaysWaiting(item);
    const isUrgent = daysWaiting > 5;

    return (
      <TouchableOpacity
        style={[
          styles.requestItem,
          isUrgent && styles.requestItemUrgent,
        ]}
        onPress={() => handleRequestPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <Text style={styles.requestNumber}>{item.request_number}</Text>
          <View style={styles.headerBadges}>
            <View style={[getStatusBadgeStyle(item.status), styles.statusBadgeContainer]}>
              <Text style={[styles.statusText, styles.statusBadgeText]} numberOfLines={2}>
                {t(`status.${item.status}`)}
              </Text>
            </View>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>{t('purchasing.urgent')}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.requestTitle}>{item.item}</Text>

        <View style={styles.requestDetails}>
          <Text style={styles.detailText}>
            {t('requests.requestedBy')}: {item.created_by_name}
          </Text>
          <Text style={styles.detailText}>
            {t('requests.quantity')}: {item.quantity} {item.unit_display}
          </Text>
          {item.category && (
            <Text style={styles.detailText}>
              {t('requests.category')}: {item.category}
            </Text>
          )}
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.waitingInfo}>
            <Text style={[styles.waitingText, isUrgent && styles.waitingTextUrgent]}>
              {t('purchasing.waitingDays', { count: daysWaiting })}
            </Text>
          </View>
          {item.revision_count > 0 && (
            <Text style={styles.revisionText}>
              {t('requests.revision')} {item.revision_count}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleRequestPress, getStatusBadgeStyle, getDaysWaiting, t]);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('purchasing.noRequestsTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('purchasing.noRequestsMessage')}
      </Text>
    </View>
  ), [t]);

  const renderLoadingState = useCallback((): React.JSX.Element => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.loadingText}>{t('common.loading')}</Text>
    </View>
  ), [t]);

  const renderErrorState = useCallback((): React.JSX.Element => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>{t('messages.error')}</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
        <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  ), [error, onRefresh, t]);

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('purchasing.queue')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{requests.length}</Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.filterButtonTextActive]}>
            {t('filters.allStatuses')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'approved' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('approved')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'approved' && styles.filterButtonTextActive]}>
            {t('status.approved')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'purchasing' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('purchasing')}
        >
          <Text style={[styles.filterButtonText, statusFilter === 'purchasing' && styles.filterButtonTextActive]}>
            {t('status.purchasing')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
      />

      <RequestDetailModal
        visible={modalVisible}
        onClose={handleModalClose}
        request={selectedRequest}
        onRequestUpdated={handleRequestUpdated}
        canApprove={false}
        canPurchase={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#6f42c1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  requestItem: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
  },
  requestItemUrgent: {
    borderLeftColor: '#dc3545',
    borderLeftWidth: 6,
  },
  urgentBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  urgentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  requestHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  headerBadges: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  requestNumber: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeContainer: {
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  statusBadgeText: {
    textAlign: 'center',
    width: '100%',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
    marginTop: 4,
  },
  waitingInfo: {
    flex: 1,
  },
  waitingText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  waitingTextUrgent: {
    color: '#dc3545',
  },
  revisionText: {
    fontSize: 12,
    color: '#fd7e14',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingState: {
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
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PurchasingQueueScreen as () => React.JSX.Element;
