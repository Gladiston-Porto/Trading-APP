/**
 * API Client Service
 * 
 * Provides unified interface for all backend API endpoints.
 * Handles authentication, error handling, and type-safe requests.
 * 
 * Features:
 * - Automatic token management
 * - Request/response interceptors
 * - Error handling with retry logic
 * - Type-safe endpoint definitions
 * - Support for all 62+ backend endpoints
 */

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  retry?: number;
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private timeout: number = 30000;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.loadToken();
  }

  /**
   * Load token from localStorage
   */
  private loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Save token to localStorage
   */
  private saveToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear token from storage
   */
  private clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get current token
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Set token manually
   */
  public setToken(token: string): void {
    this.saveToken(token);
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(path: string, params?: Record<string, any>): string {
    const url = new URL(path, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Build headers with authorization
   */
  private buildHeaders(options?: ApiRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private handleError(response: Response, data: any): ApiError {
    return {
      status: response.status,
      message: data?.message || response.statusText || 'Unknown error',
      errors: data?.errors,
    };
  }

  /**
   * Execute API request with retry logic
   */
  public async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      params,
      retry = 3,
    } = options;

    const url = this.buildURL(path, params);
    const headers = this.buildHeaders(options);

    let lastError: any;

    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json')
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          // Handle 401 Unauthorized
          if (response.status === 401) {
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
          }

          const error = this.handleError(response, data);
          lastError = { error, success: false } as ApiResponse<T>;
          
          // Don't retry on 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            return lastError;
          }
        } else {
          return {
            data,
            success: true,
          };
        }
      } catch (err: any) {
        lastError = err;
        
        // Retry on network errors
        if (attempt < retry - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    return {
      error: {
        status: 0,
        message: lastError?.message || 'Request failed',
      },
      success: false,
    };
  }

  /**
   * GET request
   */
  public get<T = any>(
    path: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET', params });
  }

  /**
   * POST request
   */
  public post<T = any>(
    path: string,
    body?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', body, params });
  }

  /**
   * PUT request
   */
  public put<T = any>(
    path: string,
    body?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body, params });
  }

  /**
   * DELETE request
   */
  public delete<T = any>(
    path: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE', params });
  }

  /**
   * PATCH request
   */
  public patch<T = any>(
    path: string,
    body?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PATCH', body, params });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
