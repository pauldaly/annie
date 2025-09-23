/**
 * Dependency Injection Container
 * Replaces global variables and singleton patterns with proper dependency injection
 */

export type ServiceLifetime = 'singleton' | 'transient' | 'scoped';

export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (...args: any[]) => T;
  lifetime: ServiceLifetime;
  dependencies?: Array<string | symbol>;
}

export interface ServiceContainer {
  register<T>(descriptor: ServiceDescriptor<T>): void;
  registerSingleton<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void;
  registerTransient<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void;
  resolve<T>(token: string | symbol): T;
  has(token: string | symbol): boolean;
  createScope(): ServiceContainer;
}

export class DIContainer implements ServiceContainer {
    private services = new Map<string | symbol, ServiceDescriptor>();
    private singletonInstances = new Map<string | symbol, any>();
    private parentContainer?: DIContainer;

    constructor(parent?: DIContainer) {
        this.parentContainer = parent;
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
        const descriptor = this.services.get(token) || this.parentContainer?.services.get(token);
    
        if (!descriptor) {
            throw new Error(`Service '${String(token)}' is not registered`);
        }

        // For singletons, check if we already have an instance
        if (descriptor.lifetime === 'singleton') {
            const existing = this.singletonInstances.get(token) || this.parentContainer?.singletonInstances.get(token);
            if (existing) {
                return existing;
            }
        }

        // Resolve dependencies
        const deps = descriptor.dependencies || [];
        const resolvedDeps = deps.map(dep => this.resolve(dep));

        // Create instance
        const instance = descriptor.factory(...resolvedDeps);

        // Cache singleton instances
        if (descriptor.lifetime === 'singleton') {
            this.singletonInstances.set(token, instance);
        }

        return instance;
    }

    has(token: string | symbol): boolean {
        return this.services.has(token) || (this.parentContainer?.has(token) ?? false);
    }

    createScope(): ServiceContainer {
        return new DIContainer(this);
    }

    dispose(): void {
    // Dispose of services that implement IDisposable
        this.singletonInstances.forEach(instance => {
            if (instance && typeof instance.dispose === 'function') {
                try {
                    instance.dispose();
                } catch (error) {
                    console.warn('Error disposing service:', error);
                }
            }
        });

        this.singletonInstances.clear();
        this.services.clear();
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
