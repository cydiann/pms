import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { UserListItem, ExtendedUser } from '../../types/users';
import UserDetailModal from '../../components/modals/UserDetailModal';
import AddUserModal from '../../components/modals/AddUserModal';
import { showError } from '../../utils/platformUtils';

const UserManagementScreen: React.FC = () => {
  console.log('UserManagementScreen: Component rendered');
  
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
    console.log('UserManagementScreen: useEffect triggered - mounting component');
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      console.log('UserManagementScreen: Loading current user...');
      const user = await userService.getCurrentUser();
      console.log('UserManagementScreen: Current user loaded successfully:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('UserManagementScreen: Failed to load current user:', error);
      console.error('UserManagementScreen: Error details:', JSON.stringify(error, null, 2));
    }
  };

  const loadUsers = async () => {
    try {
      console.log('UserManagementScreen: Loading users...');
      setLoading(true);
      const queryParams: any = {};
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }
      console.log('UserManagementScreen: Query params:', queryParams);
      
      const response = await userService.getUsers(queryParams);
      console.log('UserManagementScreen: Users response:', response);
      console.log('UserManagementScreen: Users count:', response.results?.length || 0);
      
      setUsers(response.results || []);
    } catch (error: any) {
      console.error('UserManagementScreen: Failed to load users:', error);
      console.error('UserManagementScreen: Error details:', JSON.stringify(error, null, 2));
      
      showError(
        t('messages.error'), 
        `${error.message || t('userManagement.loadUsersError')}\n\nCheck console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleUserPress = (user: UserListItem) => {
    console.log('UserManagementScreen: User pressed:', user);
    setSelectedUserId(user.id);
    setUserDetailModalVisible(true);
    console.log('UserManagementScreen: Modal should be visible now');
  };

  const handleCreateUser = () => {
    console.log('UserManagementScreen: Create user button pressed');
    setAddUserModalVisible(true);
  };

  const renderUserItem = ({ item }: { item: UserListItem }) => (
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
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {searchQuery ? t('userManagement.noUsersFound') : t('admin.noUsersTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery ? t('userManagement.tryDifferentSearch') : t('admin.noUsersMessage')}
      </Text>
    </View>
  );

  console.log('UserManagementScreen: Render state - loading:', loading, 'users:', users.length, 'currentUser:', currentUser?.username, 'modalVisible:', userDetailModalVisible);

  if (loading) {
    console.log('UserManagementScreen: Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('userManagement.loadingUsers')}</Text>
      </View>
    );
  }

  console.log('UserManagementScreen: About to render main UI');

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
          onClose={() => {
            setUserDetailModalVisible(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          onUserUpdated={loadUsers}
          currentUser={currentUser}
        />
      )}
      
      {currentUser && (
        <AddUserModal
          visible={addUserModalVisible}
          onClose={() => setAddUserModalVisible(false)}
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

export default UserManagementScreen;