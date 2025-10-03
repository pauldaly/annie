/**
 * Enhanced HTTP Client with Interceptors, Observables, and Advanced Features
 * Builds upon the existing ApiClient while providing modern HTTP capabilities
 */

import { Observable } from './observable.js';
import { ILogger } from './logger.js';
import { ServiceContainer } from './di-container.js';

// Enhanced HTTP Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpHeaders {
  [key: string]: string;
}

export interface HttpParams {
  [key: string]: string | number | boolean | Array<string | number | boolean>;
}

export interface HttpRequestConfig {
  url: string;
  method?: HttpMethod;
  headers?: HttpHeaders;
  params?: HttpParams;
  body?: any;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  withCredentials?: boolean;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTimeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: HttpHeaders;
  config: HttpRequestConfig;
  request?: XMLHttpRequest;
}

export interface HttpError extends Error {
  config?: HttpRequestConfig;
  request?: XMLHttpRequest;
  response?: HttpResponse;
  isHttpError: true;
  status?: number;
}

// Interceptor Interfaces
export interface HttpRequestInterceptor {
  use(
    onFulfilled: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>,
    onRejected?: (error: any) => any
  ): number;
  eject(id: number): void;
}

export interface HttpResponseInterceptor {
  use(
    onFulfilled: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>,
    onRejected?: (error: HttpError) => any
  ): number;
  eject(id: number): void;
}

// Cache Interface
export interface HttpCache {
  get(key: string): HttpResponse | null;
  set(key: string, response: HttpResponse, timeout?: number): void;
  delete(key: string): void;
  clear(): void;
}

// Default HTTP Cache Implementation
export class MemoryHttpCache implements HttpCache {
  private cache = new Map<string, { response: HttpResponse; expires: number }>();

