// Extended User Interface - matches UserSerializer (excluding legacy email field)
export interface ExtendedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string; // from serializer: get_full_name()
  
  // Role and permissions - only admin vs regular user distinction
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean; // This determines admin access
  
  // Organization relationships
  worksite: number | null;
  worksite_name: string | null; // from serializer: worksite.__str__
  
  // Hierarchical relationships - any user can supervise others
  supervisor?: number;
  supervisor_name?: string; // from serializer: supervisor.get_full_name
  
  // Groups and permissions
  groups: Array<{ id: number; name: string }>; // from serializer
  permissions: string[]; // from serializer: get_all_permissions()
  user_permissions: Array<{ id: number; name: string; codename: string }>; // individual user permissions
  
  // Timestamps
  created_at: string;
  deleted_at?: string;
}

// User Creation/Update DTOs - match what backend actually accepts
export interface CreateUserDto {
  username: string;
  first_name: string;
  last_name: string;
  password?: string; // will be set by admin
  worksite: number;
  supervisor?: number;
  is_superuser?: boolean; // Only admin can set this
  groups?: number[]; // group IDs
}

export interface UpdateUserDto {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  worksite?: number;
  supervisor?: number;
  is_superuser?: boolean; // Only admin can change this
  is_active?: boolean;
  groups?: number[]; // group IDs
}

// Password Management
export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// User List/Pagination - simplified for actual API response
export interface UserListItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_superuser: boolean;
  is_active: boolean;
  worksite_name: string | null;
  supervisor_name?: string;
  created_at: string;
}

// Subordinate (for users who supervise others)
export interface Subordinate extends UserListItem {
  // Request statistics for this subordinate (computed)
  total_requests?: number;
  pending_requests?: number;
  approved_requests?: number;
  draft_requests?: number;
}

// User Filters
export interface UserFilters {
  is_superuser?: boolean;
  worksite?: number[];
  supervisor?: number[];
  is_active?: boolean;
  search?: string;
  groups?: number[];
}

// User Role Information - from backend's get_role_info()
export interface UserRoleInfo {
  has_subordinates: boolean;
  can_purchase: boolean;
  can_view_all_requests: boolean;
  is_admin: boolean;
  subordinate_count: number;
}

// User Statistics (for admin dashboard)
export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
  users_with_subordinates: number; // Users who supervise others
  users_by_worksite: Record<string, number>;
  new_users_this_month: number;
}

// Groups (from GroupSerializer)
export interface UserGroup {
  id: number;
  name: string;
  user_count: number;
  permissions: Array<{
    id: number;
    name: string;
    codename: string;
  }>;
}