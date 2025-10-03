# Module System Usage Guide

The Annie Module System provides a hybrid approach to code organization and lazy loading, perfect for SPAs that need both performance and offline capabilities.

## Quick Start

### 1. Basic Module System Setup

```typescript
import { AnnieFramework, ModuleSystemBuilder } from './annie.js';

// Configure Annie with Module System
const annie = new AnnieFramework({
  logLevel: 'info',
  moduleSystemConfig: {
    offlineStrategy: 'hybrid',      // 'aggressive', 'lazy', 'hybrid', 'none'
    enableServiceWorker: true,      // Enable offline support
    preloadCritical: true,         // Preload critical modules
    enableHotReload: false         // Dev mode only
  }
});

// Get the module system
const moduleSystem = annie.getModuleSystem();
```

### 2. Register Modules with Different Strategies

```typescript
// Using the fluent builder API
ModuleSystemBuilder
  .create()
  .offlineStrategy('hybrid')
  .preloadCritical(true)
  
  // Critical modules - load immediately, cache aggressively
  .criticalModule('core-api', '/modules/core-api.js')
  .criticalModule('authentication', '/modules/auth.js')
  
  // Progressive modules - cache on first use, offline ready  
  .progressiveModule('user-management', '/modules/users.js', ['authentication'])
  .progressiveModule('dashboard', '/modules/dashboard.js')
  
  // Lazy modules - load when route accessed
  .lazyModule('admin-panel', '/modules/admin.js', ['/admin'])
  .lazyModule('analytics', '/modules/analytics.js', ['/reports', '/analytics'])
  
  // Network-only modules - always fetch fresh
  .registerModule({
    name: 'live-chat',
    path: '/modules/chat.js',
    loadStrategy: 'networkOnly',
    routes: ['/chat']
  })
  
  .build(annie.getContainer(), annie.getLogger());
```

### 3. Manual Module Registration

```typescript
// Register individual modules
moduleSystem.registerModule({
  name: 'user-management',
  path: '/modules/users.js',
  loadStrategy: 'progressive',
  dependencies: ['authentication'],
  routes: ['/users', '/profile'],
  priority: 2,
  cacheTimeout: 600000 // 10 minutes
});
```

## Loading Strategies Explained

### 🔴 Critical Strategy
```typescript
// Load immediately on app start, cache aggressively
moduleSystem.registerModule({
  name: 'core-api',
  loadStrategy: 'critical',
  path: '/modules/core.js'
});

// Perfect for: Authentication, Core APIs, Navigation
```

### 🟡 Progressive Strategy  
```typescript
// Cache on first use, available offline
moduleSystem.registerModule({
  name: 'dashboard',
  loadStrategy: 'progressive', 
  path: '/modules/dashboard.js'
});

// Perfect for: User settings, Dashboard components, Common features
```

### 🟢 Lazy Strategy
```typescript  
// Load only when route is accessed
moduleSystem.registerModule({
  name: 'admin-panel',
  loadStrategy: 'lazy',
  path: '/modules/admin.js',
  routes: ['/admin']
});

// Perfect for: Admin panels, Reports, Rarely used features
```

### 🔵 Network Only Strategy
```typescript
// Always fetch fresh, no caching
moduleSystem.registerModule({
  name: 'live-notifications',
  loadStrategy: 'networkOnly',
  path: '/modules/notifications.js'
});

// Perfect for: Live chat, Real-time notifications, Dynamic content
```

## Loading Modules

### Automatic Loading (Route-Based)
```typescript
// Modules load automatically when routes are accessed
router.on('/admin', async () => {
  // This automatically loads the 'admin-panel' module if registered for '/admin'
  const modules = await moduleSystem.loadModulesForRoute('/admin');
  console.log('Admin modules loaded:', modules);
});
```

### Manual Loading
```typescript
// Load specific modules programmatically
try {
  const userModule = await moduleSystem.loadModule('user-management');
  console.log('User module loaded:', userModule);
  
  // Module is now available in DI container
  const userService = annie.getContainer().resolve('userService');
} catch (error) {
  console.error('Failed to load module:', error);
}
```

### Batch Loading
```typescript
// Load multiple modules
const moduleNames = ['dashboard', 'analytics', 'user-management'];
const promises = moduleNames.map(name => moduleSystem.loadModule(name));

try {
  const modules = await Promise.all(promises);
  console.log('All modules loaded:', modules);
} catch (error) {
  console.error('Some modules failed to load:', error);
}
```

## Offline Support

### Automatic Service Worker Setup
The module system automatically registers a service worker (`annie-sw.js`) that handles:

- **Critical module caching** during app install
- **Progressive caching** as modules are first accessed
- **Offline fallbacks** when network is unavailable
- **Cache invalidation** and updates

### Manual Cache Management
```typescript
// Listen to module load events
moduleSystem.addEventListener((event) => {
  console.log(`Module ${event.name}: ${event.status}`);
  if (event.fromCache) {
    console.log('Loaded from cache (offline)');
  } else {
    console.log('Loaded from network');
  }
});

// Check module status
const status = moduleSystem.getModuleStatus();
console.log('Module status:', status);
```

## Creating Modules

