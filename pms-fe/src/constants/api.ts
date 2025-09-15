// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://pms-backend-production-20b3.up.railway.app'
    : 'http://localhost:8000',
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