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
    USER_MY_PERMISSIONS: '/auth/users/my_permissions/',
    USER_VIEW_AS: (id: number) => `/auth/users/${id}/view_as/`,
    USER_MANAGE_GROUPS: (id: number) => `/auth/users/${id}/manage_groups/`,
    USER_MANAGE_PERMISSIONS: (id: number) => `/auth/users/${id}/manage_permissions/`,
    USERS_BY_GROUP: '/auth/users/by_group/',
    GROUPS: '/auth/groups/',
    GROUP_DETAIL: (id: number) => `/auth/groups/${id}/`,
    GROUP_MANAGE_PERMISSIONS: (id: number) => `/auth/groups/${id}/manage_permissions/`,
    PERMISSIONS: '/auth/permissions/',
    PERMISSIONS_BY_CONTENT_TYPE: '/auth/permissions/by_content_type/',
  },
  REQUESTS: {
    LIST: '/requests/',
    CREATE: '/requests/',
    DETAIL: (id: number) => `/requests/${id}/`,
    APPROVE: (id: number) => `/requests/${id}/approve/`,
    REJECT: (id: number) => `/requests/${id}/reject/`,
    REVISE: (id: number) => `/requests/${id}/revise/`,
    HISTORY: (id: number) => `/requests/${id}/history/`,
  },
  ORGANIZATION: {
    WORKSITES: '/org/worksites/',
    DIVISIONS: '/org/divisions/',
  },
};