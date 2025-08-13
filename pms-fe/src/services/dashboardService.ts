import requestService from './requestService';
import userService from './userService';
import organizationService from './organizationService';
import { RequestStats, AdminStats } from '../types/requests';
import { UserStats } from '../types/users';
import { OrganizationStats } from '../types/organization';

interface OverallDashboardStats {
  // Request statistics
  requests: RequestStats;
  
  // User statistics  
  users: UserStats;
  
  // Organization statistics
  organization: OrganizationStats;
  
  // Combined insights
  insights: {
    avg_requests_per_user: number;
    avg_requests_per_worksite: number;
    most_active_worksite: string;
    approval_efficiency: number; // percentage of requests approved
    completion_rate: number; // percentage of requests completed
  };
  
  // Time-based analytics
  trends: {
    requests_this_month: number;
    requests_last_month: number;
    monthly_growth_rate: number;
    users_this_month: number;
    avg_processing_days: number;
  };
}

interface UserDashboardData {
  my_stats: RequestStats;
  quick_actions: Array<{
    title: string;
    subtitle: string;
    action: string;
    count?: number;
    color: string;
  }>;
  recent_activity: Array<{
    type: 'request_created' | 'request_approved' | 'request_rejected' | 'request_completed';
    title: string;
    description: string;
    date: string;
    color: string;
  }>;
}

interface SupervisorDashboardData {
  team_stats: RequestStats;
  pending_approvals: Array<{
    id: number;
    request_number: string;
    item: string;
    created_by_name: string;
    created_at: string;
    days_pending: number;
  }>;
  team_performance: {
    total_subordinates: number;
    active_subordinates: number;
    avg_approval_time: number;
    team_request_volume: number;
  };
}

