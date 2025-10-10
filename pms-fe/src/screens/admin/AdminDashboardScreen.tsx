import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { useTab } from '../../store/TabContext';
import requestService from '../../services/requestService';
import { AdminStats, Request } from '../../types/requests';
import RequestDetailModal from '../../components/modals/RequestDetailModal';

const RECENT_REQUEST_LIMIT = 10;

function AdminDashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { setActiveTab } = useTab();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  const responsiveTableStyles = useMemo(
    () => ({
      rowPadding: {
        paddingHorizontal: isCompact ? 8 : 12,
        paddingVertical: isCompact ? 10 : 12,
      },
      headerText: {
        fontSize: isCompact ? 11 : 12,
      },
      cellText: {
        fontSize: isCompact ? 12 : 13,
      },
      statusText: {
        fontSize: isCompact ? 11 : 12,
      },
      requestNumberCell: {
        flexBasis: isCompact ? 90 : 110,
      },
      itemCell: {
        flexGrow: 1.8,
        flexBasis: isCompact ? 130 : 160,
      },
      userCell: {
        flexBasis: isCompact ? 120 : 150,
      },
      dateCell: {
        flexBasis: isCompact ? 105 : 120,
      },
      statusCell: {
        flexBasis: isCompact ? 120 : 150,
      },
    }),
    [isCompact],
  );

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      // Load admin statistics for entire system
      const adminStats = await requestService.getAdminStats();
      setStats(adminStats);

      // Load recent system requests
      const recentResponse = await requestService.getAllRequests({
        ordering: '-created_at',
        page_size: RECENT_REQUEST_LIMIT,
      });
      const recentItems = recentResponse.results ?? [];
      setRecentRequests(recentItems.slice(0, RECENT_REQUEST_LIMIT));
    } catch (error) {
      // TODO: Add proper error handling/user feedback
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRequestPress = useCallback((request: Request): void => {
    setSelectedRequest(request);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback((): void => {
    setModalVisible(false);
    setSelectedRequest(null);
  }, []);

  const handleRequestUpdated = useCallback((): void => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGoToAllRequests = useCallback((): void => {
    setActiveTab('allRequests');
  }, [setActiveTab]);

  const handleGoToUsers = useCallback((): void => {
    setActiveTab('userManagement');
  }, [setActiveTab]);

  const handleGoToPendingApprovals = useCallback((): void => {
    setActiveTab('pendingApprovals');
  }, [setActiveTab]);

  const renderRecentRequestItem = useCallback(
    ({ item, index }: { item: Request; index: number }): React.JSX.Element => (
      <TouchableOpacity
        style={[
          styles.tableRow,
          responsiveTableStyles.rowPadding,
          index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
        ]}
        onPress={() => handleRequestPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tableCell,
            responsiveTableStyles.cellText,
            styles.requestNumberCell,
            responsiveTableStyles.requestNumberCell,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.request_number}
        </Text>
        <Text
          style={[
            styles.tableCell,
            responsiveTableStyles.cellText,
            styles.itemCell,
            responsiveTableStyles.itemCell,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.item}
        </Text>
        <Text
          style={[
            styles.tableCell,
            responsiveTableStyles.cellText,
            styles.userCell,
            responsiveTableStyles.userCell,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.created_by_name}
        </Text>
        <Text
          style={[
            styles.tableCell,
            responsiveTableStyles.cellText,
            styles.dateCell,
            responsiveTableStyles.dateCell,
          ]}
        >
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View
          style={[
            styles.tableCell,
            styles.statusCell,
            responsiveTableStyles.statusCell,
          ]}
        >
          <View
            style={[
              styles.statusPill,
              { backgroundColor: requestService.getStatusColor(item.status) },
            ]}
          >
            <Text
              style={[styles.statusText, responsiveTableStyles.statusText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t(`status.${item.status}`)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleRequestPress, responsiveTableStyles, t],
  );

  const renderRecentRequestSeparator = useCallback(
    (): React.JSX.Element => <View style={styles.tableSeparator} />,
    [],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('forms.loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            {t('dashboard.welcome')}, {authState.user?.first_name}!
          </Text>
          <Text style={styles.subtitle}>
            {t('dashboard.adminSubtitle')}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={handleGoToAllRequests}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{stats?.total_requests || 0}</Text>
            <Text style={styles.statLabel}>{t('dashboard.totalRequests')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={handleGoToUsers}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
            <Text style={styles.statLabel}>{t('dashboard.totalUsers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={handleGoToPendingApprovals}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{stats?.pending_requests || 0}</Text>
            <Text style={styles.statLabel}>{t('dashboard.pendingApprovals')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.systemOverview')}</Text>

          <View style={styles.overviewGrid}>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={handleGoToAllRequests}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewNumber}>{stats?.approved_requests || 0}</Text>
              <Text style={styles.overviewLabel}>{t('dashboard.approvedRequests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={handleGoToAllRequests}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewNumber}>{stats?.completed_requests || 0}</Text>
              <Text style={styles.overviewLabel}>{t('dashboard.completedRequests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={handleGoToAllRequests}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewNumber}>{stats?.rejected_requests || 0}</Text>
              <Text style={styles.overviewLabel}>{t('dashboard.rejectedRequests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overviewItem}
              onPress={handleGoToUsers}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewNumber}>{stats?.active_users || 0}</Text>
              <Text style={styles.overviewLabel}>{t('dashboard.activeUsers')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentRequests')}</Text>
          {recentRequests.length > 0 ? (
            <View style={styles.tableContainer}>
              <View
                style={[
                  styles.tableHeader,
                  responsiveTableStyles.rowPadding,
                ]}
              >
                <Text
                  style={[
                    styles.tableHeaderCell,
                    responsiveTableStyles.headerText,
                    styles.requestNumberCell,
                    responsiveTableStyles.requestNumberCell,
                  ]}
                  numberOfLines={2}
                >
                  {t('requests.requestNumber')}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    responsiveTableStyles.headerText,
                    styles.itemCell,
                    responsiveTableStyles.itemCell,
                  ]}
                  numberOfLines={2}
                >
                  {t('requests.item')}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    responsiveTableStyles.headerText,
                    styles.userCell,
                    responsiveTableStyles.userCell,
                  ]}
                  numberOfLines={2}
                >
                  {t('requests.details.createdBy')}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    responsiveTableStyles.headerText,
                    styles.dateCell,
                    responsiveTableStyles.dateCell,
                  ]}
                  numberOfLines={2}
                >
                  {t('requests.createdAt')}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    responsiveTableStyles.headerText,
                    styles.statusCellText,
                    responsiveTableStyles.statusCell,
                  ]}
                  numberOfLines={2}
                >
                  {t('requests.status')}
                </Text>
              </View>
              <FlatList
                data={recentRequests}
                renderItem={renderRecentRequestItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                ItemSeparatorComponent={renderRecentRequestSeparator}
                contentContainerStyle={styles.tableContent}
              />
            </View>
          ) : (
            <Text style={styles.placeholder}>{t('dashboard.noRecentRequests')}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveTab('allRequests')}
          >
            <Text style={styles.actionButtonText}>
              📋 {t('dashboard.manageRequests')}
            </Text>
            <Text style={styles.actionButtonSubtext}>
              {t('dashboard.viewAllRequests')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveTab('userManagement')}
          >
            <Text style={styles.actionButtonText}>
              👥 {t('dashboard.manageUsers')}
            </Text>
            <Text style={styles.actionButtonSubtext}>
              {stats?.total_users || 0} {t('dashboard.totalSystemUsers')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveTab('worksiteManagement')}
          >
            <Text style={styles.actionButtonText}>
              🏢 {t('navigation.worksites')}
            </Text>
            <Text style={styles.actionButtonSubtext}>
              {t('worksiteManagement.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {stats && stats.total_requests > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.systemStatusBreakdown')}</Text>

            {Object.entries(stats.requests_by_status).map(([status, count]) => (
              <View key={status} style={styles.statusRow}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: requestService.getStatusColor(status) }
                ]} />
                <Text style={styles.statusLabel}>
                  {t(`status.${status}`)}
                </Text>
                <Text style={styles.statusCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedRequest && (
        <RequestDetailModal
          visible={modalVisible}
          onClose={handleModalClose}
          request={selectedRequest}
          onRequestUpdated={handleRequestUpdated}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#f1f3f4',
    borderBottomWidth: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  tableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  tableContent: {
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#fff',
  },
  tableRowOdd: {
    backgroundColor: '#f8f9fa',
  },
  tableSeparator: {
    height: 1,
    backgroundColor: '#e9ecef',
  },
  tableCell: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#212529',
    paddingHorizontal: 4,
  },
  requestNumberCell: {
    flexGrow: 0,
    flexShrink: 1,
  },
  itemCell: {
    flexGrow: 1,
    flexShrink: 1,
  },
  userCell: {
    flexGrow: 0,
    flexShrink: 1,
  },
  dateCell: {
    flexGrow: 0,
    flexShrink: 1,
  },
  statusCell: {
    flexGrow: 0,
    flexShrink: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusCellText: {
    flexGrow: 0,
    textAlign: 'left',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-end',
    flexShrink: 1,
    maxWidth: '100%',
  },
});

export default AdminDashboardScreen as () => React.JSX.Element;
