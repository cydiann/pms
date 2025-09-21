import { Platform } from 'react-native';
import ENV_CONFIG from '../config/env';

const getBaseUrl = () => {
  console.log('ENV Variables:', {
    API_HOST_LOCAL: ENV_CONFIG.API_HOST_LOCAL,
    API_HOST_NETWORK: ENV_CONFIG.API_HOST_NETWORK,
    API_PORT: ENV_CONFIG.API_PORT,
    API_PROTOCOL: ENV_CONFIG.API_PROTOCOL,
    NODE_ENV: ENV_CONFIG.NODE_ENV
  });

  const protocol = ENV_CONFIG.API_PROTOCOL || 'http';
  const port = ENV_CONFIG.API_PORT || '8000';

  if (Platform.OS === 'web') {
    const host = ENV_CONFIG.API_HOST_LOCAL || 'localhost';
    return `${protocol}://${host}:${port}`;
  } else {
    // For physical Android device, use your computer's network IP
    // For iOS simulator, localhost works. For Android emulator use 10.0.2.2
    const defaultHost = Platform.OS === 'android' ? '192.168.1.2' : 'localhost';
    const host = ENV_CONFIG.API_HOST_NETWORK || defaultHost;
    return `${protocol}://${host}:${port}`;
  }
};

const baseUrl = getBaseUrl();
console.log('🌐 API_CONFIG.BASE_URL:', baseUrl);

export const API_CONFIG = {
  BASE_URL: baseUrl,
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login/',
    REFRESH: '/api/auth/refresh/',
    USERS: '/api/auth/users/',
    USER_DETAIL: (id: number) => `/api/auth/users/${id}/`,
    USER_ME: '/api/auth/users/me/',
    USER_MY_PERMISSIONS: '/api/auth/users/my-permissions/',
    USER_VIEW_AS: (id: number) => `/api/auth/users/${id}/view-as/`,
    USER_MANAGE_GROUPS: (id: number) => `/api/auth/users/${id}/manage-groups/`,
    USER_MANAGE_PERMISSIONS: (id: number) => `/api/auth/users/${id}/manage-permissions/`,
    USERS_BY_GROUP: '/api/auth/users/by-group/',
    AVAILABLE_PERMISSIONS: '/api/auth/users/available_permissions/',
    GROUPS: '/api/auth/groups/',
    GROUP_DETAIL: (id: number) => `/api/auth/groups/${id}/`,
    GROUP_MANAGE_PERMISSIONS: (id: number) => `/api/auth/groups/${id}/manage-permissions/`,
    PERMISSIONS: '/api/auth/permissions/',
    PERMISSIONS_BY_CONTENT_TYPE: '/api/auth/permissions/by-content-type/',
  },
  REQUESTS: {
    LIST: '/api/requests/',
    CREATE: '/api/requests/',
    DETAIL: (id: number) => `/api/requests/${id}/`,
    APPROVE: (id: number) => `/api/requests/${id}/approve/`,
    REJECT: (id: number) => `/api/requests/${id}/reject/`,
    REVISE: (id: number) => `/api/requests/${id}/request-revision/`,
    SUBMIT: (id: number) => `/api/requests/${id}/submit/`,
    MARK_PURCHASED: (id: number) => `/api/requests/${id}/mark-purchased/`,
    MARK_DELIVERED: (id: number) => `/api/requests/${id}/mark-delivered/`,
    MY_REQUESTS: '/api/requests/my-requests/',
    PENDING_APPROVALS: '/api/requests/pending-approvals/',
    PURCHASING_QUEUE: '/api/requests/purchasing-queue/',
    HISTORY: (id: number) => `/api/requests/${id}/history/`,
    // Document endpoints
    DOCUMENTS: '/api/requests/documents/',
    DOCUMENT_DETAIL: (id: string) => `/api/requests/documents/${id}/`,
    DOCUMENT_CONFIRM_UPLOAD: '/api/requests/documents/confirm-upload/',
    DOCUMENT_DOWNLOAD: (id: string) => `/api/requests/documents/${id}/download/`,
    DOCUMENTS_BY_REQUEST: '/api/requests/documents/by-request/',
  },
  ORGANIZATION: {
    WORKSITES: '/api/org/worksites/',
    DIVISIONS: '/api/org/divisions/',
  },
  CORE: {
    SYSTEM_STATS: '/api/core/system-stats/',
    WORKSITE_BREAKDOWN: '/api/core/worksite-breakdown/',
    DIVISION_BREAKDOWN: '/api/core/division-breakdown/',
    QUICK_OVERVIEW: '/api/core/quick-overview/',
  },
};
