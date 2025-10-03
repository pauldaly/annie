/**
 * Dependency Injection Container
 * Replaces global variables and singleton patterns with proper dependency injection
 */

export type ServiceLifetime = 'singleton' | 'transient' | 'scoped';
export type ServiceScope = 'root' | 'module' | 'component' | 'request' | string;

export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (...args: any[]) => T;
  lifetime: ServiceLifetime;
  dependencies?: Array<string | symbol>;
  // Enhanced hierarchical properties
  scope?: ServiceScope;
  lazy?: boolean;
  condition?: () => boolean;
  metadata?: Record<string, any>;
  interceptors?: Array<ServiceInterceptor<T>>;
  tags?: string[];
}

export interface ServiceInterceptor<T = any> {
  before?(context?: ResolutionContext): void;
  after?(instance: T, context?: ResolutionContext): T;
}

export interface ResolutionContext {
  token: string | symbol;
  scope: string;
  container: ServiceContainer;
  parentContext?: ResolutionContext;
  circularDependencyStack: Array<string | symbol>;
  metadata: Record<string, any>;
}

export interface ServiceContainer {
  // Existing methods (backward compatible)
  register<T>(descriptor: ServiceDescriptor<T>): void;
  registerSingleton<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void;
  registerTransient<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void;
  resolve<T>(token: string | symbol): T;
  has(token: string | symbol): boolean;
  createScope(): ServiceContainer;
  
  // Enhanced hierarchical methods
  createChildScope(scopeName?: string): ServiceContainer;
  createModuleScope(moduleName: string): ServiceContainer;
  registerScoped<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void;
  registerModule(module: ServiceModule): void;
  resolveWithContext<T>(token: string | symbol, context?: Partial<ResolutionContext>): T;
  resolveAll<T>(token: string | symbol): T[];
  tryResolve<T>(token: string | symbol): T | null;
  
  // Service inspection
  getServiceInfo(token: string | symbol): ServiceInfo | null;
  getAllServices(): ServiceInfo[];
  getServicesByTag(tag: string): ServiceInfo[];
  
  // Scope management
  getScopeName(): string;
  getParent(): ServiceContainer | null;
  getRoot(): ServiceContainer;
  getChildren(): ServiceContainer[];
  
  // Lifecycle
  dispose(): void;
  onDispose(callback: () => void): void;
}

export interface ServiceInfo {
  token: string | symbol;
  lifetime: ServiceLifetime;
  scope: ServiceScope;
  dependencies: Array<string | symbol>;
  tags: string[];
  isRegistered: boolean;
  isResolved: boolean;
  metadata: Record<string, any>;
}

export interface ServiceModule {
  name: string;
  services: ServiceDescriptor[];
  dependencies?: string[];
  configure?: (container: ServiceContainer) => void;
}

export class DIContainer implements ServiceContainer {
    private services = new Map<string | symbol, ServiceDescriptor>();
    private singletonInstances = new Map<string | symbol, any>();
    private scopedInstances = new Map<string | symbol, any>();
    private parentContainer?: DIContainer;
    private childContainers: DIContainer[] = [];
    private scopeName: string;
    private disposeCallbacks: Array<() => void> = [];
    private modules = new Map<string, ServiceModule>();

    constructor(parent?: DIContainer, scopeName: string = 'root') {
        this.parentContainer = parent;
        this.scopeName = scopeName;
        
        if (parent) {
            parent.childContainers.push(this);
        }
    }

    register<T>(descriptor: ServiceDescriptor<T>): void {
        this.services.set(descriptor.token, descriptor);
    }

    registerSingleton<T>(
        token: string | symbol, 
        factory: (...args: any[]) => T, 
        dependencies: Array<string | symbol> = []
    ): void {
        this.register({
            token,
            factory,
            lifetime: 'singleton',
            dependencies
        });
    }

    registerTransient<T>(
        token: string | symbol, 
        factory: (...args: any[]) => T, 
        dependencies: Array<string | symbol> = []
    ): void {
        this.register({
            token,
            factory,
            lifetime: 'transient',
            dependencies
        });
    }

