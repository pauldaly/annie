# Enhanced HTTP Client

The Enhanced HTTP Client is a modern, feature-rich replacement for Annie's basic ApiClient. It provides advanced HTTP communication capabilities including interceptors, observables, caching, and automatic retry logic.

## Key Improvements Over Basic ApiClient

### 1. **Dual API Support** 
- **Observable-based**: Reactive programming with cancellable streams
- **Promise-based**: Traditional async/await patterns
- **Choice**: Use whichever pattern fits your architecture

### 2. **Interceptor System**
- **Request Interceptors**: Transform requests before sending
- **Response Interceptors**: Transform responses after receiving
- **Error Interceptors**: Handle errors across all requests
- **Use Cases**: Authentication, logging, data transformation

### 3. **Built-in Caching**
- **Memory Cache**: Fast in-memory response caching
- **Configurable TTL**: Set cache expiration per request
- **Automatic Invalidation**: Expired entries are automatically removed
- **GET Optimization**: Only caches safe GET requests

### 4. **Retry Logic**
- **Configurable Retries**: Set max attempts per request
- **Exponential Backoff**: Intelligent delay between retries
- **Error Conditions**: Only retry appropriate errors (5xx, network)
- **Circuit Breaker**: Prevents cascading failures

### 5. **Advanced Features**
- **Loading State**: Track active requests automatically  
- **Request Cancellation**: Cancel requests via observables
- **Timeout Management**: Per-request timeout configuration
- **Response Types**: JSON, text, blob, arrayBuffer support
- **Parameter Serialization**: Automatic URL parameter handling

## Basic Usage

```typescript
import { EnhancedHttpClient, createEnhancedHttpClient } from './core/enhanced-http-client.js';

// Create client
const httpClient = new EnhancedHttpClient({
  timeout: 30000,
  headers: { 'X-App-Version': '1.0.0' }
});

// Or create via DI container
const httpClient = createEnhancedHttpClient(container, baseConfig);
```

## Observable API

```typescript
// GET request with observable
httpClient.get('/api/users')
  .subscribe({
    next: response => console.log('Users:', response.data),
    error: error => console.error('Error:', error),
    complete: () => console.log('Request completed')
  });

// POST with observable
httpClient.post('/api/users', { name: 'John', email: 'john@example.com' })
  .subscribe(response => {
    console.log('Created user:', response.data);
  });
```

## Promise API

```typescript
// GET request with async/await
try {
  const response = await httpClient.getAsync('/api/users');
  console.log('Users:', response.data);
} catch (error) {
  console.error('Error:', error);
}

// POST with promises
httpClient.postAsync('/api/users', userData)
  .then(response => console.log('Created:', response.data))
  .catch(error => console.error('Failed:', error));
```

## Interceptors

### Authentication Interceptor

```typescript
// Add authentication to all requests
httpClient.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});
```

### Response Transformation

```typescript
// Transform all API responses
httpClient.interceptors.response.use(response => {
  // Add metadata to all responses
  response.data = {
    ...response.data,
    receivedAt: new Date().toISOString(),
    source: 'api'
  };
  return response;
});
```

### Loading State Management

```typescript
let activeRequests = 0;

// Track loading state
const loadingInterceptor = HttpInterceptors.loading(
  (isLoading) => {
    console.log('Loading:', isLoading);
    // Update UI loading indicator
    document.getElementById('spinner').style.display = 
      isLoading ? 'block' : 'none';
  }
);

httpClient.interceptors.request.use(loadingInterceptor.request);
httpClient.interceptors.response.use(
  loadingInterceptor.response,
  loadingInterceptor.error
);
```

## Caching

```typescript
// Enable caching for GET requests
const response = await httpClient.getAsync('/api/expensive-data', {
  cache: true,
  cacheTimeout: 600000 // 10 minutes
});

// Subsequent requests within 10 minutes return cached data
const cachedResponse = await httpClient.getAsync('/api/expensive-data', {
  cache: true
});
```

## Retry Configuration

```typescript
// Configure retry behavior
const response = await httpClient.getAsync('/api/unreliable-endpoint', {
  retries: 3,
  retryDelay: 1000 // Start with 1 second, exponential backoff
});
```

## Built-in Interceptors

The Enhanced HTTP Client includes pre-built interceptors for common scenarios:

### Authentication Interceptor

```typescript
const authInterceptor = HttpInterceptors.auth(() => localStorage.getItem('token'));
httpClient.interceptors.request.use(authInterceptor.request);
```

### Retry with Backoff

```typescript
const retryInterceptor = HttpInterceptors.retryWithBackoff(3, 1000, 30000);
httpClient.interceptors.response.use(null, retryInterceptor.error);
```

### Response Transformation

```typescript
const transformInterceptor = HttpInterceptors.transformResponse(
  data => ({ ...data, processed: true }),
  response => response.status === 200
);
httpClient.interceptors.response.use(transformInterceptor.response);
```

## DI Container Integration

```typescript
// Register HTTP client in DI container
container.register('httpClient', () => createEnhancedHttpClient(container));

// Register custom cache implementation
container.register('httpCache', () => new RedisHttpCache());

// Use in services
class UserService {
  constructor(private httpClient: EnhancedHttpClient) {}
  
  async getUsers() {
    return this.httpClient.getAsync('/api/users');
  }
}
```

## Error Handling

```typescript
try {
  const response = await httpClient.getAsync('/api/data');
  console.log(response.data);
} catch (error) {
  if (error.isHttpError) {
    console.log('Status:', error.status);
    console.log('Response:', error.response?.data);
    console.log('Config:', error.config);
  } else {
    console.log('Network/Other error:', error.message);
  }
}
```

## Advanced Configuration

```typescript
const httpClient = new EnhancedHttpClient({
  // Base URL for all requests
  url: 'https://api.example.com',
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': '2.0'
  },
  
  // Default timeout
  timeout: 30000,
  
  // Include cookies
  withCredentials: true,
  
  // Default retry settings
  retries: 2,
  retryDelay: 1000,
  
  // Enable caching by default
  cache: true,
  cacheTimeout: 300000
});
```

## Migration from Basic ApiClient

### Before (Basic ApiClient)
```typescript
// Old way
const apiClient = new ApiClient();
const result = await apiClient.callAPI('/api/users', 'GET');
```

### After (Enhanced HTTP Client)
```typescript
// New way - Promise API
const response = await httpClient.getAsync('/api/users');
const result = response.data;

// Or Observable API
httpClient.get('/api/users')
  .subscribe(response => {
    const result = response.data;
  });
```

## Performance Benefits

1. **Reduced Network Traffic**: Intelligent caching reduces redundant requests
2. **Faster Responses**: Memory cache provides instant responses for cached data
3. **Better Error Recovery**: Automatic retries prevent temporary failure scenarios
4. **Connection Reuse**: More efficient connection management
5. **Request Batching**: Observable patterns enable request combining

## Architecture Benefits

1. **Separation of Concerns**: Interceptors isolate cross-cutting concerns
2. **Testability**: Easy to mock and test individual components
3. **Extensibility**: Plugin architecture via interceptors
4. **Observability**: Built-in logging and monitoring hooks
5. **Type Safety**: Full TypeScript support with generics

The Enhanced HTTP Client provides a modern, scalable foundation for HTTP communication in Annie applications, offering significant improvements in developer experience, performance, and maintainability over the basic ApiClient.