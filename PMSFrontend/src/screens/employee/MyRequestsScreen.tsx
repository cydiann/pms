import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchRequests, 
  selectRequestItems, 
  selectRequestsLoading, 
  selectHasMoreRequests,
  clearRequests
} from '@/store/slices/requestsSlice';

import FilterModal from '@/components/common/FilterModal';
import { Colors, Spacing, Shadow } from '@/constants/theme';
import { SCREENS, REQUEST_STATUS_LABELS } from '@/constants/app';
import { formatDate, formatRequestNumber, debounce } from '@/utils/helpers';
import { Request, RequestStatus } from '@/types/requests';

interface FilterOptions {
  statuses: RequestStatus[];
  sortBy: 'created_at' | 'updated_at' | 'item' | 'status';
  sortOrder: 'asc' | 'desc';
}

const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const requests = useAppSelector(selectRequestItems);
  const isLoading = useAppSelector(selectRequestsLoading);
  const hasMore = useAppSelector(selectHasMoreRequests);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    statuses: [],
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    // Load requests on mount
    loadRequests();
  }, []);

  const loadRequests = () => {
    dispatch(clearRequests());
    const orderingPrefix = filters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${filters.sortBy}`;
    
    dispatch(fetchRequests({ 
      page: 1,
      ordering,
      status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
    }));
  };

  // Apply filters and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(request =>
        request.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  }, [requests, searchQuery, filters]);

  const onRefresh = () => {
    loadRequests();
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Reload requests with new filters
    const orderingPrefix = newFilters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${newFilters.sortBy}`;
    
    dispatch(clearRequests());
    dispatch(fetchRequests({ 
      page: 1,
      ordering,
      status: newFilters.statuses.length > 0 ? newFilters.statuses.join(',') : undefined,
    }));
  };

  const handleSearchChange = (query: string) => {
    debouncedSearch(query);
  };

  const navigateToCreateRequest = () => {
    navigation.navigate(SCREENS.CREATE_REQUEST as never);
  };

  const navigateToRequestDetails = (requestId: number) => {
    navigation.navigate(SCREENS.REQUEST_DETAILS as never, { requestId });
  };

  const getActiveFilterCount = (): number => {
    return filters.statuses.length + 
           (filters.sortBy !== 'created_at' ? 1 : 0) + 
           (filters.sortOrder !== 'desc' ? 1 : 0);
  };

  const renderRequestItem = ({ item: request }: { item: Request }) => (
    <Card
      style={styles.requestCard}
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
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: Colors.status[request.status] }
          ]}>
            <Text style={styles.statusText}>
              {REQUEST_STATUS_LABELS[request.status]}
            </Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <Text variant="bodyMedium" style={styles.quantity}>
            Quantity: {request.quantity} {request.unit}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            Created: {formatDate(request.created_at)}
          </Text>
        </View>

        {request.description && (
          <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
            {request.description}
          </Text>
        )}

        <View style={styles.requestActions}>
          {request.status === 'draft' && (
            <Text style={styles.actionHint}>Tap to edit or submit</Text>
          )}
          {request.status === 'revision_requested' && (
            <Text style={styles.revisionHint}>Revision required</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="inbox" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No requests found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'Create your first procurement request'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search requests..."
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

      {/* Request List */}
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

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="New Request"
        onPress={navigateToCreateRequest}
        style={styles.fab}
        color={Colors.textOnPrimary}
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
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
    paddingBottom: 100, // Space for FAB
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
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  requestActions: {
    alignItems: 'flex-end',
  },
  actionHint: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  revisionHint: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
  },
});

export default MyRequestsScreen;