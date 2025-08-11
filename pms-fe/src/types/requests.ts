export type RequestStatus = 
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'purchasing'
  | 'ordered'
  | 'delivered'
  | 'completed';

export type RequestUnit = 
  | 'pieces'
  | 'kg'
  | 'ton'
  | 'meter'
  | 'm2'
  | 'm3'
  | 'liter';

export type ApprovalAction = 
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'revised'
  | 'final_approved'
  | 'assigned_purchasing'
  | 'ordered'
  | 'delivered'
  | 'completed';

export interface Request {
  id: number;
  request_number: string;
  item: string;
  description?: string;
  created_by: number;
  created_by_name: string;
  current_approver: number | null;
  final_approver: number | null;
  status: RequestStatus;
  quantity: string; // Decimal field comes as string
  unit: RequestUnit;
  category?: string;
  delivery_address?: string;
  reason?: string;
  revision_count: number;
  revision_notes?: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  
  // Computed fields
  can_edit?: boolean;
  can_approve?: boolean;
  can_reject?: boolean;
  can_revise?: boolean;
  next_approver?: string;
}

export interface CreateRequestData {
  item: string;
  description?: string;
  quantity: string;
  unit: RequestUnit;
  category?: string;
  delivery_address?: string;
  reason?: string;
}

export interface UpdateRequestData extends Partial<CreateRequestData> {
  id: number;
}

export interface ApprovalHistory {
  id: number;
  request: number;
  user: number;
  user_name: string;
  action: ApprovalAction;
  level: number;
  notes?: string;
  review_notes?: string;
  created_at: string;
}

export interface ApprovalActionRequest {
  action: 'approve' | 'reject' | 'revise';
  notes?: string;
  review_notes?: string;
}

export interface RequestsState {
  items: Request[];
  currentRequest: Request | null;
  approvalHistory: ApprovalHistory[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
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

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  draft: '#6B7280',
  pending: '#F59E0B',
  in_review: '#3B82F6',
  revision_requested: '#8B5CF6',
  approved: '#10B981',
  rejected: '#EF4444',
  purchasing: '#14B8A6',
  ordered: '#6366F1',
  delivered: '#059669',
  completed: '#22C55E',
};

export const UNIT_LABELS: Record<RequestUnit, string> = {
  pieces: 'Pieces',
  kg: 'Kilograms',
  ton: 'Tons',
  meter: 'Meters',
  m2: 'Square Meters',
  m3: 'Cubic Meters',
  liter: 'Liters',
};

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  revision_requested: 'Revision Requested',
  revised: 'Revised and Resubmitted',
  final_approved: 'Final Approval',
  assigned_purchasing: 'Assigned to Purchasing',
  ordered: 'Order Placed',
  delivered: 'Delivered',
  completed: 'Request Completed',
};

// Valid transitions based on backend state machine
export const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['pending'],
  pending: ['in_review', 'approved', 'rejected', 'revision_requested'],
  in_review: ['approved', 'rejected', 'revision_requested'],
  revision_requested: ['pending'],
  approved: ['purchasing', 'rejected'],
  purchasing: ['ordered', 'rejected', 'revision_requested'],
  ordered: ['delivered'],
  delivered: ['completed'],
  rejected: [],
  completed: [],
};