    resolve<T>(token: string | symbol): T {
        return this.resolveWithContext<T>(token);
    }

    resolveWithContext<T>(token: string | symbol, context?: Partial<ResolutionContext>): T {
        const fullContext: ResolutionContext = {
            token,
            scope: this.scopeName,
            container: this,
            circularDependencyStack: context?.circularDependencyStack || [],
            metadata: context?.metadata || {},
            parentContext: context?.parentContext
        };

        // Check for circular dependencies
        if (fullContext.circularDependencyStack.includes(token)) {
            throw new Error(`Circular dependency detected: ${fullContext.circularDependencyStack.map(String).join(' -> ')} -> ${String(token)}`);
        }

        const descriptor = this.findServiceDescriptor(token);
        if (!descriptor) {
            throw new Error(`Service '${String(token)}' is not registered`);
        }

        // Check condition if present
        if (descriptor.condition && !descriptor.condition()) {
            throw new Error(`Service '${String(token)}' condition not met`);
        }

        // Check for existing instances based on lifetime
        const existing = this.getExistingInstance<T>(token, descriptor);
        if (existing !== null) {
            return existing;
        }

        // Add to circular dependency stack
        fullContext.circularDependencyStack.push(token);

        // Run before interceptors
        descriptor.interceptors?.forEach(interceptor => {
            interceptor.before?.(fullContext);
        });

        // Resolve dependencies
        const deps = descriptor.dependencies || [];
        const resolvedDeps = deps.map(dep => 
            this.resolveWithContext(dep, { 
                ...fullContext, 
                parentContext: fullContext 
            })
        );

        // Create instance
        const instance = descriptor.factory(...resolvedDeps);

        // Run after interceptors
        let finalInstance = instance;
        descriptor.interceptors?.forEach(interceptor => {
            if (interceptor.after) {
                finalInstance = interceptor.after(finalInstance, fullContext);
            }
        });

        // Cache instances based on lifetime
        this.cacheInstance(token, descriptor, finalInstance);

        return finalInstance;
    }

    private findServiceDescriptor(token: string | symbol): ServiceDescriptor | null {
        // Check current container first
        let descriptor = this.services.get(token);
        if (descriptor) return descriptor;

        // Check parent containers
        let parent = this.parentContainer;
        while (parent && !descriptor) {
            descriptor = parent.services.get(token);
            parent = parent.parentContainer;
        }

        return descriptor || null;
    }

    private getExistingInstance<T>(token: string | symbol, descriptor: ServiceDescriptor): T | null {
        if (descriptor.lifetime === 'singleton') {
            // Check current container
            let existing = this.singletonInstances.get(token);
            if (existing) return existing;

            // Check parent containers for singletons
            let parent = this.parentContainer;
            while (parent && !existing) {
                existing = parent.singletonInstances.get(token);
                parent = parent.parentContainer;
            }
            return existing || null;
        }

        if (descriptor.lifetime === 'scoped') {
            return this.scopedInstances.get(token) || null;
        }

        // Transient services always create new instances
        return null;
    }

    private cacheInstance<T>(token: string | symbol, descriptor: ServiceDescriptor, instance: T): void {
        if (descriptor.lifetime === 'singleton') {
            this.singletonInstances.set(token, instance);
        } else if (descriptor.lifetime === 'scoped') {
            this.scopedInstances.set(token, instance);
        }
        // Transient services are not cached
    }

    has(token: string | symbol): boolean {
        return this.services.has(token) || (this.parentContainer?.has(token) ?? false);
    }

    createScope(): ServiceContainer {
        return this.createChildScope();
    }

    createChildScope(scopeName?: string): ServiceContainer {
        const childScopeName = scopeName || `${this.scopeName}.child.${this.childContainers.length}`;
        return new DIContainer(this, childScopeName);
    }

    createModuleScope(moduleName: string): ServiceContainer {
        const moduleScopeName = `${this.scopeName}.module.${moduleName}`;
        return new DIContainer(this, moduleScopeName);
    }

