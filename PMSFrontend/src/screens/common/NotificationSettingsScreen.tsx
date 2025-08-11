import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Switch, Button, List, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch } from '@/store/hooks';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing } from '@/constants/theme';
import { notificationService } from '@/services/notificationService';

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  categories: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

const NOTIFICATION_CATEGORIES = [
  {
    id: 'request_submitted',
    title: 'Request Submitted',
    description: 'When someone submits a new request',
    icon: 'assignment',
  },
  {
    id: 'request_approved',
    title: 'Request Approved',
    description: 'When your request gets approved',
    icon: 'check-circle',
  },
  {
    id: 'request_rejected',
    title: 'Request Rejected',
    description: 'When your request gets rejected',
    icon: 'cancel',
  },
  {
    id: 'request_revision',
    title: 'Revision Requested',
    description: 'When changes are needed on your request',
    icon: 'edit',
  },
  {
    id: 'approval_needed',
    title: 'Approval Needed',
    description: 'When requests need your approval (Supervisors)',
    icon: 'pending-actions',
  },
  {
    id: 'purchasing_updates',
    title: 'Purchasing Updates',
    description: 'Order status and delivery updates',
    icon: 'shopping-cart',
  },
  {
    id: 'password_reset',
    title: 'Password Reset',
    description: 'Password reset requests and confirmations',
    icon: 'lock-reset',
  },
  {
    id: 'system_updates',
    title: 'System Updates',
    description: 'App updates and maintenance notifications',
    icon: 'system-update',
  },
];

const NotificationSettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    categories: [],
    quietHoursEnabled: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState({
    enabled: false,
    permissions: null,
  });

  useEffect(() => {
    loadPreferences();
    checkNotificationStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      dispatch(showErrorNotification('Failed to load notification preferences'));
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const status = await notificationService.checkNotificationStatus();
      setNotificationStatus(status);
    } catch (error) {
      console.error('Failed to check notification status:', error);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    setIsLoading(true);
    try {
      await notificationService.updateNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
      dispatch(showSuccessNotification('Notification preferences updated'));
    } catch (error) {
      dispatch(showErrorNotification('Failed to update preferences'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (enabled && !notificationStatus.enabled) {
      // Request permissions if not granted
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive push notifications.',
          [{ text: 'OK' }]
        );
        return;
      }
      await checkNotificationStatus();
    }

    const newPreferences = { ...preferences, pushEnabled: enabled };
    await savePreferences(newPreferences);
  };

  const handleToggleEmail = async (enabled: boolean) => {
    const newPreferences = { ...preferences, emailEnabled: enabled };
    await savePreferences(newPreferences);
  };

  const handleToggleCategory = async (categoryId: string, enabled: boolean) => {
    let newCategories = [...preferences.categories];
    
    if (enabled) {
      if (!newCategories.includes(categoryId)) {
        newCategories.push(categoryId);
      }
    } else {
      newCategories = newCategories.filter(id => id !== categoryId);
    }

    const newPreferences = { ...preferences, categories: newCategories };
    await savePreferences(newPreferences);
  };

  const handleToggleQuietHours = async (enabled: boolean) => {
    const newPreferences = { 
      ...preferences, 
      quietHoursEnabled: enabled,
      quietHoursStart: enabled ? preferences.quietHoursStart || '22:00' : undefined,
      quietHoursEnd: enabled ? preferences.quietHoursEnd || '08:00' : undefined,
    };
    await savePreferences(newPreferences);
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.testNotification();
      dispatch(showSuccessNotification('Test notification sent!'));
    } catch (error) {
      dispatch(showErrorNotification('Failed to send test notification'));
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will clear all notifications and reset the badge count. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            notificationService.cancelAllNotifications();
            notificationService.clearBadgeCount();
            dispatch(showSuccessNotification('All notifications cleared'));
          }
        }
      ]
    );
  };

  const renderPermissionStatus = () => {
    if (!notificationStatus.enabled) {
      return (
        <Card style={[styles.card, styles.warningCard]}>
          <Card.Content>
            <View style={styles.permissionHeader}>
              <Icon name="warning" size={24} color={Colors.warning} />
              <Text variant="titleMedium" style={styles.warningTitle}>
                Notifications Disabled
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.warningText}>
              Push notifications are disabled in your device settings. Enable them to receive important updates.
            </Text>
            <Button
              mode="outlined"
              onPress={() => notificationService.requestPermissions()}
              style={styles.enableButton}
            >
              Enable Notifications
            </Button>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={[styles.card, styles.successCard]}>
        <Card.Content>
          <View style={styles.permissionHeader}>
            <Icon name="check-circle" size={24} color={Colors.success} />
            <Text variant="titleMedium" style={styles.successTitle}>
              Notifications Enabled
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.successText}>
            You're all set to receive push notifications.
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Permission Status */}
      {renderPermissionStatus()}

      {/* General Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            General Settings
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge" style={styles.settingTitle}>
                Push Notifications
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={handleTogglePush}
              disabled={isLoading}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge" style={styles.settingTitle}>
                Email Notifications
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Receive notifications via email
              </Text>
            </View>
            <Switch
              value={preferences.emailEnabled}
              onValueChange={handleToggleEmail}
              disabled={isLoading}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge" style={styles.settingTitle}>
                Quiet Hours
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Disable notifications during quiet hours (10 PM - 8 AM)
              </Text>
            </View>
            <Switch
              value={preferences.quietHoursEnabled}
              onValueChange={handleToggleQuietHours}
              disabled={isLoading}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Notification Categories */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Notification Types
          </Text>
          <Text variant="bodySmall" style={styles.sectionDescription}>
            Choose which types of notifications you want to receive
          </Text>

          {NOTIFICATION_CATEGORIES.map((category) => (
            <View key={category.id}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Icon 
                    name={category.icon} 
                    size={20} 
                    color={Colors.primary} 
                    style={styles.categoryIcon}
                  />
                  <View style={styles.categoryText}>
                    <Text variant="bodyMedium" style={styles.categoryTitle}>
                      {category.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.categories.includes(category.id)}
                  onValueChange={(enabled) => handleToggleCategory(category.id, enabled)}
                  disabled={isLoading}
                />
              </View>
              {category.id !== NOTIFICATION_CATEGORIES[NOTIFICATION_CATEGORIES.length - 1].id && (
                <Divider style={styles.categoryDivider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Testing & Management */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Testing & Management
          </Text>

          <Button
            mode="outlined"
            onPress={handleTestNotification}
            style={styles.actionButton}
            icon="notifications"
          >
            Send Test Notification
          </Button>

          <Button
            mode="outlined"
            onPress={handleClearAllNotifications}
            style={styles.actionButton}
            icon="clear-all"
            textColor={Colors.warning}
          >
            Clear All Notifications
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    marginBottom: Spacing.md,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  successCard: {
    backgroundColor: '#D1F2EB',
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  warningTitle: {
    color: Colors.warning,
    fontWeight: 'bold',
  },
  successTitle: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  warningText: {
    color: '#856404',
    marginBottom: Spacing.md,
  },
  successText: {
    color: '#155724',
  },
  enableButton: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    color: Colors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  settingDescription: {
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  divider: {
    marginVertical: Spacing.xs,
    backgroundColor: Colors.divider,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: Spacing.md,
  },
  categoryIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    color: Colors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  categoryDescription: {
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  categoryDivider: {
    marginVertical: Spacing.xs,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});

export default NotificationSettingsScreen;