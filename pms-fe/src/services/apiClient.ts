import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '../constants/api';
import storage from '../utils/storage';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private readonly BASE_URL_STORAGE_KEY = '@pms_api_base_url';

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    void this.loadStoredBaseUrl();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await storage.getItem('@pms_access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await storage.getItem('@pms_refresh_token');
            if (refreshToken) {
              const response = await this.axiosInstance.post('/api/auth/refresh/', {
                refresh: refreshToken,
              });

              const { access } = response.data;
              await storage.setItem('@pms_access_token', access);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${access}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            await storage.removeItem('@pms_access_token');
            await storage.removeItem('@pms_refresh_token');
            await storage.removeItem('@pms_user');
            
            // You might want to emit an event here for logout
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async loadStoredBaseUrl(): Promise<void> {
    try {
      const storedBaseUrl = await storage.getItem(this.BASE_URL_STORAGE_KEY);
      if (storedBaseUrl) {
        console.log('🛰️ Loaded stored API base URL:', storedBaseUrl);
        this.applyBaseUrl(storedBaseUrl);
      } else {
        console.log('🛰️ Using default API base URL:', this.baseUrl);
      }
    } catch (error) {
      console.warn('Failed to load stored API base URL, using default.', error);
    }
  }

  private applyBaseUrl(url: string): void {
    this.baseUrl = url;
    this.axiosInstance.defaults.baseURL = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async getStoredBaseUrl(): Promise<string | null> {
    try {
      return await storage.getItem(this.BASE_URL_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read stored API base URL.', error);
      return null;
    }
  }

  public async setBaseUrl(url: string): Promise<void> {
    this.applyBaseUrl(url);
    try {
      await storage.setItem(this.BASE_URL_STORAGE_KEY, url);
      console.log('🛰️ Persisted API base URL override:', url);
    } catch (error) {
      console.warn('Failed to persist API base URL override.', error);
    }
  }

  public async resetBaseUrl(): Promise<void> {
    this.applyBaseUrl(API_CONFIG.BASE_URL);
    try {
      await storage.removeItem(this.BASE_URL_STORAGE_KEY);
      console.log('🛰️ Reset API base URL to default:', API_CONFIG.BASE_URL);
    } catch (error) {
      console.warn('Failed to clear stored API base URL override.', error);
    }
  }

  public async get<T>(url: string): Promise<T> {
    const response = await this.axiosInstance.get<T>(url);
    return response.data;
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data);
    return response.data;
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data);
    return response.data;
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url);
    return response.data;
  }
}

const apiClient = new ApiClient();
export default apiClient;
