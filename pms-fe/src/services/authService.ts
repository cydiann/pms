import { apiService } from './api';
import { User, AuthTokens, LoginRequest, PasswordResetRequest } from '@/types/auth';
import { API_ENDPOINTS } from '@/constants/api';

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    return apiService.login(credentials.username, credentials.password);
  }

  /**
   * Logout current user and clear stored tokens
   */
  async logout(): Promise<void> {
    return apiService.logout();
  }

  /**
   * Get current authenticated user's profile
   */
  async getCurrentUser(): Promise<User> {
    return apiService.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return apiService.isAuthenticated();
  }

  /**
   * Get stored authentication tokens
   */
  async getTokens(): Promise<AuthTokens | null> {
    return apiService.getTokens();
  }

  /**
   * Request password reset (supervisor approval required)
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    return apiService.post(API_ENDPOINTS.AUTH.PASSWORD_RESET, data);
  }

  /**
   * Admin feature: View app as specific user
   */
  async viewAsUser(userId: number): Promise<{
    user: User;
    permissions: string[];
    accessible_requests: any[];
  }> {
    return apiService.get(API_ENDPOINTS.AUTH.VIEW_AS(userId));
  }

  /**
   * Refresh JWT tokens
   */
  async refreshTokens(): Promise<AuthTokens> {
    const tokens = await this.getTokens();
    if (!tokens?.refresh) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<AuthTokens>(API_ENDPOINTS.AUTH.REFRESH, {
      refresh: tokens.refresh,
    });

    return response;
  }
}

export const authService = new AuthService();