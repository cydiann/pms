// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REFRESH: '/auth/refresh/',
    USERS: '/auth/users/',
    USER_DETAIL: (id: number) => `/auth/users/${id}/`,
    USER_ME: '/auth/users/me/',
    USER_MY_PERMISSIONS: '/auth/users/my-permissions/',
    USER_VIEW_AS: (id: number) => `/auth/users/${id}/view-as/`,
    USER_MANAGE_GROUPS: (id: number) => `/auth/users/${id}/manage-groups/`,
    USER_MANAGE_PERMISSIONS: (id: number) => `/auth/users/${id}/manage-permissions/`,
    USERS_BY_GROUP: '/auth/users/by-group/',
    AVAILABLE_PERMISSIONS: '/auth/users/available_permissions/',
    GROUPS: '/auth/groups/',
    GROUP_DETAIL: (id: number) => `/auth/groups/${id}/`,
    GROUP_MANAGE_PERMISSIONS: (id: number) => `/auth/groups/${id}/manage-permissions/`,
    PERMISSIONS: '/auth/permissions/',
    PERMISSIONS_BY_CONTENT_TYPE: '/auth/permissions/by-content-type/',
  },
  REQUESTS: {
    LIST: '/requests/',
    CREATE: '/requests/',
    DETAIL: (id: number) => `/requests/${id}/`,
    APPROVE: (id: number) => `/requests/${id}/approve/`,
    REJECT: (id: number) => `/requests/${id}/reject/`,
    REVISE: (id: number) => `/requests/${id}/request-revision/`,
    SUBMIT: (id: number) => `/requests/${id}/submit/`,
    MARK_PURCHASED: (id: number) => `/requests/${id}/mark-purchased/`,
    MARK_DELIVERED: (id: number) => `/requests/${id}/mark-delivered/`,
    MY_REQUESTS: '/requests/my-requests/',
    PENDING_APPROVALS: '/requests/pending-approvals/',
    PURCHASING_QUEUE: '/requests/purchasing-queue/',
    HISTORY: (id: number) => `/requests/${id}/history/`,
    // Document endpoints
    DOCUMENTS: '/requests/documents/',
    DOCUMENT_DETAIL: (id: string) => `/requests/documents/${id}/`,
    DOCUMENT_CONFIRM_UPLOAD: '/requests/documents/confirm-upload/',
    DOCUMENT_DOWNLOAD: (id: string) => `/requests/documents/${id}/download/`,
    DOCUMENTS_BY_REQUEST: '/requests/documents/by-request/',
  },
  ORGANIZATION: {
    WORKSITES: '/org/worksites/',
    DIVISIONS: '/org/divisions/',
  },
  CORE: {
    SYSTEM_STATS: '/core/system-stats/',
    WORKSITE_BREAKDOWN: '/core/worksite-breakdown/',
    DIVISION_BREAKDOWN: '/core/division-breakdown/',
    QUICK_OVERVIEW: '/core/quick-overview/',
  },
};