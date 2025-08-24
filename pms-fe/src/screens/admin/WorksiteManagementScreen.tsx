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
import organizationService from '../../services/organizationService';
import userService from '../../services/userService';
import { WorkSite } from '../../types/organization';
import { ExtendedUser } from '../../types/users';
import AddWorksiteModal from '../../components/modals/AddWorksiteModal';
import WorksiteDetailModal from '../../components/modals/WorksiteDetailModal';
import { showError } from '../../utils/platformUtils';

const WorksiteManagementScreen: React.FC = () => {
  console.log('WorksiteManagementScreen: Component rendered');
  
  const { t } = useTranslation();
  const [worksites, setWorksites] = useState<WorkSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<number | null>(null);
  const [worksiteDetailModalVisible, setWorksiteDetailModalVisible] = useState(false);
  const [addWorksiteModalVisible, setAddWorksiteModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);

  useEffect(() => {
    console.log('WorksiteManagementScreen: useEffect triggered - mounting component');
    loadWorksites();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      console.log('WorksiteManagementScreen: Loading current user...');
      const user = await userService.getCurrentUser();
      console.log('WorksiteManagementScreen: Current user loaded successfully:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('WorksiteManagementScreen: Failed to load current user:', error);
    }
  };

  const loadWorksites = async () => {
    try {
      console.log('WorksiteManagementScreen: Loading worksites...');
      setLoading(true);
      
      const response = await organizationService.getWorksites();
      console.log('WorksiteManagementScreen: Worksites loaded successfully:', response?.length || 0);
      
      // Filter worksites based on search query
      let filteredWorksites = response || [];
      if (searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        filteredWorksites = filteredWorksites.filter(worksite => 
          worksite.city.toLowerCase().includes(search) ||
          worksite.country.toLowerCase().includes(search) ||
          worksite.address.toLowerCase().includes(search) ||
          (worksite.chief_name && worksite.chief_name.toLowerCase().includes(search))
        );
      }
      
      setWorksites(filteredWorksites);
    } catch (error: any) {
      console.error('WorksiteManagementScreen: Failed to load worksites:', error);
      showError(
        t('messages.error'),
        error.message || 'Failed to load worksites'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorksites();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce search - reload after user stops typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadWorksites();
    }, 500);
  };

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWorksitePress = (worksiteId: number) => {
    console.log('WorksiteManagementScreen: Worksite pressed:', worksiteId);
    setSelectedWorksiteId(worksiteId);
    setWorksiteDetailModalVisible(true);
  };

  const handleAddWorksitePress = () => {
    console.log('WorksiteManagementScreen: Add worksite button pressed');
    setAddWorksiteModalVisible(true);
  };

  const handleWorksiteCreated = () => {
    console.log('WorksiteManagementScreen: Worksite created, refreshing list...');
    loadWorksites();
  };

  const handleWorksiteUpdated = () => {
    console.log('WorksiteManagementScreen: Worksite updated, refreshing list...');
    loadWorksites();
  };

  const renderWorksiteItem = ({ item }: { item: WorkSite }) => (
    <TouchableOpacity 
      style={styles.worksiteItem}
      onPress={() => handleWorksitePress(item.id)}
    >
      <View style={styles.worksiteHeader}>
        <Text style={styles.worksiteCity}>{item.city}</Text>
        <Text style={styles.worksiteCountry}>{item.country}</Text>
      </View>
      <Text style={styles.worksiteAddress} numberOfLines={2}>
        {item.address}
      </Text>
      {item.chief_name && (
        <View style={styles.chiefInfo}>
          <Text style={styles.chiefLabel}>{t('worksiteManagement.chief')}:</Text>
          <Text style={styles.chiefName}>{item.chief_name}</Text>
        </View>
      )}
      <View style={styles.worksiteStats}>
        <Text style={styles.statsText}>
          {t('worksiteManagement.createdAt')}: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {searchQuery ? t('worksiteManagement.noWorksitesFound') : t('worksiteManagement.noWorksitesTitle')}
      </Text>
      <Text style={styles.emptyMessage}>
        {searchQuery 
          ? t('worksiteManagement.tryDifferentSearch')
          : t('worksiteManagement.noWorksitesMessage')
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
            placeholder={t('worksiteManagement.searchWorksites')}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddWorksitePress}
        >
          <Text style={styles.addButtonText}>+ {t('worksiteManagement.addWorksite')}</Text>
        </TouchableOpacity>
      </View>

      {/* Worksites List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>{t('worksiteManagement.loadingWorksites')}</Text>
        </View>
      ) : (
        <FlatList
          data={worksites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderWorksiteItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={worksites.length === 0 ? styles.emptyList : undefined}
        />
      )}

      {/* Add Worksite Modal */}
      <AddWorksiteModal
        visible={addWorksiteModalVisible}
        onClose={() => setAddWorksiteModalVisible(false)}
        onWorksiteCreated={handleWorksiteCreated}
        currentUser={currentUser}
      />

      {/* Worksite Detail Modal */}
      <WorksiteDetailModal
        visible={worksiteDetailModalVisible}
        onClose={() => setWorksiteDetailModalVisible(false)}
        worksiteId={selectedWorksiteId}
        onWorksiteUpdated={handleWorksiteUpdated}
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
  worksiteItem: {
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
  worksiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  worksiteCity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  worksiteCountry: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  worksiteAddress: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    lineHeight: 20,
  },
  chiefInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chiefLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 4,
  },
  chiefName: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  worksiteStats: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 8,
  },
  statsText: {
    fontSize: 11,
    color: '#6c757d',
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

export default WorksiteManagementScreen;