import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import RequestListItem from '../common/RequestListItem';

type TabType = 'myRequests' | 'pendingApprovals' | 'approvedByMe';

interface Tab {
  key: TabType;
  label: string;
}

function SupervisorRequestsTabs(): React.JSX.Element {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('myRequests');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data for each tab
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Request[]>([]);
  const [approvedByMe, setApprovedByMe] = useState<Request[]>([]);

  const tabs: Tab[] = [
    { key: 'myRequests', label: t('requests.tabs.myRequests') },
    { key: 'pendingApprovals', label: t('requests.tabs.pendingApprovals') },
    { key: 'approvedByMe', label: t('requests.tabs.approvedByMe') },
  ];

  const loadTabData = useCallback(async (tabType: TabType) => {
    setLoading(true);
    try {
      switch (tabType) {
        case 'myRequests':
          const myRequestsData = await requestService.getMyRequests();
          setMyRequests(myRequestsData.results || myRequestsData);
          break;
        case 'pendingApprovals':
          const pendingData = await requestService.getPendingApprovals();
          setPendingApprovals(Array.isArray(pendingData) ? pendingData : pendingData.results || []);
          break;
        case 'approvedByMe':
          const approvedData = await requestService.getMyApprovedRequests();

          // Sort: newest first, rejected at bottom
          const sortedApproved = (Array.isArray(approvedData) ? approvedData : approvedData.results || []).sort((a: Request, b: Request) => {
            // Rejected requests to bottom
            if (a.status === 'rejected' && b.status !== 'rejected') return 1;
            if (a.status !== 'rejected' && b.status === 'rejected') return -1;
            // Then by creation date (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setApprovedByMe(sortedApproved);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tabType}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadAllTabs = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTabData('myRequests'),
        loadTabData('pendingApprovals'),
        loadTabData('approvedByMe'),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadTabData]);

  useEffect(() => {
    loadAllTabs();
  }, [loadAllTabs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllTabs();
  }, [loadAllTabs]);

  const handleTabPress = useCallback((tabKey: TabType) => {
    setActiveTab(tabKey);
  }, []);

  const getCurrentData = (): Request[] => {
    switch (activeTab) {
      case 'myRequests':
        return myRequests;
      case 'pendingApprovals':
        return pendingApprovals;
      case 'approvedByMe':
        return approvedByMe;
      default:
        return [];
    }
  };

  const renderEmptyState = useCallback(() => {
    const emptyMessages = {
      myRequests: t('requests.empty.myRequests'),
      pendingApprovals: t('requests.empty.pendingApprovals'),
      approvedByMe: t('requests.empty.approvedByMe'),
    };

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          {emptyMessages[activeTab]}
        </Text>
      </View>
    );
  }, [t, activeTab]);

  const renderRequestItem = useCallback(({ item }: { item: Request }) => (
    <RequestListItem request={item} />
  ), []);

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabContainer}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.key && styles.activeTab
              ]}
              onPress={() => handleTabPress(item.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === item.key && styles.activeTabText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.key}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={getCurrentData()}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={
              getCurrentData().length === 0 ? styles.emptyContainer : styles.listContainer
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default SupervisorRequestsTabs;