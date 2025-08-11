import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Badge, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchPurchasingQueue,
  updatePurchasingStatus,
  selectPurchasingQueueItems,
  selectRequestsLoading,
  clearRequests
} from '@/store/slices/requestsSlice';
import { selectUser } from '@/store/slices/authSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import FilterModal from '@/components/common/FilterModal';
import { Colors, Spacing, Shadow } from '@/constants/theme';
import { SCREENS, REQUEST_STATUS_LABELS, SUCCESS_MESSAGES } from '@/constants/app';
import { formatDate, formatRequestNumber, debounce } from '@/utils/helpers';
import { Request, RequestStatus } from '@/types/requests';

interface FilterOptions {
  statuses: RequestStatus[];
  sortBy: 'created_at' | 'updated_at' | 'item' | 'status' | 'priority';
  sortOrder: 'asc' | 'desc';
}

const PurchasingQueueScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  
  const purchasingQueue = useAppSelector(selectPurchasingQueueItems);
  const isLoading = useAppSelector(selectRequestsLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    statuses: ['approved', 'purchasing', 'ordered'],
    sortBy: 'created_at',
    sortOrder: 'asc', // Oldest first for purchasing queue
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    // Load purchasing queue on mount
    loadPurchasingQueue();
  }, []);

  const loadPurchasingQueue = () => {
    dispatch(clearRequests());
    const orderingPrefix = filters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${filters.sortBy}`;
    
    dispatch(fetchPurchasingQueue({ 
      page: 1,
      ordering,
      status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
    }));
  };

  // Apply filters and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = purchasingQueue;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(request =>
        request.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter (client-side for immediate feedback)
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(request => 
        filters.statuses.includes(request.status)
      );
    }

    return filtered;
  }, [purchasingQueue, searchQuery, filters]);

  const onRefresh = () => {
    loadPurchasingQueue();
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Reload requests with new filters
    const orderingPrefix = newFilters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${newFilters.sortBy}`;
    
    dispatch(clearRequests());
    dispatch(fetchPurchasingQueue({ 
      page: 1,
      ordering,
      status: newFilters.statuses.length > 0 ? newFilters.statuses.join(',') : undefined,
    }));
  };

  const handleSearchChange = (query: string) => {
    debouncedSearch(query);
  };

  const navigateToRequestDetails = (requestId: number) => {
    navigation.navigate(SCREENS.REQUEST_DETAILS as never, { requestId });
  };

  const handleStartPurchasing = async (requestId: number) => {
    Alert.alert(
      'Start Purchasing Process',
      'Mark this request as being processed by the purchasing team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(updatePurchasingStatus({
                requestId,
                status: 'purchasing',
                notes: 'Started purchasing process via mobile app'
              }));

              if (updatePurchasingStatus.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Request marked as being purchased'));
                loadPurchasingQueue();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to update status'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to update status'));
            }
          }
        }
      ]
    );
  };

  const handleMarkOrdered = async (requestId: number) => {
    Alert.prompt(
      'Mark as Ordered',
      'Enter order details (order number, supplier, etc.):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Ordered',
          style: 'default',
          onPress: async (notes) => {
            if (!notes?.trim()) {
              dispatch(showErrorNotification('Please provide order details'));
              return;
            }

            try {
              const result = await dispatch(updatePurchasingStatus({
                requestId,
                status: 'ordered',
                notes: notes.trim()
              }));

              if (updatePurchasingStatus.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Request marked as ordered'));
                loadPurchasingQueue();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to mark as ordered'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to mark as ordered'));
            }
          }
        }
      ],
      'plain-text',
      '',
      'Order #12345, Supplier: ABC Corp'
    );
  };

  const handleMarkDelivered = async (requestId: number) => {
    Alert.prompt(
      'Mark as Delivered',
      'Enter delivery details:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          style: 'default',
          onPress: async (notes) => {
            if (!notes?.trim()) {
              dispatch(showErrorNotification('Please provide delivery details'));
              return;
            }

            try {
              const result = await dispatch(updatePurchasingStatus({
                requestId,
                status: 'delivered',
                notes: notes.trim()
              }));

              if (updatePurchasingStatus.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Request marked as delivered'));
                loadPurchasingQueue();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to mark as delivered'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to mark as delivered'));
            }
          }
        }
      ],
      'plain-text',
      '',
      'Delivered to worksite, received by John Doe'
    );
  };

  const getActiveFilterCount = (): number => {
    return filters.statuses.length + 
           (filters.sortBy !== 'created_at' ? 1 : 0) + 
           (filters.sortOrder !== 'asc' ? 1 : 0);
  };

  const getPriorityColor = (request: Request): string => {
    // Calculate priority based on request age and urgency
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreated > 7) return Colors.error;
    if (daysSinceCreated > 3) return Colors.warning;
    return Colors.success;
  };

  const getPriorityLabel = (request: Request): string => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreated > 7) return 'URGENT';
    if (daysSinceCreated > 3) return 'HIGH';
    return 'NORMAL';
  };

  const renderActionButtons = (request: Request) => {
    switch (request.status) {
      case 'approved':
        return (
          <Button
            mode="contained"
            compact
            onPress={() => handleStartPurchasing(request.id)}
            style={styles.actionButton}
            icon="shopping-cart"
            buttonColor={Colors.primary}
          >
            Start Purchasing
          </Button>
        );
      
      case 'purchasing':
        return (
          <Button
            mode="contained"
            compact
            onPress={() => handleMarkOrdered(request.id)}
            style={styles.actionButton}
            icon="receipt"
            buttonColor={Colors.warning}
          >
            Mark Ordered
          </Button>
        );
      
      case 'ordered':
        return (
          <Button
            mode="contained"
            compact
            onPress={() => handleMarkDelivered(request.id)}
            style={styles.actionButton}
            icon="local-shipping"
            buttonColor={Colors.success}
          >
            Mark Delivered
          </Button>
        );
      
      default:
        return null;
    }
  };

  const renderRequestItem = ({ item: request }: { item: Request }) => {
    const priorityColor = getPriorityColor(request);
    const priorityLabel = getPriorityLabel(request);
    
    return (
      <Card
        style={[
          styles.requestCard,
          { borderLeftWidth: 4, borderLeftColor: priorityColor }
        ]}
        onPress={() => navigateToRequestDetails(request.id)}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.requestHeader}>
            <View style={styles.requestInfo}>
              <Text variant="titleMedium" numberOfLines={1} style={styles.itemName}>
                {request.item}
              </Text>
              <Text variant="bodySmall" style={styles.requestNumber}>
                {formatRequestNumber(request.request_number)}
              </Text>
              <Text variant="bodySmall" style={styles.createdBy}>
                by {request.created_by_name}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <Chip
                compact
                style={[styles.priorityChip, { backgroundColor: priorityColor }]}
                textStyle={styles.priorityText}
              >
                {priorityLabel}
              </Chip>
              <View style={[
                styles.statusBadge,
                { backgroundColor: Colors.status[request.status] }
              ]}>
                <Text style={styles.statusText}>
                  {REQUEST_STATUS_LABELS[request.status]}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.requestDetails}>
            <Text variant="bodyMedium" style={styles.quantity}>
              Quantity: {request.quantity} {request.unit}
            </Text>
            <Text variant="bodySmall" style={styles.date}>
              Approved: {formatDate(request.updated_at)}
            </Text>
          </View>

          {request.description && (
            <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
              {request.description}
            </Text>
          )}

          {/* Action Button */}
          <View style={styles.actionContainer}>
            {renderActionButtons(request)}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="inventory" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No items in purchasing queue</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'All caught up! No pending purchases.'}
      </Text>
    </View>
  );

  // Get queue statistics
  const queueStats = useMemo(() => {
    const stats = {
      approved: 0,
      purchasing: 0,
      ordered: 0,
      urgent: 0,
    };

    filteredAndSortedRequests.forEach(request => {
      if (request.status === 'approved') stats.approved++;
      if (request.status === 'purchasing') stats.purchasing++;
      if (request.status === 'ordered') stats.ordered++;
      
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > 7) stats.urgent++;
    });

    return stats;
  }, [filteredAndSortedRequests]);

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search purchasing queue..."
          onChangeText={handleSearchChange}
          style={styles.searchbar}
        />
        <View style={styles.filterButtonContainer}>
          <IconButton
            icon="filter-list"
            size={24}
            iconColor={getActiveFilterCount() > 0 ? Colors.primary : Colors.textSecondary}
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          />
          {getActiveFilterCount() > 0 && (
            <Badge style={styles.filterBadge} size={16}>
              {getActiveFilterCount()}
            </Badge>
          )}
        </View>
      </View>

      {/* Queue Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{queueStats.approved}</Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{queueStats.purchasing}</Text>
          <Text style={styles.statLabel}>Purchasing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{queueStats.ordered}</Text>
          <Text style={styles.statLabel}>Ordered</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>{queueStats.urgent}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {/* Purchasing Queue List */}
      <FlatList
        data={filteredAndSortedRequests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRequestItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  searchbar: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  filterButtonContainer: {
    position: 'relative',
  },
  filterButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: 12,
    ...Shadow.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
    paddingBottom: 100,
    flexGrow: 1,
  },
  requestCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  cardContent: {
    paddingVertical: Spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  requestInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemName: {
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs / 2,
  },
  requestNumber: {
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs / 2,
  },
  createdBy: {
    color: Colors.primary,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  priorityChip: {
    height: 20,
  },
  priorityText: {
    color: Colors.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: Colors.textOnPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requestDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quantity: {
    color: Colors.text,
    fontWeight: '500',
  },
  date: {
    color: Colors.textSecondary,
  },
  description: {
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    minWidth: 140,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PurchasingQueueScreen;