    registerScoped<T>(
        token: string | symbol, 
        factory: (...args: any[]) => T, 
        dependencies: Array<string | symbol> = []
    ): void {
        this.register({
            token,
            factory,
            lifetime: 'scoped',
            dependencies
        });
    }

    registerModule(module: ServiceModule): void {
        this.modules.set(module.name, module);
        
        // Register all services from the module
        module.services.forEach(service => {
            this.register(service);
        });

        // Run module configuration if provided
        if (module.configure) {
            module.configure(this);
        }
    }

    resolveAll<T>(token: string | symbol): T[] {
        const instances: T[] = [];
        
        // Collect from current container
        if (this.services.has(token)) {
            instances.push(this.resolve<T>(token));
        }
        
        // Collect from parent containers
        let parent = this.parentContainer;
        while (parent) {
            if (parent.services.has(token)) {
                instances.push(parent.resolve<T>(token));
            }
            parent = parent.parentContainer;
        }
        
        return instances;
    }

    tryResolve<T>(token: string | symbol): T | null {
        try {
            return this.resolve<T>(token);
        } catch {
            return null;
        }
    }

    getServiceInfo(token: string | symbol): ServiceInfo | null {
        const descriptor = this.findServiceDescriptor(token);
        if (!descriptor) return null;

        return {
            token,
            lifetime: descriptor.lifetime,
            scope: descriptor.scope || 'root',
            dependencies: descriptor.dependencies || [],
            tags: descriptor.tags || [],
            isRegistered: true,
            isResolved: this.singletonInstances.has(token) || this.scopedInstances.has(token),
            metadata: descriptor.metadata || {}
        };
    }

    getAllServices(): ServiceInfo[] {
        const services: ServiceInfo[] = [];
        
        // Get services from current container
        this.services.forEach((descriptor, token) => {
            const info = this.getServiceInfo(token);
            if (info) services.push(info);
        });
        
        // Get services from parent containers
        let parent = this.parentContainer;
        while (parent) {
            parent.services.forEach((descriptor, token) => {
                // Only add if not already present (child overrides parent)
                if (!services.find(s => s.token === token)) {
                    const info = parent!.getServiceInfo(token);
                    if (info) services.push(info);
                }
            });
            parent = parent.parentContainer;
        }
        
        return services;
    }

    getServicesByTag(tag: string): ServiceInfo[] {
        return this.getAllServices().filter(service => 
            service.tags.includes(tag)
        );
    }

    getScopeName(): string {
        return this.scopeName;
    }

    getParent(): ServiceContainer | null {
        return this.parentContainer || null;
    }

    getRoot(): ServiceContainer {
        let root: ServiceContainer = this;
        while (root.getParent()) {
            root = root.getParent()!;
        }
        return root;
    }

    getChildren(): ServiceContainer[] {
        return [...this.childContainers];
    }

    onDispose(callback: () => void): void {
        this.disposeCallbacks.push(callback);
    }

    dispose(): void {
        // Run dispose callbacks
        this.disposeCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.warn('Error in dispose callback:', error);
            }
        });

        // Dispose child containers first
        this.childContainers.forEach(child => child.dispose());
        this.childContainers.length = 0;

        // Dispose scoped instances
        this.scopedInstances.forEach(instance => {
            if (instance && typeof instance.dispose === 'function') {
                try {
                    instance.dispose();
                } catch (error) {
                    console.warn('Error disposing scoped service:', error);
                }
            }
        });

        // Dispose singleton instances (only if this is root container)
        if (!this.parentContainer) {
            this.singletonInstances.forEach(instance => {
                if (instance && typeof instance.dispose === 'function') {
                    try {
                        instance.dispose();
                    } catch (error) {
                        console.warn('Error disposing singleton service:', error);
                    }
                }
            });
            this.singletonInstances.clear();
        }

        this.scopedInstances.clear();
        this.services.clear();
        this.modules.clear();
        this.disposeCallbacks.length = 0;

        // Remove from parent's children list
        if (this.parentContainer) {
            const index = this.parentContainer.childContainers.indexOf(this);
            if (index > -1) {
                this.parentContainer.childContainers.splice(index, 1);
            }
        }
    }
}

