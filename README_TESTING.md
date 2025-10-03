# Annie Testing Framework Documentation

## Overview

The Annie Testing Framework provides comprehensive testing utilities for Annie's components, state management, and services. It is designed to be lightweight, easy to use, and covers all major testing scenarios you'll encounter when building applications with Annie.

## What's Included

### Core Components

1. **Test Harness** - Central orchestration for setting up and tearing down test environments
2. **State Manager Test Utils** - Utilities for testing state changes and time travel
3. **DI Container Test Utils** - Helpers for mocking and testing dependency injection
4. **API Client Test Utils** - Network mocking and API call verification
5. **Mock Services** - Pre-built mock implementations of Annie services
6. **Test Fixtures** - Sample data and configurations for testing
7. **Matchers** - Custom assertion helpers and simple test runner

## How to Use

### Basic Setup

```typescript
import { testHarness, createMockServices } from '../testing/index.js';

// Create a test context
const context = testHarness.createTestContext('myTest', {
  enableLogging: false,
  enableStateHistory: true
});

// Use the context in your tests
context.stateManager.setState('user', { name: 'John' });
console.log(context.stateManager.getState('user')); // { name: 'John' }

// Clean up
testHarness.cleanupContext('myTest');
```

### Testing State Management

```typescript
import { createStateTestUtils } from '../testing/index.js';

const context = testHarness.createTestContext();
const stateUtils = createStateTestUtils(context.stateManager);

// Start recording state changes
stateUtils.startRecording();

// Make some state changes
context.stateManager.setState('counter', 1);
context.stateManager.setState('counter', 2);

// Assert changes occurred
const success = stateUtils.expectChangeCount(2);
console.log('Two changes recorded:', success); // true

// Clean up
stateUtils.stopRecording();
```

### Mocking API Calls

```typescript
import { createApiTestUtils } from '../testing/index.js';

const apiUtils = createApiTestUtils();

// Start intercepting API calls
apiUtils.startIntercepting();

// Mock responses
apiUtils.mockResponse('/api/users', {
  status: 200,
  statusText: 'OK',
  data: [{ id: 1, name: 'John' }]
});

// Make API call (would normally use Annie's API client)
const response = await fetch('/api/users');
const data = await response.json();

// Verify the call was made
const wasCalled = apiUtils.expectApiCall('/api/users', 'GET');
console.log('API was called:', wasCalled); // true

// Clean up
apiUtils.stopIntercepting();
```

### Using Mock Services

```typescript
import { createMockServices } from '../testing/index.js';

const mocks = createMockServices();

// Use mock logger
mocks.logger.info('Test message');
console.log(mocks.logger.logs); // [{ level: 'Info', message: 'Test message', timestamp: ... }]

// Use mock state manager
mocks.stateManager.setState('test', 'value');
console.log(mocks.stateManager.getState('test')); // 'value'
```

### Testing with Fixtures

```typescript
import { testUsers, testConfig, createTestElement } from '../testing/index.js';

// Use test data
console.log(testUsers[0]); // { id: 1, name: 'John Doe', ... }

// Use test configuration
const framework = new AnnieFramework(testConfig);

// Create test elements
const button = createTestElement('button', { 
  'data-test-id': 'submit-btn',
  'class': 'btn-primary'
});
```

### Custom Assertions

```typescript
import { toEqual, toHaveProperty, assert } from '../testing/index.js';

// Custom matchers
const result1 = toEqual({ a: 1 }, { a: 1 });
console.log(result1.success); // true

const result2 = toHaveProperty({ name: 'John' }, 'name');
console.log(result2.success); // true

// Simple assertions
assert(true, 'This should pass');
// assert(false, 'This would throw an error');
```

### Simple Test Runner

```typescript
import { SimpleTestRunner } from '../testing/index.js';

const runner = new SimpleTestRunner();

runner.test('should add two numbers', () => {
  const result = 2 + 2;
  assert(result === 4, 'Expected 2 + 2 to equal 4');
});

runner.test('should handle async operations', async () => {
  const result = await Promise.resolve(42);
  assert(result === 42, 'Expected promise to resolve to 42');
});

await runner.run();
// Output:
// Running 2 tests...
// ✅ should add two numbers
// ✅ should handle async operations
// Test Results: 2 passed, 0 failed
```

## Comparison to Angular Testing

### What Annie Testing Framework Provides

