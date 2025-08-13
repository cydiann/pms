import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';

const MyRequestsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setError(null);
      const response = await requestService.getMyRequests();
      setRequests(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const getStatusColor = (status: string) => {
    return requestService.getStatusColor(status);
  };

  const renderRequestItem = ({ item }: { item: Request }) => (
    <TouchableOpacity style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestNumber}>{item.request_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status_display}</Text>
        </View>
      </View>
      
      <Text style={styles.requestTitle}>{item.item}</Text>
      
      <View style={styles.requestDetails}>
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
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.revision_count > 0 && (
          <Text style={styles.revisionText}>
            Rev. {item.revision_count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('requests.noRequestsTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('requests.noRequestsMessage')}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('messages.error')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {error}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadRequests}>
        <Text style={styles.retryButtonText}>
          {t('actions.retry', { defaultValue: 'Retry' })}
        </Text>
      </TouchableOpacity>
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
      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={error ? renderErrorState : renderEmptyState}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : undefined}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
});

export default MyRequestsScreen;