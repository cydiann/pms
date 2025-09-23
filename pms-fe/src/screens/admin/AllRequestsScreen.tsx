import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import RequestDetailModal from '../../components/modals/RequestDetailModal';

interface RequestQueryParams {
  readonly page_size?: number;
  readonly ordering?: string;
  readonly search?: string;
  readonly status?: string;
}

function AllRequestsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const loadRequests = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Build query params, filtering out empty values
      const queryParams: RequestQueryParams = {
        page_size: 50,
        ordering: '-created_at'
      };
      
      if (searchText && searchText.trim()) {
        queryParams.search = searchText.trim();
      }
      
      if (selectedStatus && selectedStatus.trim()) {
        queryParams.status = selectedStatus.trim();
      }
      
      const response = await requestService.getAllRequests(queryParams);
      setRequests(response.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, selectedStatus]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (!loading) {
        loadRequests();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedStatus, loading, loadRequests]);

  const onRefresh = (): void => {
    setRefreshing(true);
    loadRequests();
  };

  const handleRequestPress = (request: Request): void => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  const getStatusColor = (status: string): string => {
    return requestService.getStatusColor(status);
  };

  const renderRequestItem = ({ item }: { item: Request }): React.JSX.Element => (
    <TouchableOpacity style={styles.requestItem} onPress={() => handleRequestPress(item)}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestNumber}>{item.request_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status_display}</Text>
        </View>
      </View>
      
      <Text style={styles.requestTitle}>{item.item}</Text>
      
      <View style={styles.requestDetails}>
        <Text style={styles.detailText}>
          📋 {t('requests.quantity')}: {item.quantity} {item.unit_display}
        </Text>
        {item.category && (
          <Text style={styles.detailText}>
            🏷️ {t('requests.category')}: {item.category}
          </Text>
        )}
        <Text style={styles.detailText}>
          👤 {t('requests.details.createdBy')} {item.created_by_name}
        </Text>
        {item.current_approver && (
          <Text style={styles.detailText}>
            ⏳ {t('requests.details.pendingApproval')}
          </Text>
        )}
      </View>
      
      <View style={styles.requestFooter}>
        <Text style={styles.dateText}>
          {t('requests.details.created')} {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.revision_count > 0 && (
          <Text style={styles.revisionText}>
            {t('requests.details.revision')} {item.revision_count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStatusFilter = (): React.JSX.Element => {
    const statuses = ['', 'draft', 'pending', 'approved', 'rejected', 'completed'];
    return (
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>{t('requests.filters.status')}</Text>
        <View style={styles.statusFilters}>
          {statuses.map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusFilter,
                selectedStatus === status && styles.statusFilterActive
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.statusFilterText,
                selectedStatus === status && styles.statusFilterTextActive
              ]}>
                {status ? t(`status.${status}`) : t('requests.filters.all')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = (): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {error ? t('requests.errors.loadingError') : (searchText || selectedStatus ? t('requests.noRequestsTitle') : t('requests.noRequestsTitle'))}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {error || (searchText || selectedStatus
          ? t('requests.errors.noMatchingRequests')
          : t('requests.noRequestsMessage'))}
      </Text>
      {error && (
        <TouchableOpacity style={styles.retryButton} onPress={loadRequests}>
          <Text style={styles.retryButtonText}>{t('actions.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('requests.search.placeholder')}
          value={searchText}
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
        />
      </View>
      
      <View style={styles.filtersContainer}>
        {renderStatusFilter()}
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {t('requests.stats.requestsFound', { count: requests.length })}
        </Text>
      </View>
      
      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {selectedRequest && (
        <RequestDetailModal
          visible={modalVisible}
          request={selectedRequest}
          onClose={() => {
            setModalVisible(false);
            setSelectedRequest(null);
          }}
          onRequestUpdated={loadRequests}
        />
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusFilter: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  statusFilterActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  statusFilterText: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  statusFilterTextActive: {
    color: '#fff',
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  statsText: {
    fontSize: 14,
    color: '#6c757d',
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
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
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
    fontWeight: '600',
  },
});

export default AllRequestsScreen as () => React.JSX.Element;