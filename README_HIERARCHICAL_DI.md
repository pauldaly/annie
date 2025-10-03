# 🏗️ Annie Framework - Hierarchical Dependency Injection

## 🎯 Overview

Annie's enhanced DI container provides **powerful hierarchical dependency injection** with complete backward compatibility. The system creates a **tree of service containers** where child containers inherit services from parents while allowing overrides and service isolation.

## ✨ **Key Features**

### 1. **Complete Backward Compatibility** ✅
All existing Annie code continues to work unchanged:
```typescript
// Existing code still works exactly the same
const container = new DIContainer();
container.registerSingleton('logger', () => new ConsoleLogger());
const logger = container.resolve<ILogger>('logger');
```

### 2. **Enhanced Hierarchical Structure**
```typescript
// Create parent container
const rootContainer = new DIContainer();

// Create child scopes
const moduleContainer = rootContainer.createModuleScope('user-module');
const requestContainer = moduleContainer.createChildScope('request-123');

// Services cascade down the hierarchy
rootContainer.registerSingleton('config', () => new AppConfig());
moduleContainer.registerScoped('userService', (config) => new UserService(config), ['config']);
requestContainer.registerTransient('request', () => new HttpRequest());
```

### 3. **Service Lifetimes**
- **Singleton**: One instance across entire application
- **Scoped**: One instance per container scope  
- **Transient**: New instance every time

### 4. **Advanced Resolution Features**
- Circular dependency detection
- Service interceptors (logging, performance monitoring)
- Conditional service registration
- Service tagging and metadata

## 🔧 **Enhanced API Reference**

### Core Container Methods

#### Hierarchical Container Management
```typescript
// Create child containers
createChildScope(scopeName?: string): ServiceContainer
createModuleScope(moduleName: string): ServiceContainer

// Navigate hierarchy  
getParent(): ServiceContainer | null
getRoot(): ServiceContainer
getChildren(): ServiceContainer[]
getScopeName(): string
```

#### Enhanced Registration
```typescript
// Register scoped services (new lifetime)
registerScoped<T>(token: string | symbol, factory: (...args: any[]) => T, dependencies?: Array<string | symbol>): void

// Register service modules
registerModule(module: ServiceModule): void

// Advanced registration with full options
register<T>(descriptor: ServiceDescriptor<T>): void
```

#### Advanced Resolution
```typescript
// Resolve with context
resolveWithContext<T>(token: string | symbol, context?: Partial<ResolutionContext>): T

// Resolve all implementations
resolveAll<T>(token: string | symbol): T[]

// Safe resolution (returns null if not found)
tryResolve<T>(token: string | symbol): T | null
```

#### Service Inspection
```typescript
// Get service information
getServiceInfo(token: string | symbol): ServiceInfo | null
getAllServices(): ServiceInfo[]
getServicesByTag(tag: string): ServiceInfo[]
```

### ServiceDescriptor Enhanced Options
```typescript
interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (...args: any[]) => T;
  lifetime: ServiceLifetime;
  dependencies?: Array<string | symbol>;
  
  // Enhanced properties
  scope?: ServiceScope;           // 'root' | 'module' | 'component' | 'request'
  lazy?: boolean;                 // Defer creation until first use
  condition?: () => boolean;      // Only register if condition is true
  metadata?: Record<string, any>; // Additional service metadata
  interceptors?: Array<ServiceInterceptor<T>>; // Resolution interceptors
  tags?: string[];               // Service tags for grouping
}
```

## 🚀 **Usage Examples**

### 1. **Basic Hierarchical Structure**

```typescript
// Root application container
const appContainer = new DIContainer();
appContainer.registerSingleton('config', () => new AppConfig());
appContainer.registerSingleton('logger', () => new ConsoleLogger());

// User module container
const userModule = appContainer.createModuleScope('users');
userModule.registerScoped('userService', 
  (config, logger) => new UserService(config, logger),
  ['config', 'logger']
);
userModule.registerScoped('userRepository', 
  (config) => new UserRepository(config.database),
  ['config']
);

// Request-specific container (e.g., for web requests)
function handleRequest(req: Request) {
  const requestScope = userModule.createChildScope(`request-${req.id}`);
  
  // Request-specific services
  requestScope.registerTransient('currentUser', 
    (userService) => userService.getCurrentUser(req.token),
    ['userService']
  );
  
  // Use services in request context
  const currentUser = requestScope.resolve<User>('currentUser');
  
  // Cleanup when request ends
  requestScope.dispose();
}
```

### 2. **Service Modules for Feature Organization**

