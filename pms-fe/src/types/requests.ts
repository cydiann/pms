// Request Status Enum - matches Django backend choices exactly
export enum RequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  REVISION_REQUESTED = 'revision_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PURCHASING = 'purchasing',
  ORDERED = 'ordered',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

// Unit choices from Django model
export enum RequestUnit {
  PIECES = 'pieces',
  KG = 'kg',
  TON = 'ton',
  METER = 'meter',
  M2 = 'm2',
  M3 = 'm3',
  LITER = 'liter',
}

// Main Request Interface - matches Django Request model exactly
export interface Request {
  id: number;
  request_number: string;
  item: string;
  description: string;
  created_by: number;
  created_by_name: string; // from serializer
  current_approver?: number;
  final_approver?: number;
  status: RequestStatus;
  status_display: string; // from serializer
  quantity: string; // DecimalField as string
  unit: RequestUnit;
  unit_display: string; // from serializer
  category: string;
  delivery_address: string;
  reason: string;
  
  // Revision tracking
  revision_count: number;
  revision_notes: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

// Request Creation DTO - matches RequestCreateSerializer
export interface CreateRequestDto {
  item: string;
  description: string;
  quantity: string;
  unit: RequestUnit;
  category: string;
  delivery_address: string;
  reason: string;
}

// Request Update DTO - matches RequestUpdateSerializer
export interface UpdateRequestDto {
  item?: string;
  description?: string;
  quantity?: string;
  unit?: RequestUnit;
  category?: string;
  delivery_address?: string;
  reason?: string;
  status?: RequestStatus;
}

// Request Action DTOs
export interface ApproveRequestDto {
  notes?: string;
}

export interface RejectRequestDto {
  reason: string;
  notes?: string;
}

export interface ReviseRequestDto {
  reason: string;
  upper_management_notes?: string;
}

// Approval History - matches ApprovalHistory model
export interface ApprovalHistory {
  id: number;
  request: number;
  request_number: string; // from serializer
  user: number;
  user_name: string; // from serializer
  action: 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'revised' | 'final_approved' | 'assigned_purchasing' | 'ordered' | 'delivered' | 'completed';
  level: number;
  notes: string;
  review_notes: string;
  created_at: string;
}

// Request Revision - matches RequestRevision model
export interface RequestRevision {
  id: number;
  request: number;
  revision_number: number;
  requested_by: number;
  reason: string;
  upper_management_notes: string;
  revised_by?: number;
  created_at: string;
  revised_at?: string;
}

// Request Filters
export interface RequestFilters {
  status?: RequestStatus[];
  category?: string[];
  created_by?: number[];
  current_approver?: number[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Request List Item for display
export interface RequestListItem {
  id: number;
  request_number: string;
  item: string;
  status: RequestStatus;
  status_display: string;
  quantity: string;
  unit_display: string;
  category: string;
  created_by_name: string;
  created_at: string;
}

// Dashboard Statistics
export interface RequestStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  draft_requests: number;
  completed_requests: number;
  requests_by_status: Record<RequestStatus, number>;
  requests_by_category: Record<string, number>;
  average_processing_time: number; // in days
  monthly_request_count: number;
}

// Supervision specific stats (for users who supervise others)
export interface SupervisionStats {
  subordinate_total_requests: number;
  subordinate_pending_approvals: number;
  subordinate_count: number;
  average_approval_time: number;
}

// Admin specific stats
export interface AdminStats extends RequestStats {
  all_pending_approvals: number;
  total_users: number;
  active_users: number;
  total_worksites: number;
  total_divisions: number;
  system_wide_stats: RequestStats;
}