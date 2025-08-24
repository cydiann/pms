import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SearchBar from './SearchBar';
import SearchFilters from './SearchFilters';
import { PaginatedResponse } from '../../types/api';

interface SearchableListProps<T> {
  data: T[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  onSearch: (searchTerm: string, filters?: any) => void;
  onLoadMore?: () => void;
  onRefresh: () => void;
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  searchPlaceholder?: string;
  filterType: 'requests' | 'users' | 'documents';
  keyExtractor: (item: T) => string;
  paginationData?: PaginatedResponse<any>;
  emptyMessage?: string;
  showFilters?: boolean;
  style?: any;
}

function SearchableList<T>({
  data,
  isLoading,
  hasError,
  errorMessage,
  onSearch,
  onLoadMore,
  onRefresh,
  renderItem,
  searchPlaceholder = 'Search...',
  filterType,
  keyExtractor,
  paginationData,
  emptyMessage = 'No items found',
  showFilters = true,
  style,
}: SearchableListProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasActiveFilters = Object.keys(currentFilters).length > 0;
  const hasNextPage = paginationData?.next !== null && paginationData?.next !== undefined;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch(term, currentFilters);
  };

  const handleApplyFilters = (filters: any) => {
    setCurrentFilters(filters);
    onSearch(searchTerm, filters);
  };

  const handleClearFilters = () => {
    setCurrentFilters({});
    onSearch(searchTerm, {});
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasNextPage && onLoadMore) {
      onLoadMore();
    }
  };

  const renderFooter = () => {
    if (!hasNextPage) return null;
    
    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#007bff" />
        ) : (
          <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        placeholder={searchPlaceholder}
        onSearch={handleSearch}
        onClear={() => setSearchTerm('')}
        initialValue={searchTerm}
        style={styles.searchBar}
      />
      
      {showFilters && (
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <Icon 
            name="filter-list" 
            size={20} 
            color={hasActiveFilters ? '#fff' : '#666'} 
          />
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {Object.keys(currentFilters).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={48} color="#dc3545" />
          <Text style={styles.errorText}>
            {errorMessage || 'Something went wrong'}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Icon name="search-off" size={48} color="#999" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {(searchTerm || hasActiveFilters) && (
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              handleClearFilters();
            }}
            style={styles.clearSearchButton}
          >
            <Text style={styles.clearSearchButtonText}>Clear Search & Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderResultsInfo = () => {
    if (!paginationData || isLoading) return null;

    return (
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {paginationData.count} result{paginationData.count !== 1 ? 's' : ''} found
        </Text>
        {(searchTerm || hasActiveFilters) && (
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderHeader()}
      {renderResultsInfo()}
      
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <SearchFilters
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        filterType={filterType}
        currentFilters={currentFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultsText: {
    color: '#666',
    fontSize: 14,
  },
  clearFiltersText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
    fontWeight: '500',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  clearSearchButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SearchableList;