```typescript
// Create reusable service modules
const userModule = ServiceModuleBuilder
  .create('user-management')
  .addSingleton('userValidator', () => new UserValidator())
  .addScoped('userService', 
    (validator, repo) => new UserService(validator, repo),
    ['userValidator', 'userRepository']
  )
  .addScoped('userRepository', 
    (config) => new UserRepository(config),
    ['config']
  )
  .dependsOn('core-module')
  .configure(container => {
    // Additional module-specific configuration
    console.log(`Configured user module in scope: ${container.getScopeName()}`);
  })
  .build();

// Register module in container
const appContainer = new DIContainer();
appContainer.registerModule(userModule);

// Create feature-specific container
const featureContainer = createFeatureContainer('admin-panel', appContainer, [
  userModule,
  adminModule,
  auditModule
]);
```

### 3. **Service Interceptors for Cross-Cutting Concerns**

```typescript
// Performance monitoring interceptor
class PerformanceInterceptor<T> implements ServiceInterceptor<T> {
  before(): void {
    console.time(`Service Resolution`);
  }
  
  after(instance: T, context?: ResolutionContext): T {
    console.timeEnd(`Service Resolution`);
    if (context) {
      console.log(`Resolved: ${String(context.token)} in ${context.scope}`);
    }
    return instance;
  }
}

// Caching interceptor
class CachingInterceptor<T> implements ServiceInterceptor<T> {
  private cache = new Map<string, T>();
  
  after(instance: T, context?: ResolutionContext): T {
    if (context?.token) {
      const cacheKey = String(context.token);
      if (!this.cache.has(cacheKey)) {
        this.cache.set(cacheKey, instance);
      }
    }
    return instance;
  }
}

// Register service with interceptors
container.register({
  token: 'expensiveService',
  factory: () => new ExpensiveService(),
  lifetime: 'singleton',
  interceptors: [
    new PerformanceInterceptor(),
    new CachingInterceptor()
  ]
});
```

### 4. **Decorator-Based Registration (Modern Approach)**

```typescript
// Mark class as injectable
@Injectable({ 
  lifetime: 'scoped', 
  tags: ['business-logic', 'user-management'] 
})
class UserService {
  constructor(
    @Inject('userRepository') private userRepo: IUserRepository,
    @Inject('logger') private logger: ILogger,
    @Inject('config') private config: IConfig
  ) {}
  
  async getUser(id: string): Promise<User> {
    this.logger.info(`Getting user ${id}`);
    return await this.userRepo.findById(id);
  }
}

@Injectable({ lifetime: 'singleton' })
class UserRepository implements IUserRepository {
  constructor(@Inject('database') private db: IDatabase) {}
  
  async findById(id: string): Promise<User> {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// Auto-register decorated classes
const container = new DIContainer();
autoRegisterDecorated(container, [UserService, UserRepository, DatabaseService]);

// Use normally
const userService = container.resolve<UserService>('UserService');
```

### 5. **Environment-Specific Service Overrides**

```typescript
// Base application container
const baseContainer = new DIContainer();
baseContainer.registerSingleton('apiClient', () => new ProductionApiClient());
baseContainer.registerSingleton('logger', () => new FileLogger());

// Test environment container
const testContainer = baseContainer.createChildScope('test');
testContainer.registerSingleton('apiClient', () => new MockApiClient());  // Override
testContainer.registerSingleton('logger', () => new ConsoleLogger());     // Override
// Inherits other services from parent

// Development environment container  
const devContainer = baseContainer.createChildScope('development');
devContainer.registerSingleton('logger', () => new DebugLogger());        // Override
devContainer.registerTransient('devTools', () => new DevTools());         // Additional service
// Inherits apiClient from parent
```

### 6. **Web Application Request Scoping**

```typescript
class WebApplication {
  private appContainer: ServiceContainer;
  
  constructor() {
    this.appContainer = new DIContainer();
    this.setupServices();
  }
  
  private setupServices() {
    // Application-level singletons
    this.appContainer.registerSingleton('config', () => new AppConfig());
    this.appContainer.registerSingleton('database', () => new Database());
    
    // Module registration
    this.appContainer.registerModule(userModule);
    this.appContainer.registerModule(orderModule);
  }
  
  async handleRequest(req: Request): Promise<Response> {
    // Create request-scoped container
    const requestContainer = createRequestScope(this.appContainer);
    
    // Register request-specific services
    requestContainer.registerTransient('httpContext', () => new HttpContext(req));
    requestContainer.registerScoped('currentUser', 
      (userService, httpContext) => userService.authenticate(httpContext.token),
      ['userService', 'httpContext']
    );
    
    try {
      // Resolve controller for this request
      const controller = requestContainer.resolve<UserController>('userController');
      const response = await controller.handleRequest(req);
      
      return response;
    } finally {
      // Cleanup request scope
      requestContainer.dispose();
    }
  }
}
```

## 🎨 **Service Scoping Patterns**

### Application Architecture with Scoped Containers

