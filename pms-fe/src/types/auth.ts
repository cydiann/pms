export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  worksite: number | null;
  supervisor: number | null;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  clearError: () => void;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface PasswordResetRequest {
  username: string;
}

export interface PasswordResetResponse {
  message: string;
  success: boolean;
}