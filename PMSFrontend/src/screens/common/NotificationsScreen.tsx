import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, IconButton, Badge, Chip, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch } from '@/store/hooks';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { formatDate } from '@/utils/helpers';
import { notificationService, NotificationData } from '@/services/notificationService';
import { SCREENS } from '@/constants/app';

interface FilterOptions {
  types: string[];
  read: 'all' | 'read' | 'unread';
  priority: 'all' | 'high' | 'normal' | 'low';
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    read: 'all',
    priority: 'all',
  });

  useEffect(() => {
    loadNotifications(1, true);
  }, []);

  const loadNotifications = async (pageNum = 1, reset = false) => {
    if (reset) {
      setIsLoading(true);
    }

    try {
      const response = await notificationService.getNotifications(pageNum, 20);
      
      if (reset) {
        setNotifications(response.notifications);
        setPage(2);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
        setPage(pageNum + 1);
      }
      
      setHasMore(response.hasMore);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      dispatch(showErrorNotification('Failed to load notifications'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadNotifications(page);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      dispatch(showErrorNotification('Failed to mark notification as read'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      dispatch(showSuccessNotification('All notifications marked as read'));
    } catch (error) {
      dispatch(showErrorNotification('Failed to mark all as read'));
    }
  };

  const handleNotificationTap = async (notification: NotificationData) => {
    // Mark as read if unread
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to relevant screen
    const { type, data } = notification;
    
    switch (type) {
      case 'request_submitted':
      case 'request_approved':
      case 'request_rejected':
      case 'request_revision':
        if (data?.requestId) {
          navigation.navigate(SCREENS.REQUEST_DETAILS as never, { 
            requestId: data.requestId 
          } as never);
        }
        break;
      
      case 'password_reset':
        navigation.navigate(SCREENS.PASSWORD_RESET as never);
        break;
      
      default:
        // For general notifications, stay on notifications screen
        break;
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by type
    if (filters.types.length > 0) {
      filtered = filtered.filter(notif => filters.types.includes(notif.type));
    }

    // Filter by read status
    if (filters.read === 'read') {
      filtered = filtered.filter(notif => notif.read);
    } else if (filters.read === 'unread') {
      filtered = filtered.filter(notif => !notif.read);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter(notif => notif.priority === filters.priority);
    }

    return filtered;
  }, [notifications, filters]);

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'request_submitted': return 'assignment';
      case 'request_approved': return 'check-circle';
      case 'request_rejected': return 'cancel';
      case 'request_revision': return 'edit';
      case 'password_reset': return 'lock-reset';
      case 'general': return 'info';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'request_approved': return Colors.success;
      case 'request_rejected': return Colors.error;
      case 'request_revision': return Colors.warning;
      case 'password_reset': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return Colors.error;
      case 'normal': return Colors.primary;
      case 'low': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const renderNotificationItem = ({ item: notification }: { item: NotificationData }) => (
    <Card
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadCard
      ]}
      onPress={() => handleNotificationTap(notification)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <Icon
              name={getNotificationIcon(notification.type)}
              size={24}
              color={getNotificationColor(notification.type)}
            />
          </View>
          
          <View style={styles.notificationContent}>
            <View style={styles.titleRow}>
              <Text 
                variant="titleSmall" 
                style={[
                  styles.notificationTitle,
                  !notification.read && styles.unreadTitle
                ]}
                numberOfLines={2}
              >
                {notification.title}
              </Text>
              
              {notification.priority === 'high' && (
                <Chip
                  compact
                  style={[styles.priorityChip, { backgroundColor: Colors.error }]}
                  textStyle={styles.priorityText}
                >
                  HIGH
                </Chip>
              )}
            </View>

            <Text 
              variant="bodyMedium" 
              style={styles.notificationMessage}
              numberOfLines={3}
            >
              {notification.message}
            </Text>

            <View style={styles.notificationFooter}>
              <Text variant="bodySmall" style={styles.notificationDate}>
                {formatDate(notification.created_at, true)}
              </Text>
              
              {!notification.read && (
                <View style={styles.unreadDot} />
              )}
            </View>
          </View>

          <IconButton
            icon="more-vert"
            size={20}
            onPress={() => {
              // Show notification options menu
            }}
            style={styles.menuButton}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
      </View>

      {unreadCount > 0 && (
        <Button
          mode="outlined"
          compact
          onPress={handleMarkAllAsRead}
          style={styles.markAllButton}
          icon="done-all"
        >
          Mark All Read
        </Button>
      )}
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={filters.read === 'unread'}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          read: prev.read === 'unread' ? 'all' : 'unread' 
        }))}
        style={styles.filterChip}
        showSelectedCheck={false}
      >
        Unread
      </Chip>
      
      <Chip
        selected={filters.priority === 'high'}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          priority: prev.priority === 'high' ? 'all' : 'high' 
        }))}
        style={[styles.filterChip, { backgroundColor: filters.priority === 'high' ? Colors.error : undefined }]}
        showSelectedCheck={false}
        textStyle={filters.priority === 'high' ? { color: Colors.textOnPrimary } : undefined}
      >
        High Priority
      </Chip>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderFilterChips()}
      
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="settings"
        label="Settings"
        onPress={() => navigation.navigate(SCREENS.NOTIFICATION_SETTINGS as never)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  markAllButton: {
    minWidth: 100,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  filterChip: {
    height: 32,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100, // Space for FAB
    flexGrow: 1,
  },
  notificationCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardContent: {
    paddingVertical: Spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  notificationContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  notificationTitle: {
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  priorityChip: {
    height: 20,
  },
  priorityText: {
    color: Colors.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationMessage: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationDate: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  menuButton: {
    margin: 0,
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

export default NotificationsScreen;