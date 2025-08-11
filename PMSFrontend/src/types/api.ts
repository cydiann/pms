// Common API response structure
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

// Paginated API response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Error response
export interface ApiError {
  message: string;
  field?: string;
  code?: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  error: string | ApiError | ApiError[];
  status: 'error';
}

// Common query parameters
export interface QueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// Request filtering parameters
export interface RequestFilterParams extends QueryParams {
  status?: string;
  created_by?: number;
  worksite?: number;
  created_at_from?: string;
  created_at_to?: string;
}

// Network status
export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';