// Service tokens (symbols for type safety)
export const ServiceTokens = {
    Logger: Symbol('Logger'),
    DataStore: Symbol('DataStore'),
    ApiClient: Symbol('ApiClient'),
    ApiController: Symbol('ApiController'),
    Router: Symbol('Router'),
    TriggerHandler: Symbol('TriggerHandler'),
    FieldProcessor: Symbol('FieldProcessor'),
    DataObjectManager: Symbol('DataObjectManager'),
    UIObserver: Symbol('UIObserver'),
    SignalRManager: Symbol('SignalRManager'),
    AICommandProcessor: Symbol('AICommandProcessor'),
    RemoteControlUI: Symbol('RemoteControlUI'),
    NotificationManager: Symbol('NotificationManager'),
    StateManager: Symbol('StateManager'),
    ErrorBoundary: Symbol('ErrorBoundary'),
    Configuration: Symbol('Configuration')
} as const;

export type ServiceToken = typeof ServiceTokens[keyof typeof ServiceTokens];

// Interface for disposable services
export interface IDisposable {
  dispose(): void;
}

// Configuration interface that replaces global variables
export interface FrameworkConfiguration {
  logLevel: string;
  apiConfig: {
    baseUrl: string;
    timeout: number;
  };
  autoInitialize: boolean;
  signalRUrl?: string;
  openAiApiKey?: string;
  twilioConfig?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  enableRemoteControl: boolean;
  notificationConfig?: any;
  stateManagerConfig?: any;
  remoteControlConfig?: any;
}

// ========================================
// DECORATOR SUPPORT (Optional Enhanced Usage)
// ========================================

// Metadata storage for decorators (without reflect-metadata dependency)
const injectableMetadata = new WeakMap<any, InjectableMetadata>();
const injectMetadata = new WeakMap<any, Array<string | symbol>>();

export interface InjectableOptions {
  lifetime?: ServiceLifetime;
  scope?: ServiceScope;
  token?: string | symbol;
  tags?: string[];
  lazy?: boolean;
}

interface InjectableMetadata {
  lifetime: ServiceLifetime;
  scope: ServiceScope;
  token: string | symbol;
  tags: string[];
  lazy: boolean;
  constructor: any;
}

// Decorator for marking classes as injectable
export function Injectable(options: InjectableOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    injectableMetadata.set(constructor, {
      lifetime: options.lifetime || 'transient',
      scope: options.scope || 'root',
      token: options.token || constructor.name,
      tags: options.tags || [],
      lazy: options.lazy || false,
      constructor
    });
    
    return constructor;
  };
}

// Decorator for marking injection points
export function Inject(token: string | symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = injectMetadata.get(target) || [];
    existingTokens[parameterIndex] = token;
    injectMetadata.set(target, existingTokens);
  };
}

// Auto-registration helper for decorated classes
export function autoRegisterDecorated(container: ServiceContainer, classes: any[]): void {
  classes.forEach(cls => {
    const metadata = injectableMetadata.get(cls);
    if (metadata) {
      const dependencies = injectMetadata.get(cls) || [];
      
      container.register({
        token: metadata.token,
        factory: (...deps) => new cls(...deps),
        lifetime: metadata.lifetime,
        dependencies: dependencies.filter(Boolean),
        scope: metadata.scope,
        tags: metadata.tags,
        lazy: metadata.lazy
      });
    }
  });
}

// ========================================
// SERVICE MODULE BUILDERS
// ========================================

export class ServiceModuleBuilder {
  private module: ServiceModule;

  constructor(name: string) {
    this.module = {
      name,
      services: [],
      dependencies: []
    };
  }

