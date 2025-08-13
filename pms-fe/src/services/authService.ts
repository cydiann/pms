import apiClient from './apiClient';
import storage from '../utils/storage';
import { API_ENDPOINTS } from '../constants/api';
import {
  LoginRequest,
  LoginResponse,
  User,
  TokenPair,
  PasswordResetRequest,
  PasswordResetResponse,
} from '../types/auth';

class AuthService {
  // Storage keys
  private readonly ACCESS_TOKEN_KEY = '@pms_access_token';
  private readonly REFRESH_TOKEN_KEY = '@pms_refresh_token';
  private readonly USER_KEY = '@pms_user';

  async login(credentials: LoginRequest): Promise<{ user: User; tokens: TokenPair }> {
    try {
      // Call login endpoint
      const loginResponse = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      const tokens: TokenPair = {
        access: loginResponse.access,
        refresh: loginResponse.refresh,
      };

      // Store tokens
      await this.storeTokens(tokens);

      // Get user data
      const user = await this.getCurrentUser();

      // Store user data
      await storage.setItem(this.USER_KEY, JSON.stringify(user));

      return { user, tokens };
    } catch (error: any) {
      // Handle different error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear stored data
      await Promise.all([
        storage.removeItem(this.ACCESS_TOKEN_KEY),
        storage.removeItem(this.REFRESH_TOKEN_KEY),
        storage.removeItem(this.USER_KEY),
      ]);
    } catch (error) {
      console.warn('Error during logout:', error);
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await storage.getItem(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return false;
      }

      const response = await apiClient.post<{ access: string }>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refresh: refreshToken }
      );

      await storage.setItem(this.ACCESS_TOKEN_KEY, response.access);
      return true;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User> {
    return await apiClient.get<User>(API_ENDPOINTS.AUTH.USER_ME);
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await storage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.warn('Error getting stored user:', error);
      return null;
    }
  }

  async getStoredTokens(): Promise<TokenPair | null> {
    try {
      const [access, refresh] = await Promise.all([
        storage.getItem(this.ACCESS_TOKEN_KEY),
        storage.getItem(this.REFRESH_TOKEN_KEY),
      ]);

      if (access && refresh) {
        return { access, refresh };
      }
      return null;
    } catch (error) {
      console.warn('Error getting stored tokens:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) {
        return false;
      }

      // Check if access token is valid by calling me endpoint
      try {
        await this.getCurrentUser();
        return true;
      } catch (error) {
        // Try to refresh token
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          try {
            await this.getCurrentUser();
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
    } catch (error) {
      console.warn('Error checking authentication:', error);
      return false;
    }
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResponse> {
    try {
      return await apiClient.post<PasswordResetResponse>(
        API_ENDPOINTS.AUTH.PASSWORD_RESET,
        request
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Username not found');
      } else {
        throw new Error('Failed to request password reset');
      }
    }
  }

  private async storeTokens(tokens: TokenPair): Promise<void> {
    await Promise.all([
      storage.setItem(this.ACCESS_TOKEN_KEY, tokens.access),
      storage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh),
    ]);
  }
}

const authService = new AuthService();
export default authService;