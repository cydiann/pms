import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import RequestListItem from '../common/RequestListItem';

function PurchasingRequestsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPurchasingRequests = useCallback(async () => {
    try {
      setError(null);
      const response = await requestService.getAllRequests({
        status: ['approved', 'purchasing', 'ordered', 'delivered']
      });
      setRequests(Array.isArray(response) ? response : response.results || []);
    } catch (err) {
      setError(t('errors.failedToLoadRequests'));
      console.error('Error loading purchasing requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadPurchasingRequests();
  }, [loadPurchasingRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPurchasingRequests();
  }, [loadPurchasingRequests]);

  const handleRequestPress = useCallback((request: Request) => {
    // TODO: Navigate to request detail screen with purchasing actions
    console.log('Open request detail:', request.id);
  }, []);

  const renderRequestItem = useCallback(({ item }: { item: Request }) => (
    <RequestListItem request={item} onPress={handleRequestPress} />
  ), [handleRequestPress]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('purchasing.noRequestsTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('purchasing.noRequestsMessage')}
      </Text>
    </View>
  ), [t]);

  const renderErrorState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('errors.loadingError')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {error}
      </Text>
    </View>
  ), [t, error]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('purchasing.queueTitle')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('purchasing.queueSubtitle', { count: requests.length })}
        </Text>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={error ? renderErrorState : renderEmptyState}
        contentContainerStyle={
          requests.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default PurchasingRequestsScreen;