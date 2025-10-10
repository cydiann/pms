import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { UserListItem, ExtendedUser } from '../../types/users';
import UserDetailModal from '../../components/modals/UserDetailModal';
import AddUserModal from '../../components/modals/AddUserModal';
import { showError } from '../../utils/platformUtils';

function UserManagementScreen(): React.JSX.Element {
  
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailModalVisible, setUserDetailModalVisible] = useState(false);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, [loadUsers, loadCurrentUser]);

  const loadCurrentUser = useCallback(async (): Promise<void> => {
    try {
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      // Silently fail - current user loading is not critical for the screen
    }
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      interface UserQueryParams {
        search?: string;
      }
      const queryParams: UserQueryParams = {};
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }
      
      const response = await userService.getUsers(queryParams);
      
      setUsers(response.results || []);
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      
      showError(
        t('messages.error'), 
        apiError.message || t('userManagement.loadUsersError')
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, t]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleUserPress = useCallback((user: UserListItem): void => {
    setSelectedUserId(user.id);
    setUserDetailModalVisible(true);
  }, []);

  const handleCreateUser = useCallback((): void => {
    setAddUserModalVisible(true);
  }, []);

  const renderUserItem: ListRenderItem<UserListItem> = useCallback(({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: userService.getUserStatusColor(item) }]}>
            <Text style={styles.statusText}>
              {item.is_active ? t('userManagement.active') : t('userManagement.inactive')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.userUsername}>@{item.username}</Text>
        <Text style={styles.userRole}>{userService.getUserRoleDisplay(item, i18n.language)}</Text>
        
        <View style={styles.userMeta}>
          <Text style={styles.userMetaText}>
            {t('userManagement.worksite')}: {userService.getWorksiteName(item)}
          </Text>
          {item.supervisor_name && (
            <Text style={styles.userMetaText}>
              {t('userManagement.supervisor')}: {item.supervisor_name}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.userActions}>
        <Text style={styles.actionArrow}>›</Text>
      </View>
    </TouchableOpacity>
  ), [handleUserPress, t, i18n.language]);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {searchQuery ? t('userManagement.noUsersFound') : t('admin.noUsersTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery ? t('userManagement.tryDifferentSearch') : t('admin.noUsersMessage')}
      </Text>
    </View>
  ), [searchQuery, t]);

  const modalCloseHandlers = useMemo(() => ({
    userDetail: () => {
      setUserDetailModalVisible(false);
      setSelectedUserId(null);
    },
    addUser: () => setAddUserModalVisible(false),
  }), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('userManagement.loadingUsers')}</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('userManagement.searchUsers')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#6c757d"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.addButton} onPress={handleCreateUser}>
          <Text style={styles.addButtonText}>
            {t('userManagement.addUser')}
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={users.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
      
      {currentUser && (
        <UserDetailModal
          visible={userDetailModalVisible}
          onClose={modalCloseHandlers.userDetail}
          userId={selectedUserId}
          onUserUpdated={loadUsers}
          currentUser={currentUser}
        />
      )}
      
      {currentUser && (
        <AddUserModal
          visible={addUserModalVisible}
          onClose={modalCloseHandlers.addUser}
          onUserCreated={loadUsers}
          currentUser={currentUser}
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  listContainer: {
    padding: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userUsername: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginBottom: 8,
  },
  userMeta: {
    marginTop: 4,
  },
  userMetaText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  userActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 16,
  },
  actionArrow: {
    fontSize: 24,
    color: '#ced4da',
    fontWeight: '300',
  },
});

export default UserManagementScreen as () => React.JSX.Element;