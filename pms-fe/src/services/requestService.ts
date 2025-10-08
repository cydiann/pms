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
  DashboardStats,
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

  // Get team requests (for supervisors) - filters subordinates' requests
  async getTeamRequests(status?: string): Promise<Request[]> {
    const params = status ? { status } : {};
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const url = `/api/requests/my-team-requests/${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Request>>(url);
    return response.results || [];
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
    return await apiClient.patch<Request>(API_ENDPOINTS.REQUESTS.DETAIL(id), data);
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

  // Get dashboard statistics - matches backend dashboard-stats endpoint
  async getDashboardStats(): Promise<DashboardStats> {
    return await apiClient.get<DashboardStats>('/api/requests/dashboard-stats/');
  }

  // Get pending approvals for current user (supervisor)
  async getPendingApprovals(): Promise<Request[]> {
    return await apiClient.get<Request[]>(API_ENDPOINTS.REQUESTS.PENDING_APPROVALS);
  }

  // Get requests approved by current user (supervisor)
  async getApprovedRequests(): Promise<Request[]> {
    const response = await apiClient.get<PaginatedResponse<Request>>('/api/requests/my-approved-requests/');
    return response.results || [];
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
  // Note: These methods are kept for backward compatibility
  // Use constants from '@/constants/requests' for new code
  getStatusDisplay(status: string): string {
    // Import from constants for consistency
    const { STATUS_LABELS } = require('../constants/requests');
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  getStatusColor(status: string): string {
    // Import from constants for consistency
    const { STATUS_COLORS } = require('../constants/requests');
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6c757d';
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