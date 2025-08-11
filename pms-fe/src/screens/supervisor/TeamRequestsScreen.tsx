import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Badge, Chip, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchTeamRequests, 
  performBulkApproval,
  selectTeamRequestItems,
  selectRequestsLoading,
  selectHasMoreRequests,
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
  sortBy: 'created_at' | 'updated_at' | 'item' | 'status';
  sortOrder: 'asc' | 'desc';
}

const TeamRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  
  const teamRequests = useAppSelector(selectTeamRequestItems);
  const isLoading = useAppSelector(selectRequestsLoading);
  const hasMore = useAppSelector(selectHasMoreRequests);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    statuses: ['pending', 'in_review'],
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    // Load team requests on mount
    loadTeamRequests();
  }, []);

  const loadTeamRequests = () => {
    dispatch(clearRequests());
    const orderingPrefix = filters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${filters.sortBy}`;
    
    dispatch(fetchTeamRequests({ 
      page: 1,
      ordering,
      status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
    }));
  };

  // Apply filters and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = teamRequests;

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
  }, [teamRequests, searchQuery, filters]);

  const onRefresh = () => {
    loadTeamRequests();
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Reload requests with new filters
    const orderingPrefix = newFilters.sortOrder === 'desc' ? '-' : '';
    const ordering = `${orderingPrefix}${newFilters.sortBy}`;
    
    dispatch(clearRequests());
    dispatch(fetchTeamRequests({ 
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

  const toggleRequestSelection = (requestId: number) => {
    const newSelection = new Set(selectedRequests);
    if (newSelection.has(requestId)) {
      newSelection.delete(requestId);
    } else {
      newSelection.add(requestId);
    }
    setSelectedRequests(newSelection);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (!selectionMode) {
      setSelectedRequests(new Set());
    }
  };

  const selectAllVisibleRequests = () => {
    const approvableRequests = filteredAndSortedRequests
      .filter(request => ['pending', 'in_review'].includes(request.status))
      .map(request => request.id);
    setSelectedRequests(new Set(approvableRequests));
  };

  const clearSelection = () => {
    setSelectedRequests(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) return;

    try {
      const result = await dispatch(performBulkApproval({
        requestIds: Array.from(selectedRequests),
        action: 'approve',
        notes: 'Bulk approved via mobile app'
      }));

      if (performBulkApproval.fulfilled.match(result)) {
        dispatch(showSuccessNotification(
          `Successfully approved ${selectedRequests.size} request${selectedRequests.size > 1 ? 's' : ''}`
        ));
        setSelectedRequests(new Set());
        setSelectionMode(false);
        loadTeamRequests();
      } else {
        dispatch(showErrorNotification(
          result.payload as string || 'Failed to bulk approve requests'
        ));
      }
    } catch (error) {
      dispatch(showErrorNotification('Failed to bulk approve requests'));
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequests.size === 0) return;

    try {
      const result = await dispatch(performBulkApproval({
        requestIds: Array.from(selectedRequests),
        action: 'reject',
        notes: 'Bulk rejected via mobile app'
      }));

      if (performBulkApproval.fulfilled.match(result)) {
        dispatch(showSuccessNotification(
          `Successfully rejected ${selectedRequests.size} request${selectedRequests.size > 1 ? 's' : ''}`
        ));
        setSelectedRequests(new Set());
        setSelectionMode(false);
        loadTeamRequests();
      } else {
        dispatch(showErrorNotification(
          result.payload as string || 'Failed to bulk reject requests'
        ));
      }
    } catch (error) {
      dispatch(showErrorNotification('Failed to bulk reject requests'));
    }
  };

  const getActiveFilterCount = (): number => {
    return filters.statuses.length + 
           (filters.sortBy !== 'created_at' ? 1 : 0) + 
           (filters.sortOrder !== 'desc' ? 1 : 0);
  };

  const renderRequestItem = ({ item: request }: { item: Request }) => {
    const isSelected = selectedRequests.has(request.id);
    const canBeSelected = ['pending', 'in_review'].includes(request.status);
    
    return (
      <Card
        style={[
          styles.requestCard,
          isSelected && styles.selectedCard,
          selectionMode && canBeSelected && styles.selectableCard
        ]}
        onPress={() => {
          if (selectionMode && canBeSelected) {
            toggleRequestSelection(request.id);
          } else {
            navigateToRequestDetails(request.id);
          }
        }}
        onLongPress={() => {
          if (canBeSelected) {
            if (!selectionMode) {
              setSelectionMode(true);
            }
            toggleRequestSelection(request.id);
          }
        }}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.requestHeader}>
            <View style={styles.requestInfo}>
              {selectionMode && canBeSelected && (
                <View style={styles.selectionIndicator}>
                  <Icon
                    name={isSelected ? "check-circle" : "radio-button-unchecked"}
                    size={20}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.requestContent}>
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
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="assignment" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No team requests found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'No pending requests from your team'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search team requests..."
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

      {/* Selection Controls */}
      {selectionMode && (
        <View style={styles.selectionControls}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedRequests.size} selected
            </Text>
          </View>
          
          <View style={styles.selectionActions}>
            <Button
              mode="outlined"
              compact
              onPress={selectAllVisibleRequests}
              style={styles.selectionButton}
            >
              Select All
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={clearSelection}
              style={styles.selectionButton}
            >
              Clear
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={toggleSelectionMode}
              style={styles.selectionButton}
            >
              Cancel
            </Button>
          </View>
        </View>
      )}

      {/* Team Requests List */}
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

      {/* Bulk Action Buttons */}
      {selectionMode && selectedRequests.size > 0 && (
        <View style={styles.bulkActionContainer}>
          <Button
            mode="contained"
            onPress={handleBulkApprove}
            disabled={isLoading}
            loading={isLoading}
            style={[styles.bulkButton, styles.approveButton]}
            icon="check"
            buttonColor={Colors.success}
          >
            Approve ({selectedRequests.size})
          </Button>
          <Button
            mode="outlined"
            onPress={handleBulkReject}
            disabled={isLoading}
            style={[styles.bulkButton, styles.rejectButton]}
            icon="close"
            textColor={Colors.error}
          >
            Reject ({selectedRequests.size})
          </Button>
        </View>
      )}

      {/* Selection Mode FAB */}
      {!selectionMode && (
        <FAB
          icon="select-all"
          label="Bulk Actions"
          onPress={toggleSelectionMode}
          style={styles.fab}
          color={Colors.textOnPrimary}
        />
      )}
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
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  selectionButton: {
    minWidth: 60,
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
  selectedCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  selectableCard: {
    borderColor: Colors.outline,
    borderWidth: 1,
    borderStyle: 'dashed',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: Spacing.sm,
  },
  selectionIndicator: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  requestContent: {
    flex: 1,
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
  bulkActionContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bulkButton: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    borderColor: Colors.error,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
  },
});

export default TeamRequestsScreen;