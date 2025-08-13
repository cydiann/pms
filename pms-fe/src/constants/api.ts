// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REFRESH: '/auth/refresh/',
    USER_ME: '/auth/users/me/',
    PASSWORD_RESET: '/auth/password-reset/',
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