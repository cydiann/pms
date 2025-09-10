import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import userService from '../../services/userService';
import { UserListItem } from '../../types/users';

interface QueryParams {
  readonly page_size: number;
  readonly search?: string;
}

interface ApiError extends Error {
  readonly message: string;
  readonly status?: number;
}

function AllUsersScreen(): React.JSX.Element {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Build query params, filtering out empty values
      const queryParams: QueryParams = {
        page_size: 50
      };
      
      if (searchText?.trim()) {
        queryParams.search = searchText.trim();
      };
      const response = await userService.getUsers(queryParams);
      setUsers(response.results);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (!loading) {
        loadUsers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, loadUsers, loading]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleUserPress = useCallback((_user: UserListItem): void => {
    // Navigate to user details or implement user management actions
    // Implementation pending
  }, []);

  const getWorksiteName = useCallback((user: UserListItem): string => {
    if (!user.worksite_name) return 'No Worksite';
    
    // Handle Django method wrapper bug
    if (user.worksite_name.includes('method-wrapper') || user.worksite_name.includes('NoneType')) {
      return 'No Worksite';
    }
    
    return user.worksite_name;
  }, []);

  const renderUserItem = useCallback(({ item }: { item: UserListItem }): React.JSX.Element => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive
        ]}>
          <Text style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <Text style={styles.detailText}>
          🏢 {getWorksiteName(item)}
        </Text>
        {item.supervisor_name && (
          <Text style={styles.detailText}>
            👤 Reports to: {item.supervisor_name}
          </Text>
        )}
        {item.is_superuser && (
          <Text style={styles.adminBadge}>
            🔐 Administrator
          </Text>
        )}
      </View>
      
      <View style={styles.userFooter}>
        <Text style={styles.dateText}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleUserPress, getWorksiteName]);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {error ? 'Error Loading Users' : (searchText ? 'No Users Found' : 'No Users')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {error || (searchText ? `No users match "${searchText}"` : 'No users have been created yet.')}
      </Text>
      {error && (
        <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [error, searchText, loadUsers]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or username..."
          value={searchText}
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
        />
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {users.length} user{users.length !== 1 ? 's' : ''} found
        </Text>
      </View>
      
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  userItem: {
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
  userHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#28a745',
  },
  statusBadgeInactive: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  userDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  adminBadge: {
    fontSize: 14,
    color: '#6f42c1',
    fontWeight: '600',
    marginTop: 4,
  },
  userFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
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
    fontWeight: '600' as const,
  },
} as const);

export default AllUsersScreen as () => React.JSX.Element;