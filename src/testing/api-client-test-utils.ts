/**
 * API Client Test Utilities
 * Provides testing helpers for Annie's ApiClient
 */

export interface MockResponse {
  status: number;
  statusText: string;
  data: any;
  headers?: Record<string, string>;
}

export interface ApiCallRecord {
  url: string;
  method: string;
  data?: any;
  timestamp: number;
}

export class ApiClientTestUtils {
  private originalFetch: typeof fetch;
  private mockResponseMap: Map<string, MockResponse> = new Map();
  private apiCalls: ApiCallRecord[] = [];
  private isIntercepting: boolean = false;

  constructor() {
    this.originalFetch = (typeof window !== 'undefined' ? window.fetch : undefined) as typeof fetch;
  }

  /**
   * Start intercepting API calls
   */
  startIntercepting(): void {
    if (this.isIntercepting) return;
    
    this.isIntercepting = true;
    const self = this;
    
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      // Record the API call
      self.apiCalls.push({
        url,
        method,
        data: init?.body ? JSON.parse(init.body as string) : undefined,
        timestamp: Date.now()
      });

      // Check for mock response
      const mockKey = `${method.toUpperCase()} ${url}`;
      const mockResponse = self.mockResponseMap.get(mockKey) || self.mockResponseMap.get(url);
      
      if (mockResponse) {
        return new Response(JSON.stringify(mockResponse.data), {
          status: mockResponse.status,
          statusText: mockResponse.statusText,
          headers: mockResponse.headers
        });
      }

      // Fall back to original fetch if no mock
      return self.originalFetch(input, init);
    };

    if (typeof window !== 'undefined') {
      window.fetch = mockFetch as any;
    }
  }

  /**
   * Stop intercepting API calls
   */
  stopIntercepting(): void {
    if (!this.isIntercepting) return;
    
    this.isIntercepting = false;
    
    if (typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
    }
  }

  /**
   * Mock an API response
   */
  mockResponse(url: string, response: MockResponse, method: string = 'GET'): void {
    const key = `${method.toUpperCase()} ${url}`;
    this.mockResponseMap.set(key, response);
  }

  /**
   * Mock multiple API responses
   */
  mockMultipleResponses(mocks: Array<{ url: string; method?: string; response: MockResponse }>): void {
    mocks.forEach(mock => {
      this.mockResponse(mock.url, mock.response, mock.method);
    });
  }

  /**
   * Clear all mocked responses
   */
  clearMocks(): void {
    this.mockResponseMap.clear();
  }

  /**
   * Get all recorded API calls
   */
  getApiCalls(): ApiCallRecord[] {
    return [...this.apiCalls];
  }

  /**
   * Get API calls for a specific URL
   */
  getApiCallsForUrl(url: string): ApiCallRecord[] {
    return this.apiCalls.filter(call => call.url.includes(url));
  }

  /**
   * Get API calls for a specific method
   */
  getApiCallsForMethod(method: string): ApiCallRecord[] {
    return this.apiCalls.filter(call => call.method.toUpperCase() === method.toUpperCase());
  }

  /**
   * Get the last API call
   */
  getLastApiCall(): ApiCallRecord | undefined {
    return this.apiCalls[this.apiCalls.length - 1];
  }

  /**
   * Clear recorded API calls
   */
  clearApiCalls(): void {
    this.apiCalls = [];
  }

  /**
   * Assert that an API call was made
   */
  expectApiCall(url: string, method: string = 'GET'): boolean {
    return this.apiCalls.some(call => 
      call.url.includes(url) && call.method.toUpperCase() === method.toUpperCase()
    );
  }

  /**
   * Assert API call count
   */
  expectApiCallCount(count: number): boolean {
    return this.apiCalls.length === count;
  }

  /**
   * Assert API call with specific data
   */
  expectApiCallWithData(url: string, expectedData: any, method: string = 'POST'): boolean {
    return this.apiCalls.some(call => 
      call.url.includes(url) && 
      call.method.toUpperCase() === method.toUpperCase() &&
      this.deepEqual(call.data, expectedData)
    );
  }

  /**
   * Wait for an API call to be made
   */
  async waitForApiCall(url: string, timeout: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkForCall = () => {
        if (this.expectApiCall(url)) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkForCall, 10);
      };
      
      checkForCall();
    });
  }

  /**
   * Create a successful response mock
   */
  createSuccessResponse(data: any, status: number = 200): MockResponse {
    return {
      status,
      statusText: 'OK',
      data
    };
  }

  /**
   * Create an error response mock
   */
  createErrorResponse(message: string, status: number = 400): MockResponse {
    return {
      status,
      statusText: 'Error',
      data: { error: message }
    };
  }

  /**
   * Mock network delay
   */
  mockDelay(url: string, delay: number): void {
    const originalResponse = this.mockResponseMap.get(url);
    if (originalResponse) {
      this.mockResponse(url, {
        ...originalResponse,
        data: new Promise(resolve => 
          setTimeout(() => resolve(originalResponse.data), delay)
        )
      });
    }
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }
}

/**
 * Create API test utilities
 */
export function createApiTestUtils(): ApiClientTestUtils {
  return new ApiClientTestUtils();
}