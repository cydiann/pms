import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import {
  ExtendedUser,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserListItem,
  Subordinate,
  UserFilters,
  UserStats,
  UserGroup,
  UserRoleInfo,
  TeamMember,
} from '../types/users';
import { PaginatedResponse, UserQueryParams } from '../types/api';

interface UserPermissions {
  is_superuser: boolean;
  groups: Array<{ id: number; name: string }>;
  permissions: string[];
}

interface ViewAsResponse {
  user: ExtendedUser;
  permissions: string[];
  groups: Array<{ id: number; name: string }>;
  is_superuser: boolean;
}

interface ManageGroupsDto {
  action: 'add' | 'remove' | 'set';
  group_ids: number[];
}

interface ManagePermissionsDto {
  action: 'add' | 'remove' | 'set';
  permission_ids: number[];
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type?: string;
}

interface UsersByGroupResponse {
  group: { id: number; name: string };
  user_count: number;
  users: ExtendedUser[];
}

class UserService {
  // Get all users (admin only, or filtered for supervisors)
  async getUsers(params?: UserQueryParams): Promise<PaginatedResponse<UserListItem>> {
    console.log('UserService: getUsers called with params:', params);
    
    // Filter out undefined values
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });
    }
    
    const queryString = Object.keys(cleanParams).length > 0 ? new URLSearchParams(cleanParams).toString() : '';
    const url = `${API_ENDPOINTS.AUTH.USERS}${queryString ? `?${queryString}` : ''}`;
    console.log('UserService: Making request to URL:', url);
    
    try {
      const result = await apiClient.get<PaginatedResponse<UserListItem>>(url);
      console.log('UserService: getUsers response:', result);
      return result;
    } catch (error) {
      console.error('UserService: getUsers error:', error);
      throw error;
    }
  }

  // Get single user details
  async getUser(id: number): Promise<ExtendedUser> {
    return await apiClient.get<ExtendedUser>(API_ENDPOINTS.AUTH.USER_DETAIL(id));
  }

  // Get current user profile
  async getCurrentUser(): Promise<ExtendedUser> {
    console.log('UserService: getCurrentUser called');
    const url = API_ENDPOINTS.AUTH.USER_ME;
    console.log('UserService: Making request to URL:', url);
    
    try {
      const result = await apiClient.get<ExtendedUser>(url);
      console.log('UserService: getCurrentUser response:', result);
      return result;
    } catch (error) {
      console.error('UserService: getCurrentUser error:', error);
      throw error;
    }
  }

  // Get current user's permissions
  async getCurrentUserPermissions(): Promise<UserPermissions> {
    return await apiClient.get<UserPermissions>(API_ENDPOINTS.AUTH.USER_MY_PERMISSIONS);
  }

  // Get current user's role information for UI display
  async getUserRoleInfo(): Promise<UserRoleInfo> {
    return await apiClient.get<UserRoleInfo>(API_ENDPOINTS.AUTH.USER_ROLE_INFO);
  }

  // Admin: View user as if logged in as them
  async viewAsUser(id: number): Promise<ViewAsResponse> {
    return await apiClient.get<ViewAsResponse>(API_ENDPOINTS.AUTH.USER_VIEW_AS(id));
  }

  // Create new user (admin only)
  async createUser(data: CreateUserDto): Promise<ExtendedUser> {
    return await apiClient.post<ExtendedUser>(API_ENDPOINTS.AUTH.USERS, data);
  }

  // Update user (admin only, or self for basic info)
  async updateUser(id: number, data: UpdateUserDto): Promise<ExtendedUser> {
    return await apiClient.put<ExtendedUser>(API_ENDPOINTS.AUTH.USER_DETAIL(id), data);
  }

  // Delete user (soft delete - admin only)
  async deleteUser(id: number): Promise<void> {
    return await apiClient.delete<void>(API_ENDPOINTS.AUTH.USER_DETAIL(id));
  }

  // Change password for current user
  async changePassword(data: ChangePasswordDto): Promise<void> {
    return await apiClient.post<void>('/auth/change-password/', data);
  }

  // Get users by group
  async getUsersByGroup(groupId?: number, groupName?: string): Promise<UsersByGroupResponse> {
    const params = new URLSearchParams();
    if (groupId) params.append('group_id', groupId.toString());
    if (groupName) params.append('group_name', groupName);
    
    const url = `${API_ENDPOINTS.AUTH.USERS_BY_GROUP}?${params.toString()}`;
    return await apiClient.get<UsersByGroupResponse>(url);
  }

  // Get subordinates (users supervised by current user)
  async getSubordinates(): Promise<Subordinate[]> {
    // This would be implemented based on the user's supervisor relationship
    const currentUser = await this.getCurrentUser();
    if (!currentUser.id) return [];

    // Get all users where supervisor = current user
    const response = await this.getUsers({ supervisor: currentUser.id });
    return response.results.map(user => ({
      ...user,
      total_requests: 0, // Would be computed by backend
      pending_requests: 0,
      approved_requests: 0,
      draft_requests: 0,
    }));
  }

  // Get my team (direct subordinates) - matches backend endpoint
  async getMyTeam(): Promise<TeamMember[]> {
    const response = await apiClient.get<{ team_members: TeamMember[] }>('/api/auth/users/my-team/');
    return response.team_members || [];
  }

  // Get subordinates of specific user (drill-down functionality)
  async getSubordinatesOf(userId: number): Promise<TeamMember[]> {
    const response = await apiClient.get<{ subordinates: TeamMember[] }>(`/api/auth/users/${userId}/subordinates/`);
    return response.subordinates || [];
  }

  // Get team hierarchy tree
  async getTeamHierarchy(userId: number): Promise<any> {
    return await apiClient.get(`/api/auth/users/${userId}/team-hierarchy/`);
  }

  // Admin: Manage user groups
  async manageUserGroups(userId: number, data: ManageGroupsDto): Promise<{
    message: string;
    groups: Array<{ id: number; name: string }>;
  }> {
    return await apiClient.post(API_ENDPOINTS.AUTH.USER_MANAGE_GROUPS(userId), data);
  }

  // Admin: Manage user permissions
  async manageUserPermissions(userId: number, data: ManagePermissionsDto): Promise<{
    message: string;
    user_permissions: Array<{ id: number; name: string; codename: string }>;
  }> {
    return await apiClient.post(API_ENDPOINTS.AUTH.USER_MANAGE_PERMISSIONS(userId), data);
  }

  // Get all groups
  async getGroups(): Promise<Array<{
    id: number;
    name: string;
    user_count: number;
    permissions: Permission[];
  }>> {
    return await apiClient.get(API_ENDPOINTS.AUTH.GROUPS);
  }

  // Get single group details
  async getGroup(id: number): Promise<{
    id: number;
    name: string;
    users: Array<{ id: number; username: string; full_name: string }>;
    permissions: Permission[];
  }> {
    return await apiClient.get(API_ENDPOINTS.AUTH.GROUP_DETAIL(id));
  }

  // Create new group (admin only)
  async createGroup(data: { name: string; permissions?: number[] }): Promise<UserGroup> {
    return await apiClient.post<UserGroup>(API_ENDPOINTS.AUTH.GROUPS, data);
  }

  // Update group (admin only)
  async updateGroup(id: number, data: { name?: string }): Promise<UserGroup> {
    return await apiClient.put<UserGroup>(API_ENDPOINTS.AUTH.GROUP_DETAIL(id), data);
  }

  // Delete group (admin only)
  async deleteGroup(id: number): Promise<void> {
    return await apiClient.delete<void>(API_ENDPOINTS.AUTH.GROUP_DETAIL(id));
  }

  // Manage group permissions
  async manageGroupPermissions(groupId: number, data: ManagePermissionsDto): Promise<{
    message: string;
    permissions: Permission[];
  }> {
    return await apiClient.post(API_ENDPOINTS.AUTH.GROUP_MANAGE_PERMISSIONS(groupId), data);
  }

  // Get all permissions
  async getPermissions(): Promise<Permission[]> {
    return await apiClient.get<Permission[]>(API_ENDPOINTS.AUTH.PERMISSIONS);
  }

  // Get all available permissions (includes app_label and content_type)
  async getAvailablePermissions(): Promise<Array<{
    id: number;
    name: string;
    codename: string;
    content_type?: string;
    app_label?: string;
  }>> {
    return await apiClient.get(API_ENDPOINTS.AUTH.AVAILABLE_PERMISSIONS);
  }

  // Get permissions grouped by content type
  async getPermissionsByContentType(): Promise<Record<string, Permission[]>> {
    return await apiClient.get<Record<string, Permission[]>>(API_ENDPOINTS.AUTH.PERMISSIONS_BY_CONTENT_TYPE);
  }

  // Get user statistics (for admin dashboard)
  async getUserStats(): Promise<UserStats> {
    return await apiClient.get<UserStats>(`${API_ENDPOINTS.AUTH.USERS}stats/`);
  }

  // Utility methods for user management
  canUserEdit(user: ExtendedUser, currentUser: ExtendedUser): boolean {
    // Users can edit themselves or admin can edit anyone
    return user.id === currentUser.id || currentUser.is_superuser;
  }

  canUserDelete(user: ExtendedUser, currentUser: ExtendedUser): boolean {
    // Only admin can delete users, and cannot delete themselves
    return currentUser.is_superuser && user.id !== currentUser.id;
  }

  canUserManagePermissions(currentUser: ExtendedUser): boolean {
    return currentUser.is_superuser;
  }

  isUserSupervisor(user: ExtendedUser): boolean {
    // Check if user has any direct reports (would need to be computed by backend)
    return true; // This would be determined by checking if user.id appears as supervisor for other users
  }

  getUserRoleDisplay(user: ExtendedUser | UserListItem, language: string = 'en'): string {
    if (user.is_superuser) return this.translateGroupName('Administrator', language);
    if ('groups' in user && user.groups && user.groups.length > 0) {
      return user.groups.map(g => this.translateGroupName(g.name, language)).join(', ');
    }
    return this.translateGroupName('Employee', language);
  }

  getUserStatusColor(user: ExtendedUser | UserListItem): string {
    if (!user.is_active) return '#dc3545'; // red
    if (user.is_superuser) return '#6f42c1'; // purple
    return '#28a745'; // green
  }

  formatUserPermissions(permissions: string[], translateFn?: (key: string, options?: any) => string): string[] {
    return permissions.map(perm => {
      // Convert 'app.action_model' to readable format
      const parts = perm.split('.');
      if (parts.length === 2) {
        const [app, codename] = parts;
        
        // Try to get translation if function is provided
        if (translateFn) {
          const translationKey = `permissions.${codename}`;
          const translation = translateFn(translationKey);
          // Only use translation if it's not the same as the key (meaning it was found)
          if (translation !== translationKey) {
            return translation;
          }
        }
        
        // Fallback to formatted version
        return codename.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return perm;
    });
  }

  // Translate group names based on current language
  translateGroupName(groupName: string, language: string = 'en'): string {
    const translations: Record<string, Record<string, string>> = {
      'Administrator': {
        'en': 'Administrator',
        'tr': 'Sistem Yöneticisi'
      },
      'Supervisor': {
        'en': 'Supervisor', 
        'tr': 'Süpervizör'
      },
      'Employee': {
        'en': 'Employee',
        'tr': 'Çalışan'
      },
      'Manager': {
        'en': 'Manager',
        'tr': 'Müdür'
      },
      'Team Lead': {
        'en': 'Team Lead',
        'tr': 'Takım Lideri'
      },
      'HR': {
        'en': 'HR',
        'tr': 'İnsan Kaynakları'
      },
      'Finance': {
        'en': 'Finance',
        'tr': 'Finans'
      },
      'Procurement': {
        'en': 'Procurement',
        'tr': 'Satın Alma'
      }
    };

    const groupTranslations = translations[groupName];
    if (groupTranslations && groupTranslations[language]) {
      return groupTranslations[language];
    }
    
    // Return original name if no translation found
    return groupName;
  }

  // Utility to safely get worksite name
  getWorksiteName(user: ExtendedUser | UserListItem): string {
    if (!user.worksite_name) return 'No Worksite';
    
    // Handle Django method wrapper bug
    if (user.worksite_name.includes('method-wrapper') || user.worksite_name.includes('NoneType')) {
      return 'No Worksite';
    }
    
    return user.worksite_name;
  }
}

const userService = new UserService();
export default userService;