### Module Structure
```typescript
// /modules/user-management.js
export default {
  name: 'user-management',
  services: [
    {
      token: 'userService',
      factory: () => new UserService(),
      lifetime: 'singleton'
    },
    {
      token: 'userValidator', 
      factory: (container) => new UserValidator(
        container.resolve('validationEngine')
      ),
      lifetime: 'scoped',
      dependencies: ['validationEngine']
    }
  ],
  dependencies: ['authentication'], // Other modules this depends on
  configure: (container) => {
    // Module-specific setup
    const userService = container.resolve('userService');
    
    // Register UI event handlers
    document.addEventListener('userLoggedIn', (event) => {
      userService.initializeUser(event.detail.user);
    });
    
    // Add navigation items
    const nav = document.querySelector('#main-nav');
    if (nav) {
      nav.innerHTML += `
        <li><a href="/users">Users</a></li>
        <li><a href="/profile">Profile</a></li>
      `;
    }
  }
};
```

### Module with Route Integration
```typescript
// /modules/admin-panel.js
export default {
  name: 'admin-panel',
  services: [
    {
      token: 'adminService',
      factory: () => new AdminService(),
      lifetime: 'singleton'
    }
  ],
  configure: (container) => {
    const router = container.resolve('router');
    const adminService = container.resolve('adminService');
    
    // Register admin routes
    router.addRoute('/admin/users', () => adminService.showUserManagement());
    router.addRoute('/admin/settings', () => adminService.showSettings());
    router.addRoute('/admin/logs', () => adminService.showLogs());
    
    // Add admin-specific styling
    document.head.appendChild(
      Object.assign(document.createElement('link'), {
        rel: 'stylesheet',
        href: '/css/admin.css'
      })
    );
  }
};
```

## Real-World Examples

### E-commerce Application
```typescript
const ecommerceModules = ModuleSystemBuilder
  .create()
  .offlineStrategy('hybrid')
  
  // Core functionality
  .criticalModule('auth', '/modules/auth.js')
  .criticalModule('cart', '/modules/cart.js') 
  .criticalModule('products', '/modules/products.js')
  
  // User features
  .progressiveModule('wishlist', '/modules/wishlist.js', ['auth'])
  .progressiveModule('orders', '/modules/orders.js', ['auth'])
  
  // Admin features (lazy loaded)
  .lazyModule('admin-products', '/modules/admin/products.js', ['/admin/products'])
  .lazyModule('admin-orders', '/modules/admin/orders.js', ['/admin/orders'])
  .lazyModule('analytics', '/modules/analytics.js', ['/admin/analytics'])
  
  // Live features (network only)
  .registerModule({
    name: 'live-inventory',
    path: '/modules/live-inventory.js',
    loadStrategy: 'networkOnly'
  })
  
  .build(container, logger);
```

### Enterprise Dashboard
```typescript
const dashboardModules = ModuleSystemBuilder
  .create()
  .offlineStrategy('aggressive') // Fully offline capable
  
  // Essential modules
  .criticalModule('core', '/modules/core.js')
  .criticalModule('auth', '/modules/auth.js')
  .criticalModule('navigation', '/modules/nav.js')
  
  // Main dashboard components
  .progressiveModule('dashboard-home', '/modules/dashboard.js', ['/dashboard'])
  .progressiveModule('user-profile', '/modules/profile.js', ['/profile'])
  
  // Feature modules (load on demand)
  .lazyModule('reports', '/modules/reports.js', ['/reports'])
  .lazyModule('admin', '/modules/admin.js', ['/admin']) 
  .lazyModule('settings', '/modules/settings.js', ['/settings'])
  .lazyModule('help', '/modules/help.js', ['/help'])
  
  .build(container, logger);

// Preload critical modules on app start  
await dashboardModules.preloadCriticalModules();
```

## Performance Benefits

### Initial Load Performance
```typescript
// Without module system: Everything loads upfront
// Bundle size: 2.5MB, Load time: 3.2s

// With module system: Only critical modules load  
// Initial bundle: 350KB, Load time: 0.8s
// Additional modules load as needed (200-400ms each)
```

### Memory Usage
```typescript
// Memory usage grows progressively as features are accessed
// Unused admin features never consume memory in regular user sessions
```

### Offline Capability
```typescript
// Hybrid strategy provides intelligent caching:
// - Critical modules: Always available offline
// - Progressive modules: Available offline after first use
// - Lazy modules: May require network, graceful degradation
// - Network-only: Disabled offline, clear user feedback
```

## Best Practices

### 1. **Module Granularity**
- Keep modules focused on single features/domains
- Avoid modules larger than 100-200KB
- Group related functionality together

### 2. **Dependency Management**
- Declare dependencies explicitly
- Avoid circular dependencies
- Keep dependency chains shallow

### 3. **Route Organization**
- Map routes logically to modules
- Use route prefixes for admin/feature areas
- Consider nested routing for complex features

### 4. **Offline Strategy Selection**
```typescript
// Choose based on your app requirements:

// 'aggressive' - Fully offline capable, larger download
// Good for: Enterprise apps, PWAs, unreliable networks

// 'hybrid' - Balance of performance and offline capability  
// Good for: Most web applications, mobile-first apps

// 'lazy' - Minimal caching, smaller footprint
// Good for: Always-online apps, bandwidth-conscious apps

// 'none' - No caching, pure lazy loading
// Good for: Development, apps with dynamic modules
```

### 5. **Error Handling**
```typescript
// Always handle module loading failures gracefully
moduleSystem.addEventListener((event) => {
  if (event.status === 'failed') {
    // Show user-friendly message
    showNotification('Some features are temporarily unavailable');
    
    // Log for debugging
    console.error('Module load failed:', event.error);
    
    // Optionally retry
    setTimeout(() => {
      moduleSystem.loadModule(event.name).catch(() => {
        // Final failure - disable feature
      });
    }, 5000);
  }
});
```

The Module System transforms Annie from a monolithic framework into a flexible, scalable platform that can grow from simple websites to complex enterprise applications while maintaining excellent performance and offline capabilities.