  addSingleton<T>(
    token: string | symbol,
    factory: (...args: any[]) => T,
    dependencies?: Array<string | symbol>
  ): ServiceModuleBuilder {
    this.module.services.push({
      token,
      factory,
      lifetime: 'singleton',
      dependencies: dependencies || [],
      scope: 'module'
    });
    return this;
  }

  addTransient<T>(
    token: string | symbol,
    factory: (...args: any[]) => T,
    dependencies?: Array<string | symbol>
  ): ServiceModuleBuilder {
    this.module.services.push({
      token,
      factory,
      lifetime: 'transient',
      dependencies: dependencies || []
    });
    return this;
  }

  addScoped<T>(
    token: string | symbol,
    factory: (...args: any[]) => T,
    dependencies?: Array<string | symbol>
  ): ServiceModuleBuilder {
    this.module.services.push({
      token,
      factory,
      lifetime: 'scoped',
      dependencies: dependencies || [],
      scope: 'module'
    });
    return this;
  }

  dependsOn(...moduleNames: string[]): ServiceModuleBuilder {
    this.module.dependencies = [...(this.module.dependencies || []), ...moduleNames];
    return this;
  }

  configure(configFn: (container: ServiceContainer) => void): ServiceModuleBuilder {
    this.module.configure = configFn;
    return this;
  }

  build(): ServiceModule {
    return this.module;
  }

  static create(name: string): ServiceModuleBuilder {
    return new ServiceModuleBuilder(name);
  }
}

// ========================================
// BUILT-IN INTERCEPTORS
// ========================================

export class LoggingInterceptor<T> implements ServiceInterceptor<T> {
  constructor(private logger?: any) {}

  before(context: ResolutionContext): void {
    if (this.logger?.debug) {
      this.logger.debug(`Resolving service: ${String(context.token)} in scope: ${context.scope}`);
    }
  }

  after(instance: T, context: ResolutionContext): T {
    if (this.logger?.debug) {
      this.logger.debug(`Resolved service: ${String(context.token)}`);
    }
    return instance;
  }
}

export class PerformanceInterceptor<T> implements ServiceInterceptor<T> {
  private startTime!: number;

  before(): void {
    this.startTime = performance.now();
  }

  after(instance: T, context: ResolutionContext): T {
    const duration = performance.now() - this.startTime;
    if (duration > 10) { // Log if resolution takes more than 10ms
      console.warn(`Slow service resolution: ${String(context.token)} took ${duration.toFixed(2)}ms`);
    }
    return instance;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Create a feature module container
export function createFeatureContainer(
  name: string,
  parent: ServiceContainer,
  modules: ServiceModule[] = []
): ServiceContainer {
  const container = parent.createModuleScope(name);
  
  modules.forEach(module => {
    container.registerModule(module);
  });
  
  return container;
}

// Create a request-scoped container (useful for web requests)
export function createRequestScope(parent: ServiceContainer): ServiceContainer {
  return parent.createChildScope('request');
}

// Batch service registration
export function registerServices(
  container: ServiceContainer,
  services: Array<{
    token: string | symbol;
    implementation: any;
    lifetime?: ServiceLifetime;
    dependencies?: Array<string | symbol>;
  }>
): void {
  services.forEach(service => {
    const factory = (...deps: any[]) => new service.implementation(...deps);
    
    switch (service.lifetime || 'transient') {
      case 'singleton':
        container.registerSingleton(service.token, factory, service.dependencies);
        break;
      case 'scoped':
        container.registerScoped(service.token, factory, service.dependencies);
        break;
      default:
        container.registerTransient(service.token, factory, service.dependencies);
        break;
    }
  });
}

// ========================================
// GLOBAL CONTAINER INSTANCE (Optional)
// ========================================

let globalContainer: ServiceContainer | null = null;

export function getGlobalContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = new DIContainer();
  }
  return globalContainer;
}

export function setGlobalContainer(container: ServiceContainer): void {
  globalContainer = container;
}

export function resetGlobalContainer(): void {
  if (globalContainer) {
    globalContainer.dispose();
    globalContainer = null;
  }
}
