// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-domain.com',
  // For iOS Simulator use: 'http://localhost:8000'
  // For Android Emulator use: 'http://10.0.2.2:8000' 
  // For physical device use your computer's IP: 'http://192.168.1.xxx:8000'
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    REFRESH: '/auth/refresh/',
    ME: '/auth/users/me/',
    PASSWORD_RESET: '/auth/password-reset/',
    VIEW_AS: (userId: number) => `/auth/users/${userId}/view-as/`,
  },
  
  // Organization
  ORGANIZATION: {
    WORKSITES: '/org/worksites/',
    DIVISIONS: '/org/divisions/',
  },
  
  // Requests
  REQUESTS: {
    LIST: '/requests/',
    CREATE: '/requests/',
    DETAIL: (id: number) => `/requests/${id}/`,
    UPDATE: (id: number) => `/requests/${id}/`,
    DELETE: (id: number) => `/requests/${id}/`,
    APPROVE: (id: number) => `/requests/${id}/approve/`,
    REJECT: (id: number) => `/requests/${id}/reject/`,
    REVISE: (id: number) => `/requests/${id}/revise/`,
    HISTORY: (id: number) => `/requests/${id}/history/`,
    // Phase 3: Supervisor and Purchasing endpoints
    TEAM: '/requests/team/',
    BULK_APPROVAL: '/requests/bulk-approval/',
    PURCHASING_QUEUE: '/requests/purchasing-queue/',
    UPDATE_PURCHASING_STATUS: (id: number) => `/requests/${id}/purchasing-status/`,
    MARK_COMPLETED: (id: number) => `/requests/${id}/complete/`,
  },
  
  // Admin
  ADMIN: {
    STATS: '/admin/stats/',
    ACTIVITY: '/admin/activity/',
    USERS: '/admin/users/',
    USER_DETAIL: (id: number) => `/admin/users/${id}/`,
    USER_REQUESTS: (id: number) => `/admin/users/${id}/requests/`,
    RESET_PASSWORD: (id: number) => `/admin/users/${id}/reset-password/`,
    DEACTIVATE_USER: (id: number) => `/admin/users/${id}/deactivate/`,
    REACTIVATE_USER: (id: number) => `/admin/users/${id}/reactivate/`,
    BULK_OPERATIONS: '/admin/users/bulk-operation/',
    CONFIG: '/admin/config/',
    HEALTH: '/admin/health/',
    EXPORT: (type: string) => `/admin/export/${type}/`,
    ANNOUNCEMENTS: '/admin/announcements/',
  },
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  USER_DATA: 'user_data',
  OFFLINE_REQUESTS: 'offline_requests',
  CACHED_REQUESTS: 'cached_requests',
  APP_SETTINGS: 'app_settings',
  NETWORK_QUEUE: 'network_queue',
} as const;

// Request Status Priorities (for sorting)
export const STATUS_PRIORITY = {
  draft: 1,
  revision_requested: 2,
  pending: 3,
  in_review: 4,
  approved: 5,
  purchasing: 6,
  ordered: 7,
  delivered: 8,
  completed: 9,
  rejected: 10,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Cache settings
export const CACHE_SETTINGS = {
  USER_DATA_TTL: 1000 * 60 * 30, // 30 minutes
  REQUESTS_TTL: 1000 * 60 * 10,  // 10 minutes
  ORGANIZATIONS_TTL: 1000 * 60 * 60, // 1 hour
} as const;