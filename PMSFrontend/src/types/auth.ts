export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  full_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  worksite: number | null;
  supervisor: number | null;
  deleted_at: string | null;
  created_at: string;
  direct_reports?: User[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PasswordResetRequest {
  username: string;
  reason?: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type UserRole = 'employee' | 'supervisor' | 'admin';

export interface UserPermissions {
  canCreateRequests: boolean;
  canApproveRequests: boolean;
  canManageUsers: boolean;
  canViewAllRequests: boolean;
  canManageSystem: boolean;
}