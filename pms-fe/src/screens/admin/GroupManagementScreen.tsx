import React, { useState, useEffect } from 'react';
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
  id: number;
  name: string;
  user_count: number;
  permissions: Array<{
    id: number;
    name: string;
    codename: string;
  }>;
}

const GroupManagementScreen: React.FC = () => {
  console.log('GroupManagementScreen: Component rendered');
  
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
    console.log('GroupManagementScreen: useEffect triggered - mounting component');
    loadGroups();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      console.log('GroupManagementScreen: Loading current user...');
      const user = await userService.getCurrentUser();
      console.log('GroupManagementScreen: Current user loaded successfully:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('GroupManagementScreen: Failed to load current user:', error);
    }
  };

  const loadGroups = async () => {
    try {
      console.log('GroupManagementScreen: Loading groups...');
      setLoading(true);
      
      const response = await userService.getGroups();
      console.log('GroupManagementScreen: Groups loaded successfully:', response?.length || 0);
      
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
    } catch (error: any) {
      console.error('GroupManagementScreen: Failed to load groups:', error);
      showError(
        t('messages.error'),
        error.message || 'Failed to load groups'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce search - reload after user stops typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadGroups();
    }, 500);
  };

  const handleGroupPress = (groupId: number) => {
    console.log('GroupManagementScreen: Group pressed:', groupId);
    setSelectedGroupId(groupId);
    setGroupDetailModalVisible(true);
  };

  const handleAddGroupPress = () => {
    console.log('GroupManagementScreen: Add group button pressed');
    setAddGroupModalVisible(true);
  };

  const handleGroupCreated = () => {
    console.log('GroupManagementScreen: Group created, refreshing list...');
    loadGroups();
  };

  const handleGroupUpdated = () => {
    console.log('GroupManagementScreen: Group updated, refreshing list...');
    loadGroups();
  };

  const renderGroupItem = ({ item }: { item: UserGroup }) => (
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
  );

  const renderEmptyState = () => (
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
  );

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
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GroupManagementScreen;