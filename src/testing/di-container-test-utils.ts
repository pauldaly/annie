/**
 * DI Container Test Utilities
 * Provides testing helpers for Annie's DIContainer
 */

import { DIContainer, ServiceLifetime } from '../core/di-container.js';

export interface MockServiceDescriptor<T = any> {
  token: string | symbol;
  mockImplementation: T;
  lifetime?: ServiceLifetime;
}

export class DIContainerTestUtils {
  private container: DIContainer;
  private originalServices: Map<string | symbol, any> = new Map();

  constructor(container: DIContainer) {
    this.container = container;
  }

  /**
   * Mock a service in the container
   */
  mockService<T>(token: string | symbol, mockImplementation: T, lifetime: ServiceLifetime = 'singleton'): void {
    // Store original if it exists
    if (this.container.has(token)) {
      try {
        this.originalServices.set(token, this.container.resolve(token));
      } catch {
        // Service exists but can't be resolved, that's ok
      }
    }

    // Register mock
    this.container.register({
      token,
      factory: () => mockImplementation,
      lifetime,
      dependencies: []
    });
  }

  /**
   * Mock multiple services
   */
  mockServices(services: MockServiceDescriptor[]): void {
    services.forEach(service => {
      this.mockService(service.token, service.mockImplementation, service.lifetime);
    });
  }

  /**
   * Restore a mocked service to its original implementation
   */
  restoreService(token: string | symbol): void {
    const original = this.originalServices.get(token);
    if (original) {
      this.container.register({
        token,
        factory: () => original,
        lifetime: 'singleton',
        dependencies: []
      });
      this.originalServices.delete(token);
    }
  }

  /**
   * Restore all mocked services
   */
  restoreAllServices(): void {
    for (const token of this.originalServices.keys()) {
      this.restoreService(token);
    }
  }

  /**
   * Create a spy that tracks service resolution
   */
  spyOnService<T>(token: string | symbol): T & { __spy: { resolveCount: number; lastResolveTime: number } } {
    const original = this.container.resolve<T>(token);
    let resolveCount = 0;
    let lastResolveTime = 0;

    const spy = new Proxy(original as any, {
      get(target, prop) {
        if (prop === '__spy') {
          return { resolveCount, lastResolveTime };
        }
        return target[prop];
      }
    });

    // Mock the service with the spy
    this.mockService(token, spy);
    
    // Track resolutions
    const originalResolve = this.container.resolve.bind(this.container);
    this.container.resolve = function<U>(serviceToken: string | symbol): U {
      if (serviceToken === token) {
        resolveCount++;
        lastResolveTime = Date.now();
      }
      return originalResolve<U>(serviceToken);
    };

    return spy;
  }

  /**
   * Test service registration
   */
  testServiceRegistration(token: string | symbol): boolean {
    return this.container.has(token);
  }

  /**
   * Test service resolution
   */
  testServiceResolution<T>(token: string | symbol): { success: boolean; service?: T; error?: Error } {
    try {
      const service = this.container.resolve<T>(token);
      return { success: true, service };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Test singleton behavior
   */
  testSingletonBehavior(token: string | symbol): boolean {
    try {
      const instance1 = this.container.resolve(token);
      const instance2 = this.container.resolve(token);
      return instance1 === instance2;
    } catch {
      return false;
    }
  }

  /**
   * Test transient behavior
   */
  testTransientBehavior(token: string | symbol): boolean {
    try {
      const instance1 = this.container.resolve(token);
      const instance2 = this.container.resolve(token);
      return instance1 !== instance2;
    } catch {
      return false;
    }
  }

  /**
   * Create a scoped container for testing
   */
  createTestScope(): DIContainer {
    return this.container.createScope() as DIContainer;
  }

  /**
   * Test dependency injection
   */
  testDependencyInjection(
    token: string | symbol,
    factory: (...deps: any[]) => any,
    dependencies: Array<string | symbol>
  ): boolean {
    try {
      // Register test service
      this.container.register({
        token,
        factory,
        lifetime: 'transient',
        dependencies
      });

      // Try to resolve
      const service = this.container.resolve(token);
      return service !== null && service !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get container statistics for testing
   */
  getContainerStats(): { registeredServices: number; resolvedSingletons: number } {
    // This is a simplified version since the container doesn't expose internal maps
    // In a real implementation, you might want to add debug methods to DIContainer
    return {
      registeredServices: 0, // Would need container.getRegisteredServices()
      resolvedSingletons: 0   // Would need container.getSingletonCount()
    };
  }
}

/**
 * Create a test DI container
 */
export function createTestDIContainer(): DIContainer {
  return new DIContainer();
}

/**
 * Create test utilities for a DI container
 */
export function createDITestUtils(container: DIContainer): DIContainerTestUtils {
  return new DIContainerTestUtils(container);
}

/**
 * Create a mock service descriptor
 */
export function createMockService<T>(
  token: string | symbol,
  mockImplementation: T,
  lifetime: ServiceLifetime = 'singleton'
): MockServiceDescriptor<T> {
  return {
    token,
    mockImplementation,
    lifetime
  };
}