import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '@/types/auth';
import { ApiError, ApiErrorResponse } from '@/types/api';
import { API_CONFIG, STORAGE_KEYS, HTTP_STATUS } from '@/constants/api';

// Custom error class for API errors
export class ApiException extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const tokens = await this.getStoredTokens();
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh and error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle token refresh
        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const tokens = await this.getStoredTokens();
            if (tokens?.refresh) {
              const newTokens = await this.refreshToken(tokens.refresh);
              await this.storeTokens(newTokens);
              
              this.processQueue(null, newTokens.access);
              
              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
              }
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            await this.clearTokens();
            // Dispatch logout action or navigate to login
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Transform error to our custom format
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private transformError(error: AxiosError): ApiException {
    const response = error.response;
    const status = response?.status || 0;
    const data = response?.data;

    let message = 'An unexpected error occurred';

    if (status === HTTP_STATUS.UNAUTHORIZED) {
      message = 'Authentication required';
    } else if (status === HTTP_STATUS.FORBIDDEN) {
      message = 'Access denied';
    } else if (status === HTTP_STATUS.NOT_FOUND) {
      message = 'Resource not found';
    } else if (status >= 500) {
      message = 'Server error occurred';
    } else if (data) {
      // Extract error message from response data
      if (typeof data === 'string') {
        message = data;
      } else if (data.error) {
        message = typeof data.error === 'string' ? data.error : data.error.message || message;
      } else if (data.message) {
        message = data.message;
      } else if (data.detail) {
        message = data.detail;
      }
    }

    return new ApiException(message, status, data);
  }

  private async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const tokensString = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      return tokensString ? JSON.parse(tokensString) : null;
    } catch {
      return null;
    }
  }

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
  }

  private async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKENS,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  private async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    });
    return response.data;
  }

  // Generic request methods with retry logic
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }

  // Auth methods
  async login(username: string, password: string): Promise<AuthTokens> {
    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/login/`, {
        username,
        password,
      });
      const tokens = response.data;
      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      throw this.transformError(error as AxiosError);
    }
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getStoredTokens();
    return tokens !== null;
  }

  // Get stored tokens for external use
  async getTokens(): Promise<AuthTokens | null> {
    return this.getStoredTokens();
  }
}

export const apiService = new ApiService();