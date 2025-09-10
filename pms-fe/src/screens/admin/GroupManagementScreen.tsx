import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  RefreshControl 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { ExtendedUser } from '../../types/users';
import AddGroupModal from '../../components/modals/AddGroupModal';
import GroupDetailModal from '../../components/modals/GroupDetailModal';
import { showError } from '../../utils/platformUtils';

interface UserGroup {
  readonly id: number;
  readonly name: string;
  readonly user_count: number;
  readonly permissions: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly codename: string;
  }>;
}

interface ApiError extends Error {
  readonly message: string;
  readonly status?: number;
}

function GroupManagementScreen(): React.JSX.Element {
  
  const { t } = useTranslation();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupDetailModalVisible, setGroupDetailModalVisible] = useState(false);
  const [addGroupModalVisible, setAddGroupModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadGroups();
    loadCurrentUser();
  }, [loadGroups, loadCurrentUser]);

  const loadCurrentUser = useCallback(async (): Promise<void> => {
    try {
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      const apiError = error as ApiError;
      showError(t('messages.error'), apiError.message || 'Failed to load current user');
    }
  }, [t]);

  const loadGroups = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await userService.getGroups();
      
      // Filter groups based on search query
      let filteredGroups = response || [];
      if (searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        filteredGroups = filteredGroups.filter(group => 
          group.name.toLowerCase().includes(search) ||
          group.permissions.some(perm => 
            perm.name.toLowerCase().includes(search) ||
            perm.codename.toLowerCase().includes(search)
          )
        );
      }
      
      setGroups(filteredGroups);
    } catch (error) {
      const apiError = error as ApiError;
      showError(
        t('messages.error'),
        apiError.message || 'Failed to load groups'
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, t]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const handleSearch = useCallback((text: string): void => {
    setSearchQuery(text);
    // Debounce search - reload after user stops typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadGroups();
    }, 500);
  }, [loadGroups]);

  const handleGroupPress = useCallback((groupId: number): void => {
    setSelectedGroupId(groupId);
    setGroupDetailModalVisible(true);
  }, []);

  const handleAddGroupPress = useCallback((): void => {
    setAddGroupModalVisible(true);
  }, []);

  const handleGroupCreated = useCallback((): void => {
    loadGroups();
  }, [loadGroups]);

  const handleGroupUpdated = useCallback((): void => {
    loadGroups();
  }, [loadGroups]);

  const renderGroupItem = useCallback(({ item }: { item: UserGroup }): React.JSX.Element => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => handleGroupPress(item.id)}
    >
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <View style={styles.groupStats}>
          <Text style={styles.statsText}>
            {item.user_count} {item.user_count === 1 ? t('groupManagement.member') : t('groupManagement.members')}
          </Text>
        </View>
      </View>
      
      <Text style={styles.permissionsCount}>
        {item.permissions.length} {item.permissions.length === 1 ? t('groupManagement.permission') : t('groupManagement.permissions')}
      </Text>
      
      {item.permissions.length > 0 && (
        <View style={styles.permissionsPreview}>
          {item.permissions.slice(0, 3).map(permission => (
            <View key={permission.id} style={styles.permissionTag}>
              <Text style={styles.permissionText} numberOfLines={1}>
                {permission.name}
              </Text>
            </View>
          ))}
          {item.permissions.length > 3 && (
            <View style={styles.permissionTag}>
              <Text style={styles.permissionText}>
                +{item.permissions.length - 3} {t('groupManagement.more')}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  ), [handleGroupPress, t]);

  const renderEmptyState = useCallback((): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {searchQuery ? t('groupManagement.noGroupsFound') : t('groupManagement.noGroupsTitle')}
      </Text>
      <Text style={styles.emptyMessage}>
        {searchQuery 
          ? t('groupManagement.tryDifferentSearch')
          : t('groupManagement.noGroupsMessage')
        }
      </Text>
    </View>
  ), [searchQuery, t]);

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('forms.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Search and Add Button */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('groupManagement.searchGroups')}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddGroupPress}
        >
          <Text style={styles.addButtonText}>+ {t('groupManagement.addGroup')}</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>{t('groupManagement.loadingGroups')}</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroupItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={groups.length === 0 ? styles.emptyList : undefined}
        />
      )}

      {/* Add Group Modal */}
      <AddGroupModal
        visible={addGroupModalVisible}
        onClose={() => setAddGroupModalVisible(false)}
        onGroupCreated={handleGroupCreated}
        currentUser={currentUser}
      />

      {/* Group Detail Modal */}
      <GroupDetailModal
        visible={groupDetailModalVisible}
        onClose={() => setGroupDetailModalVisible(false)}
        groupId={selectedGroupId}
        onGroupUpdated={handleGroupUpdated}
        currentUser={currentUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row' as const,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center' as const,
  },
  searchContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  groupItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  groupStats: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  permissionsCount: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 12,
  },
  permissionsPreview: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 4,
  },
  permissionTag: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    maxWidth: 120,
  },
  permissionText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
} as const);

export default GroupManagementScreen as () => React.JSX.Element;