interface AdminDashboardData {
  system_stats: AdminStats;
  system_health: {
    active_users_today: number;
    requests_created_today: number;
    pending_approvals_overdue: number;
    system_load_indicator: 'low' | 'medium' | 'high';
  };
  recent_system_activity: Array<{
    type: 'user_created' | 'request_submitted' | 'request_approved' | 'system_error';
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

class DashboardService {
  // Get comprehensive admin dashboard data
  async getAdminDashboard(): Promise<AdminDashboardData> {
    try {
      const [systemStats, userStats, orgStats] = await Promise.all([
        requestService.getAdminStats(),
        userService.getUserStats(),
        organizationService.getOrganizationStats(),
      ]);

      // Calculate system health indicators
      const systemHealth = {
        active_users_today: userStats.active_users,
        requests_created_today: 0, // Would be computed by backend
        pending_approvals_overdue: 0, // Would be computed by backend  
        system_load_indicator: this.calculateSystemLoad(systemStats) as 'low' | 'medium' | 'high',
      };

      // Generate recent activity (would normally come from audit logs)
      const recent_system_activity = await this.getRecentSystemActivity();

      return {
        system_stats: systemStats,
        system_health: systemHealth,
        recent_system_activity,
      };
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      throw error;
    }
  }

  // Get supervisor dashboard data
  async getSupervisorDashboard(): Promise<SupervisorDashboardData> {
    try {
      const [teamStats, pendingApprovals, subordinates] = await Promise.all([
        requestService.getSubordinateStats(),
        this.getPendingApprovalsForSupervisor(),
        userService.getSubordinates(),
      ]);

      const team_performance = {
        total_subordinates: subordinates.length,
        active_subordinates: subordinates.filter(s => s.is_active).length,
        avg_approval_time: 2.5, // Would be computed by backend
        team_request_volume: teamStats.total_requests,
      };

      return {
        team_stats: teamStats,
        pending_approvals: pendingApprovals,
        team_performance,
      };
    } catch (error) {
      console.error('Error loading supervisor dashboard:', error);
      throw error;
    }
  }

  // Get user dashboard data
  async getUserDashboard(): Promise<UserDashboardData> {
    try {
      const myStats = await requestService.getDashboardStats();
      
      const quick_actions = [
        {
          title: '📝 Create New Request',
          subtitle: 'Submit a new procurement request',
          action: 'create_request',
          color: '#007bff',
        },
        {
          title: '📋 My Requests',
          subtitle: `${myStats.total_requests} total requests`,
          action: 'view_requests',
          count: myStats.total_requests,
          color: '#28a745',
        },
        {
          title: '⏳ Pending Approval',
          subtitle: `${myStats.pending_requests} awaiting approval`,
          action: 'view_pending',
          count: myStats.pending_requests,
          color: '#ffc107',
        },
        {
          title: '👤 Profile Settings',
          subtitle: 'Update your profile information',
          action: 'view_profile',
          color: '#6c757d',
        },
      ];

      const recent_activity = await this.getRecentUserActivity();

      return {
        my_stats: myStats,
        quick_actions,
        recent_activity,
      };
    } catch (error) {
      console.error('Error loading user dashboard:', error);
      throw error;
    }
  }

  // Get overall system dashboard (for analytics)
  async getOverallDashboard(): Promise<OverallDashboardStats> {
    try {
      const [requests, users, organization] = await Promise.all([
        requestService.getAdminStats(),
        userService.getUserStats(),
        organizationService.getOrganizationStats(),
      ]);

      // Calculate insights
      const insights = {
        avg_requests_per_user: users.total_users > 0 ? requests.total_requests / users.total_users : 0,
        avg_requests_per_worksite: organization.total_worksites > 0 
          ? requests.total_requests / organization.total_worksites : 0,
        most_active_worksite: 'Main Office', // Would be computed from data
        approval_efficiency: requests.total_requests > 0 
          ? (requests.approved_requests / requests.total_requests) * 100 : 0,
        completion_rate: requests.total_requests > 0 
          ? (requests.completed_requests / requests.total_requests) * 100 : 0,
      };

      // Calculate trends (would normally be computed by backend)
      const trends = {
        requests_this_month: requests.monthly_request_count,
        requests_last_month: 0, // Would come from backend
        monthly_growth_rate: 0, // Would be computed
        users_this_month: users.new_users_this_month,
        avg_processing_days: requests.average_processing_time,
      };

      return {
        requests,
        users,
        organization,
        insights,
        trends,
      };
    } catch (error) {
      console.error('Error loading overall dashboard:', error);
      throw error;
    }
  }

  // Get dashboard data based on user role
  async getDashboardForUser(user: { is_superuser: boolean; id: number }): Promise<
    UserDashboardData | SupervisorDashboardData | AdminDashboardData
  > {
    if (user.is_superuser) {
      return await this.getAdminDashboard();
    }

    // Check if user is a supervisor (has subordinates)
    const subordinates = await userService.getSubordinates();
    if (subordinates.length > 0) {
      return await this.getSupervisorDashboard();
    }

    return await this.getUserDashboard();
  }

  // Helper method to get pending approvals for current supervisor
  private async getPendingApprovalsForSupervisor() {
    try {
      const response = await requestService.getSubordinateRequests({
        status: 'pending',
        page_size: 10,
      });

      return response.results.map(request => ({
        id: request.id,
        request_number: request.request_number,
        item: request.item,
        created_by_name: request.created_by_name,
        created_at: request.created_at,
        days_pending: this.calculateDaysPending(request.created_at),
      }));
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      return [];
    }
  }

  // Helper method to calculate days pending
  private calculateDaysPending(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Helper method to calculate system load
  private calculateSystemLoad(stats: AdminStats): string {
    const totalActiveRequests = stats.pending_requests + stats.approved_requests;
    
    if (totalActiveRequests < 10) return 'low';
    if (totalActiveRequests < 50) return 'medium';
    return 'high';
  }

  // Helper method to get recent user activity
  private async getRecentUserActivity() {
    // This would normally come from an activity/audit log API
    return [
      {
        type: 'request_created' as const,
        title: 'Request Submitted',
        description: 'Your request for Office Chairs has been submitted',
        date: new Date().toISOString(),
        color: '#007bff',
      },
      {
        type: 'request_approved' as const,
        title: 'Request Approved',
        description: 'Your request for Laptops has been approved',
        date: new Date(Date.now() - 86400000).toISOString(),
        color: '#28a745',
      },
    ];
  }

  // Helper method to get recent system activity
  private async getRecentSystemActivity() {
    // This would normally come from system logs
    return [
      {
        type: 'user_created' as const,
        description: 'New user John Doe created',
        timestamp: new Date().toISOString(),
        severity: 'info' as const,
      },
      {
        type: 'request_submitted' as const,
        description: '5 new requests submitted today',
        timestamp: new Date().toISOString(),
        severity: 'info' as const,
      },
    ];
  }

  // Utility methods for dashboard UI
  getQuickActionColor(action: string): string {
    const colorMap: Record<string, string> = {
      'create_request': '#007bff',
      'view_requests': '#28a745',
      'view_pending': '#ffc107',
      'view_profile': '#6c757d',
      'manage_users': '#6f42c1',
      'system_settings': '#fd7e14',
    };
    return colorMap[action] || '#6c757d';
  }

  getActivityColor(type: string): string {
    const colorMap: Record<string, string> = {
      'request_created': '#007bff',
      'request_approved': '#28a745',
      'request_rejected': '#dc3545',
      'request_completed': '#20c997',
      'user_created': '#6f42c1',
      'system_error': '#dc3545',
    };
    return colorMap[type] || '#6c757d';
  }

  formatTrendPercentage(current: number, previous: number): string {
    if (previous === 0) return '+0%';
    
    const percentage = ((current - previous) / previous) * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  formatInsightValue(value: number, type: 'percentage' | 'decimal' | 'integer'): string {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(2);
      case 'integer':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  }
}

const dashboardService = new DashboardService();
export default dashboardService;