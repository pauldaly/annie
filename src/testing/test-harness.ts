/**
 * Test Harness for Annie Framework
 * Provides setup, teardown, and utilities for testing Annie components
 */

import { DIContainer, FrameworkConfiguration, ServiceTokens } from '../core/di-container.js';
import { StateManager } from '../core/state-manager.js';
import { Logger } from '../core/logger.js';
import { DataStore } from '../core/data-store.js';
import { AnnieFramework } from '../annie.js';

export interface TestContext {
  container: DIContainer;
  stateManager: StateManager;
  logger: Logger;
  dataStore: DataStore;
  framework?: AnnieFramework;
}

export interface TestConfiguration {
  enableLogging?: boolean;
  logLevel?: string;
  enableStateHistory?: boolean;
  maxHistorySize?: number;
  enableLocalStorage?: boolean;
  mockServices?: boolean;
}

export class TestHarness {
  private contexts: Map<string, TestContext> = new Map();

  /**
   * Create a test context with Annie services
   */
  createTestContext(name: string = 'default', config: TestConfiguration = {}): TestContext {
    const container = new DIContainer();
    
    // Configure logger
    const logger = new Logger(config.logLevel || 'Error');
    container.registerSingleton(ServiceTokens.Logger, () => logger);
    
    // Configure state manager
    const stateManager = new StateManager(logger, {
      enableDevTools: false,
      enableTimeTravel: config.enableStateHistory || false,
      maxHistorySize: config.maxHistorySize || 50,
      enableLocalStorage: config.enableLocalStorage || false,
      storagePrefix: `annie-test-${name}`
    });
    container.registerSingleton(ServiceTokens.StateManager, () => stateManager);
    
    // Configure data store
    const dataStore = new DataStore(logger);
    container.registerSingleton(ServiceTokens.DataStore, () => dataStore);
    
    const context: TestContext = {
      container,
      stateManager,
      logger,
      dataStore
    };
    
    this.contexts.set(name, context);
    return context;
  }

  /**
   * Create a full Annie framework instance for integration testing
   */
  createFrameworkContext(name: string = 'framework', config: TestConfiguration = {}): TestContext {
    const frameworkConfig: FrameworkConfiguration = {
      logLevel: config.logLevel || 'Error',
      apiConfig: {
        baseUrl: '/api',
        timeout: 5000
      },
      autoInitialize: false,
      enableRemoteControl: false
    };
    
    const framework = new AnnieFramework(frameworkConfig);
    const context = this.createTestContext(name, config);
    context.framework = framework;
    
    return context;
  }

  /**
   * Get a test context by name
   */
  getContext(name: string = 'default'): TestContext | undefined {
    return this.contexts.get(name);
  }

  /**
   * Clean up a test context
   */
  cleanupContext(name: string = 'default'): void {
    const context = this.contexts.get(name);
    if (context) {
      // Clear state
      context.stateManager.clearState('test-cleanup');
      
      // Dispose container
      context.container.dispose();
      
      // Clean up framework
      if (context.framework) {
        context.framework.destroy();
      }
      
      this.contexts.delete(name);
    }
  }

  /**
   * Clean up all test contexts
   */
  cleanupAll(): void {
    for (const name of this.contexts.keys()) {
      this.cleanupContext(name);
    }
  }

  /**
   * Reset context state without destroying services
   */
  resetContext(name: string = 'default'): void {
    const context = this.contexts.get(name);
    if (context) {
      context.stateManager.clearState('test-reset');
      context.dataStore.unload(); // Clear all datasets
    }
  }

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(timeout: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  /**
   * Wait for state changes to propagate
   */
  async waitForStateChange(
    context: TestContext, 
    key: string, 
    expectedValue: any, 
    timeout: number = 1000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkState = () => {
        const currentValue = context.stateManager.getState(key);
        if (this.deepEqual(currentValue, expectedValue)) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkState, 10);
      };
      
      checkState();
    });
  }

  /**
   * Create a spy function for testing callbacks
   */
  createSpy<T extends (...args: any[]) => any>(
    originalFn?: T
  ): T & { calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> } {
    const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];
    
    const spy = ((...args: Parameters<T>) => {
      let result: ReturnType<T>;
      
      if (originalFn) {
        result = originalFn(...args);
      } else {
        result = undefined as ReturnType<T>;
      }
      
      calls.push({ args, result });
      return result;
    }) as T & { calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> };
    
    spy.calls = calls;
    return spy;
  }

  /**
   * Mock DOM elements for testing
   */
  createMockElement(tagName: string, attributes: Record<string, string> = {}): HTMLElement {
    if (typeof document === 'undefined') {
      // Create a simple mock for Node.js environments
      return {
        tagName: tagName.toUpperCase(),
        getAttribute: (name: string) => attributes[name] || null,
        setAttribute: (name: string, value: string) => { attributes[name] = value; },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        }
      } as any;
    }
    
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
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

// Global test harness instance
export const testHarness = new TestHarness();