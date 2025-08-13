// Generic API Response formats
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Paginated API Response (for list endpoints)
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Error Response
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
}

// Common query parameters for list endpoints
export interface ListQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// Request specific query parameters
export interface RequestQueryParams extends ListQueryParams {
  status?: string;
  created_by?: number;
  current_approver?: number;
  category?: string;
  created_at_after?: string;
  created_at_before?: string;
}

// User specific query parameters
export interface UserQueryParams extends ListQueryParams {
  is_active?: boolean;
  is_superuser?: boolean;
  worksite?: number;
  supervisor?: number;
  groups?: number;
}

// Common response status types
export type ApiStatus = 'success' | 'error' | 'loading';

// File upload response
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

// Bulk operation response
export interface BulkOperationResponse {
  success_count: number;
  error_count: number;
  errors: Array<{
    index: number;
    errors: Record<string, string[]>;
  }>;
}

// Statistics response format
export interface StatsResponse<T> {
  stats: T;
  generated_at: string;
  cache_duration?: number;
}