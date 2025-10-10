import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import RequestDetailModal from '../../components/modals/RequestDetailModal';

function PendingApprovalsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadPendingApprovals = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await requestService.getPendingApprovals();
      setRequests(response || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending approvals');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadPendingApprovals();
  }, [loadPendingApprovals]);

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
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const getStatusBadgeStyle = useCallback((status: string): ViewStyle => ({
    ...styles.statusBadge,
    backgroundColor: getStatusColor(status),
  }), [getStatusColor]);

  const renderRequestItem = useCallback(({ item }: { item: Request }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.requestItem}
      onPress={() => handleRequestPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestNumber}>{item.request_number}</Text>
        <View style={getStatusBadgeStyle(item.status)}>
          <Text style={styles.statusText}>{t(`status.${item.status}`)}</Text>
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
        <Text style={styles.dateText}>
          {t('requests.submitted')}: {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : t('common.notSubmitted')}
        </Text>
        {item.revision_count > 0 && (
          <Text style={styles.revisionText}>
            {t('requests.revision')} {item.revision_count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleRequestPress, getStatusBadgeStyle, t]);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('supervisor.noPendingApprovalsTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('supervisor.noPendingApprovalsMessage')}
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
        <Text style={styles.headerTitle}>{t('supervisor.pendingApprovals')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{requests.length}</Text>
        </View>
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
        canApprove={true}
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
    backgroundColor: '#007bff',
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
  listContent: {
    padding: 8,
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
    borderLeftColor: '#ffc107',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requestDetails: {
    marginBottom: 8,
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
  dateText: {
    fontSize: 12,
    color: '#6c757d',
  },
  revisionText: {
    fontSize: 12,
    color: '#fd7e14',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
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

export default PendingApprovalsScreen as () => React.JSX.Element;
