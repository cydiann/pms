import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Searchbar, IconButton, Badge, Chip, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchUsers,
  updateUser,
  resetUserPassword,
  deactivateUser,
  reactivateUser,
  clearUsers,
  selectUsers,
  selectUsersLoading,
  selectHasMoreUsers,
} from '@/store/slices/adminSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { SCREENS } from '@/constants/app';
import { formatDate, debounce } from '@/utils/helpers';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  worksite_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  supervisor_name?: string;
}

interface FilterOptions {
  activeStatus: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'username' | 'date_joined' | 'last_login';
  sortOrder: 'asc' | 'desc';
}

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const users = useAppSelector(selectUsers);
  const isLoading = useAppSelector(selectUsersLoading);
  const hasMore = useAppSelector(selectHasMoreUsers);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    activeStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  useEffect(() => {
    loadUsers(true);
  }, [filters]);

  const loadUsers = (reset = false) => {
    dispatch(fetchUsers({
      search: searchQuery || undefined,
      isActive: filters.activeStatus === 'all' ? undefined : filters.activeStatus === 'active',
      reset,
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadUsers(false);
    }
  };

  const handleSearchChange = (query: string) => {
    debouncedSearch(query);
  };

  useEffect(() => {
    if (searchQuery !== '') {
      // Clear and reload with search
      dispatch(clearUsers());
      loadUsers(true);
    }
  }, [searchQuery]);

  const handleResetPassword = async (user: User) => {
    Alert.alert(
      'Reset Password',
      `Reset password for ${user.first_name} ${user.last_name} (${user.username})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(resetUserPassword(user.id));
              if (resetUserPassword.fulfilled.match(result)) {
                Alert.alert(
                  'Password Reset',
                  `Temporary password: ${result.payload.tempPassword}\n\nPlease share this with ${user.first_name} securely.`,
                  [{ text: 'OK' }]
                );
              } else {
                dispatch(showErrorNotification('Failed to reset password'));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to reset password'));
            }
          }
        }
      ]
    );
  };

  const handleToggleUserStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    const actionText = user.is_active ? 'Deactivate' : 'Reactivate';
    
    Alert.alert(
      `${actionText} User`,
      `${actionText} ${user.first_name} ${user.last_name} (${user.username})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = await dispatch(
                user.is_active ? deactivateUser(user.id) : reactivateUser(user.id)
              );
              
              if (result.meta.requestStatus === 'fulfilled') {
                dispatch(showSuccessNotification(
                  `User ${user.is_active ? 'deactivated' : 'reactivated'} successfully`
                ));
              } else {
                dispatch(showErrorNotification(
                  `Failed to ${action} user`
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification(
                `Failed to ${action} user`
              ));
            }
          }
        }
      ]
    );
  };

  const navigateToCreateUser = () => {
    navigation.navigate('CreateUser' as never);
  };

  const navigateToUserDetails = (userId: number) => {
    navigation.navigate('UserDetails' as never, { userId } as never);
  };

  // Apply client-side filtering and sorting
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'name':
          compareValue = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'username':
          compareValue = a.username.localeCompare(b.username);
          break;
        case 'date_joined':
          compareValue = new Date(a.date_joined).getTime() - new Date(b.date_joined).getTime();
          break;
        case 'last_login':
          const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0;
          const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0;
          compareValue = aLogin - bLogin;
          break;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [users, filters]);

  const renderUserItem = ({ item: user }: { item: User }) => (
    <Card
      style={[
        styles.userCard,
        !user.is_active && styles.inactiveUserCard
      ]}
      onPress={() => navigateToUserDetails(user.id)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text variant="titleMedium" style={[
                styles.userName,
                !user.is_active && styles.inactiveText
              ]}>
                {user.first_name} {user.last_name}
              </Text>
              {!user.is_active && (
                <Chip
                  compact
                  style={styles.inactiveChip}
                  textStyle={styles.inactiveChipText}
                >
                  INACTIVE
                </Chip>
              )}
            </View>
            
            <Text variant="bodyMedium" style={styles.username}>
              @{user.username}
            </Text>
            
            <Text variant="bodySmall" style={styles.userRole}>
              {user.role} • {user.worksite_name}
            </Text>
            
            {user.supervisor_name && (
              <Text variant="bodySmall" style={styles.supervisor}>
                Reports to: {user.supervisor_name}
              </Text>
            )}
          </View>
          
          <View style={styles.userActions}>
            <IconButton
              icon="lock-reset"
              size={20}
              onPress={() => handleResetPassword(user)}
              style={styles.actionButton}
              iconColor={Colors.warning}
            />
            
            <IconButton
              icon={user.is_active ? "person-off" : "person-add"}
              size={20}
              onPress={() => handleToggleUserStatus(user)}
              style={styles.actionButton}
              iconColor={user.is_active ? Colors.error : Colors.success}
            />
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Icon name="schedule" size={16} color={Colors.textSecondary} />
            <Text variant="bodySmall" style={styles.detailText}>
              Joined: {formatDate(user.date_joined)}
            </Text>
          </View>
          
          {user.last_login && (
            <View style={styles.detailRow}>
              <Icon name="login" size={16} color={Colors.textSecondary} />
              <Text variant="bodySmall" style={styles.detailText}>
                Last login: {formatDate(user.last_login, true)}
              </Text>
            </View>
          )}
          
          {user.email && (
            <View style={styles.detailRow}>
              <Icon name="email" size={16} color={Colors.textSecondary} />
              <Text variant="bodySmall" style={styles.detailText}>
                {user.email}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="group" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No users found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'No users match the current filters'}
      </Text>
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={filters.activeStatus === 'active'}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          activeStatus: prev.activeStatus === 'active' ? 'all' : 'active' 
        }))}
        style={styles.filterChip}
        showSelectedCheck={false}
        textStyle={filters.activeStatus === 'active' ? { color: Colors.textOnPrimary } : undefined}
      >
        Active Only
      </Chip>
      
      <Chip
        selected={filters.activeStatus === 'inactive'}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          activeStatus: prev.activeStatus === 'inactive' ? 'all' : 'inactive' 
        }))}
        style={styles.filterChip}
        showSelectedCheck={false}
        textStyle={filters.activeStatus === 'inactive' ? { color: Colors.textOnPrimary } : undefined}
      >
        Inactive Only
      </Chip>

      <Chip
        selected={filters.sortBy === 'name'}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          sortBy: 'name',
          sortOrder: prev.sortBy === 'name' && prev.sortOrder === 'asc' ? 'desc' : 'asc'
        }))}
        style={styles.filterChip}
        showSelectedCheck={false}
        icon={filters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
      >
        Name {filters.sortBy === 'name' ? (filters.sortOrder === 'asc' ? '↑' : '↓') : ''}
      </Chip>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search users..."
          onChangeText={handleSearchChange}
          style={styles.searchbar}
        />
      </View>

      {/* Filter Chips */}
      {renderFilterChips()}

      {/* Users List */}
      <FlatList
        data={filteredAndSortedUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Create User FAB */}
      <FAB
        icon="person-add"
        label="Add User"
        onPress={navigateToCreateUser}
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  searchbar: {
    backgroundColor: Colors.surface,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    height: 32,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
    paddingBottom: 100, // Space for FAB
    flexGrow: 1,
  },
  userCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  inactiveUserCard: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  cardContent: {
    paddingVertical: Spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
    gap: Spacing.sm,
  },
  userName: {
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  inactiveText: {
    color: Colors.textSecondary,
  },
  inactiveChip: {
    height: 20,
    backgroundColor: Colors.warning,
  },
  inactiveChipText: {
    color: Colors.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  username: {
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  userRole: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  supervisor: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButton: {
    margin: 0,
    marginLeft: Spacing.xs,
  },
  userDetails: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    color: Colors.textSecondary,
    flex: 1,
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
    paddingHorizontal: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
  },
});

export default UserManagementScreen;