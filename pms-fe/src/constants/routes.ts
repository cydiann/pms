// Navigation Route Constants
// Note: React Native uses tab-based navigation, not paths like React Router

export const SCREEN_NAMES = {
  // Auth screens
  LOGIN: 'Login',

  // Common screens (all users)
  DASHBOARD: 'Dashboard',
  MY_REQUESTS: 'MyRequests',
  PROFILE: 'Profile',
  REQUEST_DETAIL: 'RequestDetail',
  CREATE_REQUEST: 'CreateRequest',

  // Supervisor screens
  PENDING_APPROVALS: 'PendingApprovals',
  APPROVED_REQUESTS: 'ApprovedRequests',
  MY_TEAM: 'MyTeam',
  TEAM_REQUESTS: 'TeamRequests',

  // Admin screens
  ADMIN_DASHBOARD: 'AdminDashboard',
  ALL_REQUESTS: 'AllRequests',
  USER_MANAGEMENT: 'UserManagement',
  WORKSITE_MANAGEMENT: 'WorksiteManagement',
  GROUP_MANAGEMENT: 'GroupManagement',
  ALL_USERS: 'AllUsers',

  // Purchasing screens
  PURCHASING_QUEUE: 'PurchasingQueue',
} as const;

export const TAB_KEYS = {
  DASHBOARD: 'dashboard',
  REQUESTS: 'requests',
  PURCHASING: 'purchasing',
  MY_TEAM: 'myTeam',
  ALL_REQUESTS: 'allRequests',
  USER_MANAGEMENT: 'userManagement',
  WORKSITE_MANAGEMENT: 'worksiteManagement',
  GROUP_MANAGEMENT: 'groupManagement',
  PROFILE: 'profile',
} as const;

// Export type for tab keys
export type TabKey = typeof TAB_KEYS[keyof typeof TAB_KEYS];
export type ScreenName = typeof SCREEN_NAMES[keyof typeof SCREEN_NAMES];
