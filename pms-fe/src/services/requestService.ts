import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import {
  Request,
  CreateRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  ReviseRequestDto,
  RequestFilters,
  ApprovalHistory,
  RequestStats,
  AdminStats,
} from '../types/requests';
import { PaginatedResponse, RequestQueryParams } from '../types/api';

class RequestService {
  // Get user's requests with optional filters
  async getMyRequests(params?: RequestQueryParams): Promise<PaginatedResponse<Request>> {
    const cleanParams = this.cleanParams(params);
    const queryString = cleanParams ? new URLSearchParams(cleanParams).toString() : '';
    const url = `${API_ENDPOINTS.REQUESTS.MY_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get<PaginatedResponse<Request>>(url);
  }

  // Get all requests (admin only)
  async getAllRequests(params?: RequestQueryParams): Promise<PaginatedResponse<Request>> {
    const cleanParams = this.cleanParams(params);
    const queryString = cleanParams ? new URLSearchParams(cleanParams).toString() : '';
    const url = `${API_ENDPOINTS.REQUESTS.LIST}${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get<PaginatedResponse<Request>>(url);
  }

  // Search requests with comprehensive filters
  async searchRequests(searchTerm: string, filters?: Omit<RequestQueryParams, 'search'>): Promise<PaginatedResponse<Request>> {
    const params: RequestQueryParams = {
      search: searchTerm,
      ...filters
    };
    return await this.getAllRequests(params);
  }

  // Get requests from subordinates (for supervisors)
  async getSubordinateRequests(params?: RequestQueryParams): Promise<PaginatedResponse<Request>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const url = `${API_ENDPOINTS.REQUESTS.MY_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get<PaginatedResponse<Request>>(url);
  }

  // Get single request details
  async getRequest(id: number): Promise<Request> {
    return await apiClient.get<Request>(API_ENDPOINTS.REQUESTS.DETAIL(id));
  }

  // Create new request
  async createRequest(data: CreateRequestDto): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.CREATE, data);
  }

  // Update existing request (only drafts can be edited)
  async updateRequest(id: number, data: UpdateRequestDto): Promise<Request> {
    return await apiClient.put<Request>(API_ENDPOINTS.REQUESTS.DETAIL(id), data);
  }

  // Submit draft request (draft -> pending)
  async submitRequest(id: number): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.SUBMIT(id));
  }

  // Approve request
  async approveRequest(id: number, data?: ApproveRequestDto): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.APPROVE(id), data);
  }

  // Reject request
  async rejectRequest(id: number, data: RejectRequestDto): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.REJECT(id), data);
  }

  // Request revision
  async requestRevision(id: number, data: ReviseRequestDto): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.REVISE(id), data);
  }

  // Get request approval history
  async getRequestHistory(id: number): Promise<ApprovalHistory[]> {
    return await apiClient.get<ApprovalHistory[]>(API_ENDPOINTS.REQUESTS.HISTORY(id));
  }

  // Purchasing team actions
  async assignToPurchasing(id: number): Promise<Request> {
    return await apiClient.post<Request>(`${API_ENDPOINTS.REQUESTS.DETAIL(id)}assign-purchasing/`);
  }

  async markAsOrdered(id: number, notes?: string): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.MARK_PURCHASED(id), { notes });
  }

  async markAsDelivered(id: number, notes?: string): Promise<Request> {
    return await apiClient.post<Request>(API_ENDPOINTS.REQUESTS.MARK_DELIVERED(id), { notes });
  }

  async markAsCompleted(id: number): Promise<Request> {
    return await apiClient.post<Request>(`${API_ENDPOINTS.REQUESTS.DETAIL(id)}mark-completed/`);
  }

  // Delete request (only drafts)
  async deleteRequest(id: number): Promise<void> {
    return await apiClient.delete<void>(API_ENDPOINTS.REQUESTS.DETAIL(id));
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<RequestStats> {
    return await apiClient.get<RequestStats>(`${API_ENDPOINTS.REQUESTS.LIST}stats/`);
  }

  // Get subordinate dashboard stats (for supervisors)
  async getSubordinateStats(): Promise<RequestStats> {
    return await apiClient.get<RequestStats>(`${API_ENDPOINTS.REQUESTS.LIST}subordinate-stats/`);
  }

  // Get pending approvals for current user (supervisor)
  async getPendingApprovals(): Promise<Request[]> {
    return await apiClient.get<Request[]>(API_ENDPOINTS.REQUESTS.PENDING_APPROVALS);
  }

  // Get admin dashboard stats (using new core endpoint)
  async getAdminStats(): Promise<AdminStats> {
    return await apiClient.get<AdminStats>(API_ENDPOINTS.CORE.SYSTEM_STATS);
  }

  // Get quick overview stats
  async getQuickOverview() {
    return await apiClient.get(API_ENDPOINTS.CORE.QUICK_OVERVIEW);
  }

  // Get worksite breakdown
  async getWorksiteBreakdown() {
    return await apiClient.get(API_ENDPOINTS.CORE.WORKSITE_BREAKDOWN);
  }

  // Get division breakdown  
  async getDivisionBreakdown() {
    return await apiClient.get(API_ENDPOINTS.CORE.DIVISION_BREAKDOWN);
  }

  // Utility methods for request status and transitions
  getStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      pending: 'Pending Approval',
      in_review: 'Under Review',
      revision_requested: 'Revision Requested',
      approved: 'Final Approved - Ready for Purchase',
      rejected: 'Rejected',
      purchasing: 'Assigned to Purchasing Team',
      ordered: 'Order Placed',
      delivered: 'Delivered',
      completed: 'Request Completed',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: '#6c757d',      // gray
      pending: '#ffc107',    // yellow
      in_review: '#17a2b8',  // teal
      revision_requested: '#fd7e14', // orange
      approved: '#28a745',   // green
      rejected: '#dc3545',   // red
      purchasing: '#6f42c1', // purple
      ordered: '#20c997',    // teal-green
      delivered: '#007bff',  // blue
      completed: '#28a745',  // green
    };
    return colorMap[status] || '#6c757d';
  }

  canUserEdit(request: Request, currentUserId: number): boolean {
    return request.status === 'draft' && request.created_by === currentUserId;
  }

  canUserApprove(request: Request, currentUserId: number): boolean {
    return request.current_approver === currentUserId &&
      ['pending', 'in_review'].includes(request.status);
  }

  canUserDelete(request: Request, currentUserId: number): boolean {
    return request.status === 'draft' && request.created_by === currentUserId;
  }

  // Utility method to clean parameters for API calls
  private cleanParams(params?: RequestQueryParams): Record<string, string> | null {
    if (!params) return null;
    
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    });
    
    return Object.keys(cleanParams).length > 0 ? cleanParams : null;
  }
}

const requestService = new RequestService();
export default requestService;