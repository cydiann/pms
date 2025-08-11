import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NetworkState } from '@/types/api';

interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AppState {
  isOnline: boolean;
  networkState: NetworkState | null;
  notifications: NotificationState[];
  refreshing: boolean;
  theme: 'light' | 'dark';
  language: string;
  settings: {
    pushNotifications: boolean;
    autoSync: boolean;
    offlineMode: boolean;
  };
  offlineQueue: Array<{
    id: string;
    method: string;
    url: string;
    data?: any;
    timestamp: number;
  }>;
}

const initialState: AppState = {
  isOnline: true,
  networkState: null,
  notifications: [],
  refreshing: false,
  theme: 'light',
  language: 'en',
  settings: {
    pushNotifications: true,
    autoSync: true,
    offlineMode: true,
  },
  offlineQueue: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setNetworkState: (state, action: PayloadAction<NetworkState>) => {
      state.networkState = action.payload;
      state.isOnline = action.payload.isConnected;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<NotificationState, 'id'>>) => {
      const notification: NotificationState = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notif => notif.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<AppState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    addToOfflineQueue: (state, action: PayloadAction<{
      method: string;
      url: string;
      data?: any;
    }>) => {
      const queueItem = {
        id: Date.now().toString() + Math.random().toString(36),
        ...action.payload,
        timestamp: Date.now(),
      };
      state.offlineQueue.push(queueItem);
    },
    removeFromOfflineQueue: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(
        item => item.id !== action.payload
      );
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
    },
    processOfflineQueue: (state, action: PayloadAction<string[]>) => {
      // Remove processed items from queue
      state.offlineQueue = state.offlineQueue.filter(
        item => !action.payload.includes(item.id)
      );
    },
  },
});

// Action exports
export const {
  setNetworkState,
  setOnlineStatus,
  addNotification,
  removeNotification,
  clearNotifications,
  setRefreshing,
  setTheme,
  setLanguage,
  updateSettings,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  processOfflineQueue,
} = appSlice.actions;

// Notification helper action creators
export const showSuccessNotification = (message: string) => 
  addNotification({ type: 'success', message, duration: 3000 });

export const showErrorNotification = (message: string) => 
  addNotification({ type: 'error', message, duration: 5000 });

export const showWarningNotification = (message: string) => 
  addNotification({ type: 'warning', message, duration: 4000 });

export const showInfoNotification = (message: string) => 
  addNotification({ type: 'info', message, duration: 3000 });

// Selectors
export const selectApp = (state: { app: AppState }) => state.app;
export const selectIsOnline = (state: { app: AppState }) => state.app.isOnline;
export const selectNetworkState = (state: { app: AppState }) => state.app.networkState;
export const selectNotifications = (state: { app: AppState }) => state.app.notifications;
export const selectIsRefreshing = (state: { app: AppState }) => state.app.refreshing;
export const selectTheme = (state: { app: AppState }) => state.app.theme;
export const selectLanguage = (state: { app: AppState }) => state.app.language;
export const selectAppSettings = (state: { app: AppState }) => state.app.settings;
export const selectOfflineQueue = (state: { app: AppState }) => state.app.offlineQueue;

// Helper selectors
export const selectHasOfflineActions = (state: { app: AppState }) => 
  state.app.offlineQueue.length > 0;

export const selectOfflineQueueCount = (state: { app: AppState }) => 
  state.app.offlineQueue.length;

export default appSlice.reducer;