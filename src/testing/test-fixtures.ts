/**
 * Test Fixtures
 * Provides sample data and configurations for testing
 */

export const testUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' },
];

export const testPosts = [
  { id: 1, title: 'First Post', content: 'This is the first post', authorId: 1 },
  { id: 2, title: 'Second Post', content: 'This is the second post', authorId: 2 },
  { id: 3, title: 'Third Post', content: 'This is the third post', authorId: 1 },
];

export const testConfig = {
  logLevel: 'Error',
  apiConfig: {
    baseUrl: '/api/test',
    timeout: 1000
  },
  autoInitialize: false,
  enableRemoteControl: false
};

export const testStateData = {
  user: { id: 1, name: 'Test User' },
  counter: 0,
  items: ['item1', 'item2', 'item3'],
  settings: {
    theme: 'dark',
    notifications: true
  }
};

export const testApiResponses = {
  '/api/users': {
    status: 200,
    statusText: 'OK',
    data: testUsers
  },
  '/api/posts': {
    status: 200,
    statusText: 'OK',
    data: testPosts
  },
  '/api/error': {
    status: 500,
    statusText: 'Internal Server Error',
    data: { error: 'Something went wrong' }
  }
};

export const testRoutes = [
  { path: '/', component: 'home' },
  { path: '/users', component: 'users' },
  { path: '/posts', component: 'posts' },
  { path: '/settings', component: 'settings' }
];

/**
 * Create test HTML elements
 */
export function createTestElement(tagName: string, attributes: Record<string, string> = {}): HTMLElement {
  if (typeof document === 'undefined') {
    // Mock element for Node.js environments
    return {
      tagName: tagName.toUpperCase(),
      getAttribute: (name: string) => attributes[name] || null,
      setAttribute: (name: string, value: string) => { attributes[name] = value; },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      click: () => {},
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      textContent: '',
      innerHTML: ''
    } as any;
  }

  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * Create test form data
 */
export function createTestFormData(): FormData {
  const formData = new FormData();
  formData.append('name', 'Test User');
  formData.append('email', 'test@example.com');
  formData.append('age', '25');
  return formData;
}

/**
 * Create test dataset with various data types
 */
export function createTestDataset() {
  return {
    strings: ['hello', 'world', 'test'],
    numbers: [1, 2, 3, 4, 5],
    booleans: [true, false, true],
    objects: [
      { name: 'Object 1', value: 100 },
      { name: 'Object 2', value: 200 }
    ],
    mixed: ['string', 42, true, { key: 'value' }, null]
  };
}

/**
 * Create test validation scenarios
 */
export const testValidationCases = {
  validEmail: 'test@example.com',
  invalidEmail: 'not-an-email',
  validUrl: 'https://example.com',
  invalidUrl: 'not-a-url',
  validNumber: 42,
  invalidNumber: 'not-a-number',
  validArray: [1, 2, 3],
  invalidArray: 'not-an-array',
  validObject: { key: 'value' },
  invalidObject: 'not-an-object'
};

/**
 * Create test error scenarios
 */
export const testErrorCases = [
  { type: 'ValidationError', message: 'Invalid input data' },
  { type: 'NetworkError', message: 'Failed to fetch' },
  { type: 'StateError', message: 'State is corrupted' },
  { type: 'DIError', message: 'Service not found' }
];

/**
 * Create test performance data
 */
export function createPerformanceTestData(size: number = 1000) {
  return Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    timestamp: Date.now() + i,
    value: Math.random() * 100
  }));
}

/**
 * Create test delay for async operations
 */
export function createTestDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export function generateRandomTestData() {
  return {
    id: Math.floor(Math.random() * 1000),
    name: `Test-${Math.random().toString(36).substr(2, 9)}`,
    value: Math.random() * 100,
    timestamp: Date.now(),
    isActive: Math.random() > 0.5
  };
}