// App Information
export const APP_INFO = {
  NAME: 'PMS Mobile',
  FULL_NAME: 'Procurement Management System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Mobile app for worksite procurement management',
} as const;

// Form Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    required: 'Username is required',
    minLength: {
      value: 3,
      message: 'Username must be at least 3 characters',
    },
    maxLength: {
      value: 30,
      message: 'Username must not exceed 30 characters',
    },
  },
  PASSWORD: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters',
    },
  },
  ITEM_NAME: {
    required: 'Item name is required',
    minLength: {
      value: 2,
      message: 'Item name must be at least 2 characters',
    },
    maxLength: {
      value: 255,
      message: 'Item name must not exceed 255 characters',
    },
  },
  QUANTITY: {
    required: 'Quantity is required',
    min: {
      value: 0.01,
      message: 'Quantity must be greater than 0',
    },
    max: {
      value: 999999,
      message: 'Quantity is too large',
    },
  },
  DESCRIPTION: {
    maxLength: {
      value: 1000,
      message: 'Description must not exceed 1000 characters',
    },
  },
  REASON: {
    maxLength: {
      value: 500,
      message: 'Reason must not exceed 500 characters',
    },
  },
  NOTES: {
    maxLength: {
      value: 500,
      message: 'Notes must not exceed 500 characters',
    },
  },
} as const;

// Screen Names for Navigation
export const SCREENS = {
  // Auth Stack
  LOGIN: 'Login',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main App Stacks
  EMPLOYEE_STACK: 'EmployeeStack',
  SUPERVISOR_STACK: 'SupervisorStack',
  ADMIN_STACK: 'AdminStack',
  
  // Employee Screens
  DASHBOARD: 'Dashboard',
  MY_REQUESTS: 'MyRequests',
  CREATE_REQUEST: 'CreateRequest',
  REQUEST_DETAILS: 'RequestDetails',
  PROFILE: 'Profile',
  
  // Supervisor Screens
  MY_TEAM: 'MyTeam',
  APPROVAL_DETAILS: 'ApprovalDetails',
  
  // Admin Screens
  ADMIN_DASHBOARD: 'AdminDashboard',
  ALL_REQUESTS: 'AllRequests',
  ALL_USERS: 'AllUsers',
  USER_MANAGEMENT: 'UserManagement',
  SYSTEM_SETTINGS: 'SystemSettings',
  PASSWORD_RESET: 'PasswordReset',
  ACTIVITY_LOG: 'ActivityLog',
} as const;

// Tab Names
export const TABS = {
  DASHBOARD: 'Dashboard',
  MY_REQUESTS: 'My Requests',
  MY_TEAM: 'My Team',
  ALL_REQUESTS: 'All Requests',
  USERS: 'Users',
  CREATE: 'Create',
  PROFILE: 'Profile',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network connection error. Please check your internet connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  VALIDATION: 'Please check your input and try again.',
  LOGIN_FAILED: 'Invalid username or password.',
  TIMEOUT: 'Request timed out. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Logged in successfully',
  LOGOUT: 'Logged out successfully',
  REQUEST_CREATED: 'Request created successfully',
  REQUEST_UPDATED: 'Request updated successfully',
  REQUEST_SUBMITTED: 'Request submitted for approval',
  REQUEST_APPROVED: 'Request approved successfully',
  REQUEST_REJECTED: 'Request rejected',
  REQUEST_REVISED: 'Request sent back for revision',
  PASSWORD_RESET_REQUESTED: 'Password reset requested. Your supervisor will be notified.',
} as const;

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// Refresh Control
export const REFRESH_CONTROL = {
  COLORS: ['#3B82F6', '#10B981'],
  TITLE: 'Pull to refresh',
  TINT_COLOR: '#3B82F6',
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  WITH_TIME: 'MMM DD, YYYY HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: 'YYYY-MM-DD',
} as const;

// Request Categories (common ones for autocomplete)
export const REQUEST_CATEGORIES = [
  'Office Supplies',
  'Construction Materials',
  'Tools & Equipment',
  'Safety Equipment',
  'Electrical Supplies',
  'Plumbing Supplies',
  'Hardware',
  'Machinery Parts',
  'Vehicles & Transport',
  'IT Equipment',
  'Furniture',
  'Cleaning Supplies',
  'Medical Supplies',
  'Other',
] as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;