```
Root Container (App-wide singletons)
├── Configuration
├── Logger  
├── Database Connection
└── Module Containers
    ├── User Module Container
    │   ├── UserService (scoped)
    │   └── UserRepository (scoped)
    ├── Order Module Container  
    │   ├── OrderService (scoped)
    │   └── OrderRepository (scoped)
    └── Request Containers (per HTTP request)
        ├── HttpContext (transient)
        ├── CurrentUser (scoped to request)
        └── Request-specific overrides
```

### Memory and Performance Benefits

1. **Scoped Disposal**: Services automatically disposed when scope ends
2. **Service Isolation**: Different modules can't interfere with each other
3. **Override Flexibility**: Test/dev environments can override production services
4. **Lazy Loading**: Services created only when needed (with `lazy: true`)
5. **Memory Efficiency**: Request-scoped services cleaned up automatically

## 🔍 **Service Inspection and Debugging**

```typescript
// Inspect container contents
const container = new DIContainer();
// ... register services ...

// Get all registered services
const allServices = container.getAllServices();
console.log('Registered services:', allServices.map(s => s.token));

// Find services by tag
const businessServices = container.getServicesByTag('business-logic');
console.log('Business services:', businessServices);

// Get detailed service information
const userServiceInfo = container.getServiceInfo('userService');
if (userServiceInfo) {
  console.log(`${String(userServiceInfo.token)}:`);
  console.log(`  Lifetime: ${userServiceInfo.lifetime}`);
  console.log(`  Scope: ${userServiceInfo.scope}`);
  console.log(`  Dependencies: ${userServiceInfo.dependencies.map(String)}`);
  console.log(`  Is Resolved: ${userServiceInfo.isResolved}`);
}

// Navigate container hierarchy
console.log(`Current scope: ${container.getScopeName()}`);
console.log(`Parent scope: ${container.getParent()?.getScopeName()}`);
console.log(`Child scopes: ${container.getChildren().map(c => c.getScopeName())}`);
```

## 🚀 **Migration from Basic DI**

### Before (Basic DI):
```typescript
const container = new DIContainer();
container.registerSingleton('logger', () => new ConsoleLogger());
container.registerTransient('userService', 
  (logger) => new UserService(logger), 
  ['logger']
);
```

### After (Enhanced Hierarchical DI):
```typescript
// Same basic usage still works (100% backward compatible)
const container = new DIContainer();
container.registerSingleton('logger', () => new ConsoleLogger());
container.registerTransient('userService', 
  (logger) => new UserService(logger), 
  ['logger']
);

// Plus new capabilities when needed:
const moduleContainer = container.createModuleScope('users');
moduleContainer.registerScoped('userRepository', 
  (config) => new UserRepository(config),
  ['config']
);

// Enhanced resolution with error handling
const userService = container.tryResolve<UserService>('userService');
if (!userService) {
  console.error('UserService not available');
}
```

## 🔧 **Best Practices**

### 1. **Container Hierarchy Design**
- **Root Container**: App configuration, database connections, logging
- **Module Containers**: Feature-specific services (users, orders, billing)  
- **Request Containers**: Request-scoped services, user context
- **Component Containers**: UI component-specific services

### 2. **Service Lifetime Guidelines**
- **Singleton**: Configuration, database connections, caches
- **Scoped**: Business services, repositories, module-specific services
- **Transient**: Lightweight services, request handlers, temporary objects

### 3. **Dependency Management**
- Use symbols for service tokens (type-safe)
- Group related services in modules
- Use tags for service categorization
- Implement proper disposal for resources

### 4. **Performance Optimization**
- Use `lazy: true` for expensive services
- Implement performance interceptors for monitoring
- Dispose request scopes promptly
- Use `tryResolve` for optional dependencies

## 📊 **Comparison: Before vs After**

| Feature | Basic DI | Hierarchical DI |
|---------|----------|-----------------|
| **Service Registration** | ✅ Basic | ✅ Enhanced with options |
| **Service Lifetimes** | Singleton, Transient | Singleton, Transient, **Scoped** |
| **Container Hierarchy** | Single container | **Multi-level hierarchy** |
| **Service Overrides** | ❌ Not supported | ✅ **Child overrides parent** |
| **Module System** | ❌ Manual grouping | ✅ **Formal module registration** |
| **Service Inspection** | ❌ Limited | ✅ **Full inspection API** |
| **Interceptors** | ❌ Not supported | ✅ **Before/after hooks** |
| **Decorators** | ❌ Manual registration | ✅ **@Injectable/@Inject** |
| **Circular Dependencies** | ❌ Runtime errors | ✅ **Detection & reporting** |
| **Memory Management** | ❌ Manual cleanup | ✅ **Automatic scope disposal** |
| **Backward Compatibility** | N/A | ✅ **100% compatible** |

---

The Enhanced Hierarchical DI system transforms Annie from a simple service locator into a **professional-grade dependency injection framework** while maintaining complete backward compatibility with existing code.
