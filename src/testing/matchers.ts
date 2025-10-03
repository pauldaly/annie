/**
 * Custom Test Matchers
 * Provides assertion helpers for Annie testing
 */

export interface AssertionResult {
  success: boolean;
  message: string;
}

/**
 * Assert that a value is truthy
 */
export function toBeTruthy(value: any): AssertionResult {
  return {
    success: !!value,
    message: `Expected ${value} to be truthy`
  };
}

/**
 * Assert that a value is falsy
 */
export function toBeFalsy(value: any): AssertionResult {
  return {
    success: !value,
    message: `Expected ${value} to be falsy`
  };
}

/**
 * Assert that two values are equal
 */
export function toEqual(actual: any, expected: any): AssertionResult {
  const isEqual = deepEqual(actual, expected);
  return {
    success: isEqual,
    message: `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
  };
}

/**
 * Assert that two values are strictly equal
 */
export function toStrictEqual(actual: any, expected: any): AssertionResult {
  return {
    success: actual === expected,
    message: `Expected ${actual} to strictly equal ${expected}`
  };
}

/**
 * Assert that an array contains a value
 */
export function toContain(array: any[], value: any): AssertionResult {
  const contains = array.includes(value);
  return {
    success: contains,
    message: `Expected array ${JSON.stringify(array)} to contain ${JSON.stringify(value)}`
  };
}

/**
 * Assert that an object has a property
 */
export function toHaveProperty(obj: any, property: string): AssertionResult {
  const hasProperty = obj && Object.prototype.hasOwnProperty.call(obj, property);
  return {
    success: hasProperty,
    message: `Expected object to have property '${property}'`
  };
}

/**
 * Assert that a value matches a type
 */
export function toBeType(value: any, expectedType: string): AssertionResult {
  const actualType = typeof value;
  return {
    success: actualType === expectedType,
    message: `Expected ${value} to be of type '${expectedType}', but got '${actualType}'`
  };
}

/**
 * Assert that a value is an instance of a class
 */
export function toBeInstanceOf(value: any, expectedClass: any): AssertionResult {
  const isInstance = value instanceof expectedClass;
  return {
    success: isInstance,
    message: `Expected ${value} to be instance of ${expectedClass.name}`
  };
}

/**
 * Assert that an array has a specific length
 */
export function toHaveLength(array: any[], expectedLength: number): AssertionResult {
  return {
    success: array.length === expectedLength,
    message: `Expected array to have length ${expectedLength}, but got ${array.length}`
  };
}

/**
 * Assert that a function throws an error
 */
export function toThrow(fn: () => any, expectedError?: string | RegExp): AssertionResult {
  try {
    fn();
    return {
      success: false,
      message: 'Expected function to throw an error, but it did not'
    };
  } catch (error) {
    if (expectedError) {
      const errorMessage = (error as Error).message;
      const matches = typeof expectedError === 'string' 
        ? errorMessage.includes(expectedError)
        : expectedError.test(errorMessage);
      
      return {
        success: matches,
        message: `Expected function to throw error matching '${expectedError}', but got '${errorMessage}'`
      };
    }
    return {
      success: true,
      message: 'Function threw an error as expected'
    };
  }
}

/**
 * Assert that a promise resolves
 */
export async function toResolve(promise: Promise<any>): Promise<AssertionResult> {
  try {
    await promise;
    return {
      success: true,
      message: 'Promise resolved as expected'
    };
  } catch (error) {
    return {
      success: false,
      message: `Expected promise to resolve, but it rejected with: ${error}`
    };
  }
}

/**
 * Assert that a promise rejects
 */
export async function toReject(promise: Promise<any>, expectedError?: string | RegExp): Promise<AssertionResult> {
  try {
    await promise;
    return {
      success: false,
      message: 'Expected promise to reject, but it resolved'
    };
  } catch (error) {
    if (expectedError) {
      const errorMessage = (error as Error).message;
      const matches = typeof expectedError === 'string'
        ? errorMessage.includes(expectedError)
        : expectedError.test(errorMessage);
      
      return {
        success: matches,
        message: `Expected promise to reject with error matching '${expectedError}', but got '${errorMessage}'`
      };
    }
    return {
      success: true,
      message: 'Promise rejected as expected'
    };
  }
}

/**
 * Assert that state has changed
 */
export function toHaveStateChanged(
  beforeState: Record<string, any>,
  afterState: Record<string, any>,
  key: string
): AssertionResult {
  const beforeValue = beforeState[key];
  const afterValue = afterState[key];
  const hasChanged = !deepEqual(beforeValue, afterValue);
  
  return {
    success: hasChanged,
    message: `Expected state key '${key}' to have changed from ${JSON.stringify(beforeValue)} to ${JSON.stringify(afterValue)}`
  };
}

/**
 * Assert that API was called
 */
export function toHaveBeenCalledWith(
  apiCalls: Array<{ url: string; method: string; data?: any }>,
  expectedUrl: string,
  expectedMethod: string = 'GET',
  expectedData?: any
): AssertionResult {
  const matchingCall = apiCalls.find(call => 
    call.url.includes(expectedUrl) && 
    call.method.toUpperCase() === expectedMethod.toUpperCase() &&
    (expectedData ? deepEqual(call.data, expectedData) : true)
  );
  
  return {
    success: !!matchingCall,
    message: `Expected API to have been called with ${expectedMethod} ${expectedUrl}${expectedData ? ` and data ${JSON.stringify(expectedData)}` : ''}`
  };
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
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
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Simple test runner for Annie tests
 */
export class SimpleTestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private results: Array<{ name: string; success: boolean; error?: string }> = [];

  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log(`Running ${this.tests.length} tests...`);
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.push({ name: test.name, success: true });
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.push({ 
          name: test.name, 
          success: false, 
          error: (error as Error).message 
        });
        console.log(`❌ ${test.name}: ${(error as Error).message}`);
      }
    }
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  }

  getResults(): Array<{ name: string; success: boolean; error?: string }> {
    return [...this.results];
  }

  clear(): void {
    this.tests = [];
    this.results = [];
  }
}

/**
 * Assert function for simple testing
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}