  get(key: string): HttpResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.response;
  }

  set(key: string, response: HttpResponse, timeout = 300000): void { // 5 min default
    this.cache.set(key, {
      response,
      expires: Date.now() + timeout
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Interceptor Implementations
class RequestInterceptorManager implements HttpRequestInterceptor {
  private interceptors: Array<{
    fulfilled: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
    rejected?: (error: any) => any;
  } | null> = [];

  use(
    onFulfilled: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>,
    onRejected?: (error: any) => any
  ): number {
    this.interceptors.push({ fulfilled: onFulfilled, rejected: onRejected });
    return this.interceptors.length - 1;
  }

  eject(id: number): void {
    if (this.interceptors[id]) {
      this.interceptors[id] = null;
    }
  }

  async runInterceptors(config: HttpRequestConfig): Promise<HttpRequestConfig> {
    let processedConfig = config;
    
    for (const interceptor of this.interceptors) {
      if (interceptor) {
        try {
          processedConfig = await Promise.resolve(interceptor.fulfilled(processedConfig));
        } catch (error) {
          if (interceptor.rejected) {
            await Promise.resolve(interceptor.rejected(error));
          } else {
            throw error;
          }
        }
      }
    }
    
    return processedConfig;
  }
}

class ResponseInterceptorManager implements HttpResponseInterceptor {
  private interceptors: Array<{
    fulfilled: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
    rejected?: (error: HttpError) => any;
  } | null> = [];

  use(
    onFulfilled: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>,
    onRejected?: (error: HttpError) => any
  ): number {
    this.interceptors.push({ fulfilled: onFulfilled, rejected: onRejected });
    return this.interceptors.length - 1;
  }

  eject(id: number): void {
    if (this.interceptors[id]) {
      this.interceptors[id] = null;
    }
  }

  async runInterceptors(response: HttpResponse): Promise<HttpResponse> {
    let processedResponse = response;
    
    for (const interceptor of this.interceptors) {
      if (interceptor) {
        try {
          processedResponse = await Promise.resolve(interceptor.fulfilled(processedResponse));
        } catch (error) {
          if (interceptor.rejected) {
            await Promise.resolve(interceptor.rejected(error as HttpError));
          } else {
            throw error;
          }
        }
      }
    }
    
    return processedResponse;
  }

  async runErrorInterceptors(error: HttpError): Promise<HttpError> {
    for (const interceptor of this.interceptors) {
      if (interceptor?.rejected) {
        try {
          const result = await Promise.resolve(interceptor.rejected(error));
          if (result !== undefined) {
            return result;
          }
        } catch (interceptorError) {
          error = interceptorError as HttpError;
        }
      }
    }
    
    return error;
  }
}

// Enhanced HTTP Client
export class EnhancedHttpClient {
  private logger: ILogger;
  private cache: HttpCache;
  private baseConfig: Partial<HttpRequestConfig>;
  public interceptors: {
    request: HttpRequestInterceptor;
    response: HttpResponseInterceptor;
  };

  constructor(
    baseConfig: Partial<HttpRequestConfig> = {},
    logger?: ILogger,
    cache?: HttpCache
  ) {
    this.baseConfig = baseConfig;
    this.logger = logger || {
      debug: (message: any) => console.log(`[DEBUG] ${message}`),
      info: (message: any) => console.log(`[INFO] ${message}`),
      warn: (message: any) => console.warn(`[WARN] ${message}`),
      error: (message: any) => console.error(`[ERROR] ${message}`),
      fatal: (message: any) => console.error(`[FATAL] ${message}`),
      getLevel: () => 'info',
      setLevel: () => {},
      getConfig: () => ({
        priority: true,
        log: true,
        info: true,
        warning: true,
        debug: true,
        error: true,
        verbose: true,
        separator: true,
        console: true,
        lastmethod: "",
      })
    };
    this.cache = cache || new MemoryHttpCache();
    
    this.interceptors = {
      request: new RequestInterceptorManager(),
      response: new ResponseInterceptorManager()
    };

    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors(): void {
    // Default request interceptor - logging
    this.interceptors.request.use(
      (config) => {
        this.logger.debug?.(`HTTP ${config.method || 'GET'} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error?.(`Request interceptor error: ${error}`);
        return Promise.reject(error);
      }
    );

    // Default response interceptor - logging
    this.interceptors.response.use(
      (response) => {
        this.logger.debug?.(`HTTP ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error?.(`HTTP Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  // Main request method returning Observable
  request<T = any>(config: HttpRequestConfig): Observable<HttpResponse<T>> {
    return new Observable<HttpResponse<T>>((observer) => {
      this.executeRequest<T>(config)
        .then((response) => {
          observer.next(response);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  // Promise-based request method
  async requestAsync<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(config);
  }

  private async executeRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // Merge with base config
    const mergedConfig: HttpRequestConfig = {
      method: 'GET',
      headers: { ...this.baseConfig.headers, ...config.headers },
      timeout: 30000,
      responseType: 'json',
      withCredentials: false,
      retries: 0,
      retryDelay: 1000,
      cache: false,
      cacheTimeout: 300000,
      ...this.baseConfig,
      ...config
    };
    // Re-merge headers to ensure they're properly combined
    mergedConfig.headers = { ...this.baseConfig.headers, ...config.headers };

    // Check cache first
    const cacheKey = this.getCacheKey(mergedConfig);
    if (mergedConfig.cache && mergedConfig.method === 'GET') {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug?.(`Cache hit for ${mergedConfig.url}`);
        return cachedResponse as HttpResponse<T>;
      }
    }

    // Run request interceptors
    const processedConfig = await (this.interceptors.request as RequestInterceptorManager)
      .runInterceptors(mergedConfig);

    // Execute request with retries
    let lastError: HttpError;
    const maxAttempts = (processedConfig.retries || 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        this.logger.debug?.(`Retry attempt ${attempt}/${maxAttempts - 1} for ${processedConfig.url}`);
        await this.delay(processedConfig.retryDelay || 1000);
      }

      try {
        const response = await this.executeXHR<T>(processedConfig);
        
        // Cache successful GET responses
        if (processedConfig.cache && processedConfig.method === 'GET' && response.status >= 200 && response.status < 300) {
          this.cache.set(cacheKey, response, processedConfig.cacheTimeout);
        }

        // Run response interceptors
        return await (this.interceptors.response as ResponseInterceptorManager)
          .runInterceptors(response) as HttpResponse<T>;

      } catch (error) {
        lastError = error as HttpError;
        
        // Don't retry on certain status codes
        if (lastError.status && (lastError.status < 500 || lastError.status === 501)) {
          break;
        }
      }
    }

    // Run error interceptors
    const processedError = await (this.interceptors.response as ResponseInterceptorManager)
      .runErrorInterceptors(lastError!);
    
    throw processedError;
  }

  private executeXHR<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this.buildUrl(config.url, config.params);

      xhr.open(config.method || 'GET', url, true);

      // Set headers
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      // Set other properties
      xhr.timeout = config.timeout || 30000;
      xhr.withCredentials = config.withCredentials || false;

      // Set response type
      if (config.responseType && config.responseType !== 'json') {
        xhr.responseType = config.responseType as XMLHttpRequestResponseType;
      }

      xhr.onload = () => {
        const response = this.createResponse<T>(xhr, config);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response);
        } else {
          const error = this.createError('Request failed', config, xhr, response);
          reject(error);
        }
      };

      xhr.onerror = () => {
        const error = this.createError('Network Error', config, xhr);
        reject(error);
      };

      xhr.ontimeout = () => {
        const error = this.createError('Request Timeout', config, xhr);
        reject(error);
      };

      xhr.onabort = () => {
        const error = this.createError('Request Aborted', config, xhr);
        reject(error);
      };

      // Send request
      const body = this.prepareRequestBody(config);
      xhr.send(body);
    });
  }

  private createResponse<T>(xhr: XMLHttpRequest, config: HttpRequestConfig): HttpResponse<T> {
    let data: T;
    
    if (config.responseType === 'json' || !config.responseType) {
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = xhr.responseText as any;
      }
    } else {
      data = xhr.response;
    }

    return {
      data,
      status: xhr.status,
      statusText: xhr.statusText,
      headers: this.parseHeaders(xhr.getAllResponseHeaders()),
      config,
      request: xhr
    };
  }

  private createError(
    message: string,
    config: HttpRequestConfig,
    request?: XMLHttpRequest,
    response?: HttpResponse
  ): HttpError {
    const error = new Error(message) as HttpError;
    error.isHttpError = true;
    error.config = config;
    error.request = request;
    error.response = response;
    error.status = request?.status;
    return error;
  }

  private buildUrl(url: string, params?: HttpParams): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const urlObj = new URL(url, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => urlObj.searchParams.append(key, String(v)));
      } else {
        urlObj.searchParams.set(key, String(value));
      }
    });

    return urlObj.toString();
  }

  private prepareRequestBody(config: HttpRequestConfig): any {
    if (!config.body) return null;

    // If Content-Type is set to application/json, stringify the body
    const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type'];
    
    if (contentType?.includes('application/json') && typeof config.body !== 'string') {
      return JSON.stringify(config.body);
    }

    return config.body;
  }

  private parseHeaders(headerString: string): HttpHeaders {
    const headers: HttpHeaders = {};
    
    if (!headerString) return headers;
    
    headerString.split('\r\n').forEach(line => {
      const parts = line.split(': ');
      if (parts.length === 2) {
        headers[parts[0].toLowerCase()] = parts[1];
      }
    });
    
    return headers;
  }

  private getCacheKey(config: HttpRequestConfig): string {
    const { method, url, params } = config;
    return `${method}:${url}:${JSON.stringify(params || {})}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  get<T = any>(url: string, config?: Partial<HttpRequestConfig>): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  post<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Observable<HttpResponse<T>> {
    return this.request<T>({ 
      ...config, 
      url, 
      method: 'POST', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }

  put<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Observable<HttpResponse<T>> {
    return this.request<T>({ 
      ...config, 
      url, 
      method: 'PUT', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }

  delete<T = any>(url: string, config?: Partial<HttpRequestConfig>): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  patch<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Observable<HttpResponse<T>> {
    return this.request<T>({ 
      ...config, 
      url, 
      method: 'PATCH', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }

  // Async versions
  async getAsync<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.requestAsync<T>({ ...config, url, method: 'GET' });
  }

  async postAsync<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.requestAsync<T>({ 
      ...config, 
      url, 
      method: 'POST', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }

  async putAsync<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.requestAsync<T>({ 
      ...config, 
      url, 
      method: 'PUT', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }

  async deleteAsync<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.requestAsync<T>({ ...config, url, method: 'DELETE' });
  }

  async patchAsync<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.requestAsync<T>({ 
      ...config, 
      url, 
      method: 'PATCH', 
      body: data,
      headers: { 'Content-Type': 'application/json', ...config?.headers }
    });
  }
}

// Factory function for DI integration
export function createEnhancedHttpClient(
  container?: ServiceContainer,
  baseConfig?: Partial<HttpRequestConfig>
): EnhancedHttpClient {
  const logger = container?.tryResolve<ILogger>('logger') || undefined;
  const cache = container?.tryResolve<HttpCache>('httpCache') || new MemoryHttpCache();
  
  return new EnhancedHttpClient(baseConfig, logger, cache);
}

// Built-in interceptors for common use cases
export namespace HttpInterceptors {
  // Authentication interceptor
  export function auth(tokenProvider: () => string | null) {
    return {
      request: (config: HttpRequestConfig) => {
        const token = tokenProvider();
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          };
        }
        return config;
      }
    };
  }

  // Loading state interceptor
  export function loading(
    onLoadingChange: (loading: boolean) => void,
    activeRequests = { count: 0 }
  ) {
    return {
      request: (config: HttpRequestConfig) => {
        activeRequests.count++;
        onLoadingChange(true);
        return config;
      },
      response: (response: HttpResponse) => {
        activeRequests.count--;
        if (activeRequests.count === 0) {
          onLoadingChange(false);
        }
        return response;
      },
      error: (error: HttpError) => {
        activeRequests.count--;
        if (activeRequests.count === 0) {
          onLoadingChange(false);
        }
        return Promise.reject(error);
      }
    };
  }

  // Retry interceptor with exponential backoff
  export function retryWithBackoff(
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000
  ) {
    return {
      error: (error: HttpError) => {
        const config = error.config;
        if (!config || !config.retries || config.retries >= maxRetries) {
          return Promise.reject(error);
        }

        const delay = Math.min(baseDelay * Math.pow(2, config.retries), maxDelay);
        config.retries++;
        
        return new Promise(resolve => {
          setTimeout(() => resolve(config), delay);
        });
      }
    };
  }

  // Response transformation interceptor
  export function transformResponse<T, R>(
    transformer: (data: T) => R,
    condition?: (response: HttpResponse<T>) => boolean
  ) {
    return {
      response: (response: HttpResponse<T>): HttpResponse<R> => {
        if (!condition || condition(response)) {
          return {
            ...response,
            data: transformer(response.data)
          };
        }
        return response as any;
      }
    };
  }
}