| Feature | Annie | Angular (Jasmine/Karma) |
|---------|-------|-------------------------|
| Test Harness | ✅ Custom harness | ✅ TestBed |
| State Testing | ✅ Custom utilities | ⚠️ Manual or NgRx testing utils |
| API Mocking | ✅ Built-in fetch mocking | ✅ HttpClientTestingModule |
| DI Testing | ✅ Custom DI mocking | ✅ TestBed DI testing |
| Component Testing | ❌ Not needed (server-rendered) | ✅ ComponentFixture |
| Async Testing | ✅ Promise-based utils | ✅ fakeAsync, tick |
| Custom Matchers | ✅ Built-in matchers | ✅ Jasmine matchers |
| Test Runner | ✅ Simple built-in runner | ✅ Karma + Jasmine |

### Key Differences

1. **No Component Testing**: Since Annie uses server-side rendering, there's no need for component fixture testing like Angular's ComponentFixture.

2. **State-Focused**: Annie's testing is heavily focused on state management and data flow, which is more critical in Annie's architecture.

3. **Simpler Setup**: Annie's testing requires less configuration than Angular's TestBed setup.

4. **Built-in Mocking**: API and service mocking is built into Annie's testing framework, while Angular often requires additional setup.

5. **Framework Agnostic**: Annie's testing utilities can work in any JavaScript environment, not just with Angular's testing infrastructure.

## Best Practices

1. **Always Clean Up**: Use `testHarness.cleanupContext()` or `testHarness.cleanupAll()` after tests.

2. **Use Mock Services**: Prefer mock services over real ones for unit tests to avoid side effects.

3. **Test State Changes**: Use state recording utilities to verify that your application state changes as expected.

4. **Mock External Dependencies**: Always mock API calls and external services for predictable tests.

5. **Use Fixtures**: Leverage test fixtures for consistent test data across different test scenarios.

6. **Organize Tests**: Group related tests using the test harness context names.

## Example Test Suite

```typescript
import { 
  testHarness, 
  createStateTestUtils, 
  createMockServices,
  SimpleTestRunner,
  assert,
  toEqual 
} from '../testing/index.js';

const runner = new SimpleTestRunner();

runner.test('State Manager - should handle basic operations', () => {
  const context = testHarness.createTestContext('stateTest');
  
  // Test setting state
  context.stateManager.setState('user', { name: 'John' });
  const user = context.stateManager.getState('user');
  
  const result = toEqual(user, { name: 'John' });
  assert(result.success, result.message);
  
  testHarness.cleanupContext('stateTest');
});

runner.test('Mock Services - should track API calls', () => {
  const mocks = createMockServices();
  
  // Mock a response
  mocks.apiClient.mockResponse('/test', { success: true });
  
  // Make a call
  const response = mocks.apiClient.get('/test');
  
  // Verify
  const requests = mocks.apiClient.getRequests();
  assert(requests.length === 1, 'Expected 1 API call');
  assert(requests[0].url === '/test', 'Expected call to /test');
});

// Run all tests
await runner.run();
```

This testing framework provides everything you need to thoroughly test Annie applications without the complexity of Angular's testing infrastructure, while still providing comparable functionality for the features that matter in Annie's architecture.

## Production Build Exclusion

**Important:** Testing code should NEVER be included in production builds to avoid bloat and security concerns.

### Automatic Exclusion

The Annie framework is configured to automatically exclude testing code from production builds:

#### TypeScript Configuration (`tsconfig.json`)
```json
{
  "exclude": [
    "node_modules",
    "dist", 
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/testing/**/*"
  ]
}
```

#### Rollup Configuration (`rollup.config.js`)
```javascript
typescript({
  tsconfig: './tsconfig.json',
  exclude: ['src/testing/**/*', '**/*.test.ts', '**/*.spec.ts']
})
```

### Testing-Specific Build

For testing, use the separate TypeScript configuration:

```bash
# Build for testing (includes test files)
npx tsc --project tsconfig.test.json

# Build for production (excludes test files)
npm run build
```

### Import Patterns to Avoid in Production

❌ **DON'T** import testing utilities in production code:
```typescript
// This would be included in production bundle
import { testHarness } from './testing/index.js';
```

✅ **DO** keep testing imports only in test files:
```typescript
// In your .test.ts files
import { testHarness } from '../testing/index.js';
```

### Conditional Testing Code

If you need conditional testing code, use environment checks:

```typescript
// Only include in development/testing
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  const { testHarness } = await import('./testing/index.js');
  // Testing code here
}
```

### Bundle Size Impact

With proper exclusion, the testing framework adds **0 bytes** to production builds:

- **Production bundle**: Core Annie framework only
- **Test bundle**: Framework + testing utilities  
- **Development**: Both available for debugging

### Verification

To verify testing code is excluded from production:

```bash
# Build production bundle
npm run build

# Check bundle contents (should not include testing/)
npx rollup-plugin-analyzer dist/annie.esm.js

# Or manually inspect
grep -r "testing" dist/ || echo "No testing code found ✅"
```