/**
 * Unified API Client - POST-centric approach for maximum compatibility
 * Extends Enhanced HTTP Client with action-based request patterns
 */

import { EnhancedHttpClient, HttpRequestConfig, HttpResponse } from './enhanced-http-client.js';
import { Observable } from './observable.js';

export interface UnifiedRequest<T = any> {
  action: string;                    // 'GET_USERS', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER'
  data?: T;                         // Request payload
  filters?: Record<string, any>;    // Query/filter parameters
  options?: RequestOptions;         // Additional options
  metadata?: Record<string, any>;   // Custom metadata
}

export interface RequestOptions {
  includeMetadata?: boolean;
  pagination?: {
    page?: number;
    limit?: number;
    offset?: number;
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  timeout?: number;
  cache?: boolean;
  retries?: number;
}

export interface UnifiedResponse<T = any> {
  success: boolean;
  data: T;
  metadata?: {
    timestamp: string;
    action: string;
    pagination?: {
      total: number;
      page: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    performance?: {
      processingTime: number;
      cacheHit: boolean;
    };
  };
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

/**
 * Unified API Client - Everything via POST for maximum compatibility
 * No size limitations, firewall-friendly, consistent error handling
 */
export class UnifiedApiClient {
  constructor(
    private httpClient: EnhancedHttpClient,
    private baseEndpoint: string = '/api/unified'
  ) {}

  /**
   * Execute any action via POST
   * Handles GET, CREATE, UPDATE, DELETE operations with same interface
   */
  execute<TRequest = any, TResponse = any>(
    request: UnifiedRequest<TRequest>,
    config?: Partial<HttpRequestConfig>
  ): Observable<UnifiedResponse<TResponse>> {
    const requestBody = {
      ...request,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };

    const httpResponse = this.httpClient.post<UnifiedResponse<TResponse>>(
      this.baseEndpoint,
      requestBody,
      {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Type': 'unified-action',
          ...config?.headers
        }
      }
    );

    return new Observable<UnifiedResponse<TResponse>>((observer) => {
      httpResponse.subscribe({
        next: (response) => {
          // Transform the HTTP response to our unified format
          let unifiedResponse: UnifiedResponse<TResponse>;
          
          if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            unifiedResponse = response.data as UnifiedResponse<TResponse>;
          } else {
            // Fallback for non-unified responses
            unifiedResponse = {
              success: response.status >= 200 && response.status < 300,
              data: response.data,
              metadata: {
                timestamp: new Date().toISOString(),
                action: request.action,
                performance: {
                  processingTime: 0,
                  cacheHit: false
                }
              }
            };
          }
          
          observer.next(unifiedResponse);
        },
        error: (error) => observer.error(error),
        complete: () => observer.complete()
      });
    });
  }

  /**
   * Promise-based version
   */
  async executeAsync<TRequest = any, TResponse = any>(
    request: UnifiedRequest<TRequest>,
    config?: Partial<HttpRequestConfig>
  ): Promise<UnifiedResponse<TResponse>> {
    return new Promise((resolve, reject) => {
      this.execute<TRequest, TResponse>(request, config).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
        complete: () => {}
      });
    });
  }

  // Convenience methods that map to your action-based pattern

  /**
   * Fetch data (equivalent to GET but via POST)
   */
  fetch<T = any>(
    action: string,
    filters?: Record<string, any>,
    options?: RequestOptions
  ): Observable<UnifiedResponse<T>> {
    return this.execute<void, T>({
      action,
      filters,
      options
    });
  }

  /**
   * Create data (equivalent to POST)
   */
  create<T = any, R = any>(
    action: string,
    data: T,
    options?: RequestOptions
  ): Observable<UnifiedResponse<R>> {
    return this.execute<T, R>({
      action,
      data,
      options
    });
  }

  /**
   * Update data (equivalent to PUT)
   */
  update<T = any, R = any>(
    action: string,
    data: T,
    filters?: Record<string, any>,
    options?: RequestOptions
  ): Observable<UnifiedResponse<R>> {
    return this.execute<T, R>({
      action,
      data,
      filters,
      options
    });
  }

  /**
   * Remove data (equivalent to DELETE)
   */
  remove<T = any>(
    action: string,
    filters?: Record<string, any>,
    options?: RequestOptions
  ): Observable<UnifiedResponse<T>> {
    return this.execute<void, T>({
      action,
      filters,
      options
    });
  }

  /**
   * Batch operations - multiple actions in one request
   */
  batch<T = any>(
    requests: UnifiedRequest[],
    options?: RequestOptions
  ): Observable<UnifiedResponse<T[]>> {
    return this.execute<UnifiedRequest[], T[]>({
      action: 'BATCH_OPERATIONS',
      data: requests,
      options
    });
  }

  /**
   * Complex query with advanced filtering, sorting, pagination
   */
  query<T = any>(
    action: string,
    query: {
      filters?: Record<string, any>;
      search?: string;
      pagination?: RequestOptions['pagination'];
      sorting?: RequestOptions['sorting'];
      includes?: string[];
      excludes?: string[];
    },
    options?: RequestOptions
  ): Observable<UnifiedResponse<T[]>> {
    return this.execute<typeof query, T[]>({
      action,
      data: query,
      options
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add Observable pipe method for chaining
   */
  private pipe<T, R>(
    source: Observable<HttpResponse<T>>,
    transform: (response: HttpResponse<T>) => HttpResponse<R>
  ): Observable<HttpResponse<R>> {
    return new Observable<HttpResponse<R>>((observer) => {
      source.subscribe({
        next: (response) => {
          try {
            const transformed = transform(response);
            observer.next(transformed);
          } catch (error) {
            observer.error(error as Error);
          }
        },
        error: (error) => observer.error(error),
        complete: () => observer.complete()
      });
    });
  }
}

/**
 * Server Response Helper - What your server should return
 */
export class ServerResponseBuilder {
  static success<T>(data: T, metadata?: any): UnifiedResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        action: 'SUCCESS',
        ...metadata
      }
    };
  }

  static error(
    message: string,
    code?: string,
    field?: string
  ): UnifiedResponse<null> {
    return {
      success: false,
      data: null,
      errors: [{
        code: code || 'GENERAL_ERROR',
        message,
        field
      }],
      metadata: {
        timestamp: new Date().toISOString(),
        action: 'ERROR'
      }
    };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): UnifiedResponse<T[]> {
    const pages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        action: 'PAGINATED_SUCCESS',
        pagination: {
          total,
          page,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      }
    };
  }
}

// Factory for DI integration
export function createUnifiedApiClient(
  httpClient: EnhancedHttpClient,
  baseEndpoint?: string
): UnifiedApiClient {
  return new UnifiedApiClient(httpClient, baseEndpoint);
}