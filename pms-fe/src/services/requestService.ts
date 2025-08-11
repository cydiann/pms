import { apiService } from './api';
import { 
  Request, 
  CreateRequestData, 
  UpdateRequestData, 
  ApprovalHistory, 
  ApprovalActionRequest 
} from '@/types/requests';
import { PaginatedResponse, RequestFilterParams } from '@/types/api';
import { API_ENDPOINTS } from '@/constants/api';

export class RequestService {
  /**
   * Get paginated list of requests with optional filtering
   */
  async getRequests(params?: RequestFilterParams): Promise<PaginatedResponse<Request>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.created_by) queryParams.append('created_by', params.created_by.toString());
    if (params?.worksite) queryParams.append('worksite', params.worksite.toString());
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    if (params?.created_at_from) queryParams.append('created_at_from', params.created_at_from);
    if (params?.created_at_to) queryParams.append('created_at_to', params.created_at_to);

    const url = `${API_ENDPOINTS.REQUESTS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<Request>>(url);
  }

  /**
   * Get single request by ID
   */
  async getRequest(id: number): Promise<Request> {
    return apiService.get<Request>(API_ENDPOINTS.REQUESTS.DETAIL(id));
  }

  /**
   * Create new request
   */
  async createRequest(data: CreateRequestData): Promise<Request> {
    return apiService.post<Request>(API_ENDPOINTS.REQUESTS.CREATE, data);
  }

  /**
   * Update existing request (only in draft state)
   */
  async updateRequest(data: UpdateRequestData): Promise<Request> {
    return apiService.put<Request>(API_ENDPOINTS.REQUESTS.UPDATE(data.id), data);
  }

  /**
   * Delete request (only in draft state)
   */
  async deleteRequest(id: number): Promise<void> {
    return apiService.delete<void>(API_ENDPOINTS.REQUESTS.DELETE(id));
  }

  /**
   * Submit request for approval (transition from draft to pending)
   */
  async submitRequest(id: number): Promise<Request> {
    return apiService.post<Request>(API_ENDPOINTS.REQUESTS.DETAIL(id) + 'submit/', {});
  }

  /**
   * Approve request (supervisor action)
   */
  async approveRequest(id: number, notes?: string): Promise<{ message: string }> {
    return apiService.post(API_ENDPOINTS.REQUESTS.APPROVE(id), { notes });
  }

  /**
   * Reject request (supervisor action)
   */
  async rejectRequest(id: number, notes: string): Promise<{ message: string }> {
    return apiService.post(API_ENDPOINTS.REQUESTS.REJECT(id), { notes });
  }

  /**
   * Request revision (supervisor action)
   */
  async requestRevision(id: number, notes: string, review_notes?: string): Promise<{ message: string }> {
    return apiService.post(API_ENDPOINTS.REQUESTS.REVISE(id), { 
      notes, 
      review_notes 
    });
  }

  /**
   * Get approval history for request
   */
  async getApprovalHistory(id: number): Promise<ApprovalHistory[]> {
    return apiService.get<ApprovalHistory[]>(API_ENDPOINTS.REQUESTS.HISTORY(id));
  }

  /**
   * Perform approval action (generic method)
   */
  async performApprovalAction(
    requestId: number, 
    action: ApprovalActionRequest
  ): Promise<{ message: string }> {
    switch (action.action) {
      case 'approve':
        return this.approveRequest(requestId, action.notes);
      
      case 'reject':
        if (!action.notes) {
          throw new Error('Notes are required for rejection');
        }
        return this.rejectRequest(requestId, action.notes);
      
      case 'revise':
        if (!action.notes) {
          throw new Error('Notes are required for revision request');
        }
        return this.requestRevision(requestId, action.notes, action.review_notes);
      
      default:
        throw new Error(`Unknown action: ${action.action}`);
    }
  }

  /**
   * Get requests pending approval for current user (supervisor feature)
   */
  async getPendingApprovals(): Promise<Request[]> {
    const response = await this.getRequests({ 
      status: 'pending,in_review',
      ordering: '-created_at' 
    });
    return response.results;
  }

  /**
   * Get user's own requests
   */
  async getMyRequests(params?: RequestFilterParams): Promise<PaginatedResponse<Request>> {
    return this.getRequests({
      ...params,
      ordering: params?.ordering || '-created_at'
    });
  }

  /**
   * Get requests by status
   */
  async getRequestsByStatus(status: string, params?: RequestFilterParams): Promise<Request[]> {
    const response = await this.getRequests({
      ...params,
      status,
      ordering: '-created_at'
    });
    return response.results;
  }

  /**
   * Search requests by item name or description
   */
  async searchRequests(query: string, params?: RequestFilterParams): Promise<Request[]> {
    const response = await this.getRequests({
      ...params,
      search: query,
      ordering: '-created_at'
    });
    return response.results;
  }

  /**
   * Get team requests for supervisor (Phase 3)
   */
  async getTeamRequests(params?: RequestFilterParams): Promise<PaginatedResponse<Request>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    if (params?.created_at_from) queryParams.append('created_at_from', params.created_at_from);
    if (params?.created_at_to) queryParams.append('created_at_to', params.created_at_to);

    const url = `${API_ENDPOINTS.REQUESTS.TEAM}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<Request>>(url);
  }

  /**
   * Perform bulk approval action (Phase 3)
   */
  async performBulkApproval(
    requestIds: number[], 
    action: { action: 'approve' | 'reject' | 'revise'; notes?: string; }
  ): Promise<{ message: string; processed: number; }> {
    return apiService.post(API_ENDPOINTS.REQUESTS.BULK_APPROVAL, {
      request_ids: requestIds,
      action: action.action,
      notes: action.notes
    });
  }

  /**
   * Get purchasing queue (Phase 3)
   */
  async getPurchasingQueue(params?: RequestFilterParams): Promise<PaginatedResponse<Request>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.ordering) queryParams.append('ordering', params.ordering);

    const url = `${API_ENDPOINTS.REQUESTS.PURCHASING_QUEUE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<PaginatedResponse<Request>>(url);
  }

  /**
   * Update purchasing status (Phase 3)
   */
  async updatePurchasingStatus(
    requestId: number,
    data: { status: 'purchasing' | 'ordered' | 'delivered'; notes?: string; }
  ): Promise<Request> {
    return apiService.post<Request>(API_ENDPOINTS.REQUESTS.UPDATE_PURCHASING_STATUS(requestId), data);
  }

  /**
   * Mark request as completed (final step)
   */
  async markRequestCompleted(requestId: number, notes?: string): Promise<Request> {
    return apiService.post<Request>(API_ENDPOINTS.REQUESTS.MARK_COMPLETED(requestId), { notes });
  }
}

export const requestService = new RequestService();