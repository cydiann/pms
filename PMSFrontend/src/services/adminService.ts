import { apiService } from './api';
import { PaginatedResponse } from '@/types/api';

interface AdminStats {
  requests: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  worksites: {
    total: number;
    active: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  worksite_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  supervisor_name?: string;
}

interface CreateUserData {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  worksite_id: number;
  supervisor_id?: number;
}

interface UpdateUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  worksite_id?: number;
  supervisor_id?: number;
  is_active?: boolean;
}

interface UserFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  worksite_id?: number;
  role?: string;
}

export class AdminService {
  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    return apiService.get<AdminStats>('/admin/stats/');
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    const response = await apiService.get<{ results: RecentActivity[] }>(
      `/admin/activity/?limit=${limit}`
    );
    return response.results;
  }

  /**
   * Get paginated list of users
   */
  async getUsers(params?: UserFilterParams): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.worksite_id) queryParams.append('worksite_id', params.worksite_id.toString());
    if (params?.role) queryParams.append('role', params.role);

    const url = `/admin/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<User>>(url);
  }

  /**
   * Get single user by ID
   */
  async getUser(id: number): Promise<User> {
    return apiService.get<User>(`/admin/users/${id}/`);
  }

  /**
   * Create new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    return apiService.post<User>('/admin/users/', data);
  }

  /**
   * Update existing user
   */
  async updateUser(data: UpdateUserData): Promise<User> {
    const { id, ...updateData } = data;
    return apiService.patch<User>(`/admin/users/${id}/`, updateData);
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: number): Promise<{ temp_password: string; message: string }> {
    return apiService.post(`/admin/users/${userId}/reset-password/`, {});
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: number): Promise<{ message: string }> {
    return apiService.post(`/admin/users/${userId}/deactivate/`, {});
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId: number): Promise<{ message: string }> {
    return apiService.post(`/admin/users/${userId}/reactivate/`, {});
  }

  /**
   * Delete user (permanent)
   */
  async deleteUser(userId: number): Promise<void> {
    return apiService.delete(`/admin/users/${userId}/`);
  }

  /**
   * Get user's request history
   */
  async getUserRequests(userId: number, params?: { 
    page?: number; 
    status?: string; 
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);

    const url = `/admin/users/${userId}/requests/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<any>>(url);
  }

  /**
   * Get system activity logs
   */
  async getActivityLogs(params?: {
    page?: number;
    user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<RecentActivity>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id.toString());
    if (params?.action) queryParams.append('action', params.action);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `/admin/activity/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<RecentActivity>>(url);
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<{
    maintenance_mode: boolean;
    announcement: string;
    max_file_size: number;
    allowed_file_types: string[];
  }> {
    return apiService.get('/admin/config/');
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(config: {
    maintenance_mode?: boolean;
    announcement?: string;
    max_file_size?: number;
    allowed_file_types?: string[];
  }): Promise<{ message: string }> {
    return apiService.patch('/admin/config/', config);
  }

  /**
   * Export data in various formats
   */
  async exportData(type: 'users' | 'requests' | 'activity', format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> {
    const response = await apiService.get(
      `/admin/export/${type}/?format=${format}`, 
      {}, 
      { responseType: 'blob' }
    );
    return response;
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(operation: 'activate' | 'deactivate' | 'delete', userIds: number[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return apiService.post('/admin/users/bulk-operation/', {
      operation,
      user_ids: userIds,
    });
  }

  /**
   * Send system announcement
   */
  async sendAnnouncement(data: {
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high';
    target_users?: number[];
    target_worksites?: number[];
    schedule_at?: string;
  }): Promise<{ message: string; announcement_id: number }> {
    return apiService.post('/admin/announcements/', data);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    database: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected';
    disk_space: number;
    memory_usage: number;
    active_users: number;
  }> {
    return apiService.get('/admin/health/');
  }
}

export const adminService = new AdminService();