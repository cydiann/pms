import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { apiService } from './api';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'request_revision' | 'password_reset' | 'general';
  data?: any;
  priority: 'high' | 'normal' | 'low';
  scheduled_at?: string;
  read: boolean;
  created_at: string;
}

export interface PushNotificationConfig {
  token: string;
  platform: 'ios' | 'android';
  enabled: boolean;
  categories: string[];
}

class NotificationService {
  private isInitialized = false;
  private deviceToken: string | null = null;
  
  /**
   * Initialize push notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve) => {
      PushNotification.configure({
        // Called when Token is generated (iOS and Android)
        onRegister: (token) => {
          console.log('Push notification token:', token);
          this.deviceToken = token.token;
          this.registerDeviceToken(token.token);
        },

        // Called when a remote is received or opened, or local notification is opened
        onNotification: (notification) => {
          console.log('Notification received:', notification);
          this.handleNotificationReceived(notification);

          // iOS only: Required for iOS remote notifications
          if (Platform.OS === 'ios') {
            notification.finish(PushNotificationIOS.FetchResult.NoData);
          }
        },

        // Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called
        onAction: (notification) => {
          console.log('Notification action:', notification.action);
          console.log('Notification:', notification);
          this.handleNotificationAction(notification);
        },

        // Called when the user fails to register for remote notifications
        onRegistrationError: (err) => {
          console.error('Push notification registration error:', err.message);
        },

        // IOS ONLY
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Request permissions on init for iOS
        requestPermissions: Platform.OS === 'ios',
      });

      this.isInitialized = true;
      resolve();
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.requestPermissions().then((permissions) => {
        console.log('Notification permissions:', permissions);
        resolve(permissions.alert || permissions.notification);
      });
    });
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceToken(token: string): Promise<void> {
    try {
      await apiService.post('/notifications/register-device/', {
        token,
        platform: Platform.OS,
        app_version: '1.0.0', // Should come from app config
      });
      console.log('Device token registered successfully');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: any): void {
    // Update notification as received in local state if needed
    if (notification.data?.notificationId) {
      this.markAsReceived(notification.data.notificationId);
    }

    // Show notification badge update or other UI updates
    this.updateBadgeCount();
  }

  /**
   * Handle notification action (tap, button press, etc.)
   */
  private handleNotificationAction(notification: any): void {
    const { data } = notification;
    
    if (data?.type && data?.requestId) {
      this.navigateToRelevantScreen(data.type, data.requestId);
    }

    // Mark notification as read
    if (data?.notificationId) {
      this.markAsRead(data.notificationId);
    }
  }

  /**
   * Navigate to relevant screen based on notification type
   */
  private navigateToRelevantScreen(type: string, requestId?: number): void {
    // This would need to be connected to navigation service
    console.log(`Navigate to screen for type: ${type}, requestId: ${requestId}`);
    
    // Example navigation logic:
    // switch (type) {
    //   case 'request_submitted':
    //   case 'request_approved':
    //   case 'request_rejected':
    //     NavigationService.navigate('RequestDetails', { requestId });
    //     break;
    //   case 'password_reset':
    //     NavigationService.navigate('PasswordReset');
    //     break;
    //   default:
    //     NavigationService.navigate('Notifications');
    // }
  }

  /**
   * Get all notifications for current user
   */
  async getNotifications(page = 1, limit = 20): Promise<{ 
    notifications: NotificationData[];
    hasMore: boolean;
    unreadCount: number;
  }> {
    try {
      const response = await apiService.get<{
        results: NotificationData[];
        next: string | null;
        unread_count: number;
      }>(`/notifications/?page=${page}&limit=${limit}`);
      
      return {
        notifications: response.results,
        hasMore: response.next !== null,
        unreadCount: response.unread_count,
      };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return {
        notifications: [],
        hasMore: false,
        unreadCount: 0,
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiService.patch(`/notifications/${notificationId}/`, {
        read: true,
      });
      this.updateBadgeCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark notification as received
   */
  async markAsReceived(notificationId: string): Promise<void> {
    try {
      await apiService.patch(`/notifications/${notificationId}/`, {
        received: true,
      });
    } catch (error) {
      console.error('Failed to mark notification as received:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiService.post('/notifications/mark-all-read/', {});
      this.updateBadgeCount();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    categories: string[];
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }): Promise<void> {
    try {
      await apiService.put('/notifications/preferences/', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<{
    pushEnabled: boolean;
    emailEnabled: boolean;
    categories: string[];
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }> {
    try {
      return await apiService.get('/notifications/preferences/');
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return {
        pushEnabled: true,
        emailEnabled: true,
        categories: [],
        quietHoursEnabled: false,
      };
    }
  }

  /**
   * Schedule local notification
   */
  scheduleLocalNotification(
    title: string,
    message: string,
    date: Date,
    data?: any
  ): void {
    PushNotification.localNotificationSchedule({
      title,
      message,
      date,
      data,
      allowWhileIdle: false,
      priority: 'high',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Show immediate local notification
   */
  showLocalNotification(
    title: string,
    message: string,
    data?: any
  ): void {
    PushNotification.localNotification({
      title,
      message,
      data,
      priority: 'high',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Cancel scheduled notification
   */
  cancelNotification(notificationId: string): void {
    PushNotification.cancelLocalNotifications({ id: notificationId });
  }

  /**
   * Cancel all notifications
   */
  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Update app badge count
   */
  private async updateBadgeCount(): Promise<void> {
    try {
      const { unreadCount } = await this.getNotifications(1, 1);
      PushNotification.setApplicationIconBadgeNumber(unreadCount);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  clearBadgeCount(): void {
    PushNotification.setApplicationIconBadgeNumber(0);
  }

  /**
   * Get device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Check if notifications are enabled
   */
  async checkNotificationStatus(): Promise<{
    enabled: boolean;
    permissions: any;
  }> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        resolve({
          enabled: permissions.alert || permissions.notification,
          permissions,
        });
      });
    });
  }

  /**
   * Test notification (for development)
   */
  async testNotification(): Promise<void> {
    this.showLocalNotification(
      'Test Notification',
      'This is a test notification from PMS app',
      { type: 'test' }
    );
  }
}

export const notificationService = new NotificationService();