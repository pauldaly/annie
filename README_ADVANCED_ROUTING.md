# 🚀 Annie Advanced Routing System

**Annie's Advanced Routing** brings enterprise-grade navigation capabilities to the framework while maintaining its AI-first, declarative philosophy. This system enhances the existing basic routing with powerful features like route parameters, nested routes, lazy loading, and navigation lifecycle hooks.

## 🎯 **Key Features**

### ✅ **Route Parameters**
Handle dynamic URLs with automatic parameter parsing and type conversion.

```html
<!-- Route with parameters -->
<a data-annie-route='{"path": "/user/:id"}'
   data-annie-params='{"id": "number"}'
   data-annie-on-enter="handleUserNavigation">
   User Profile
</a>

<!-- View with path mapping -->
<view id="user" data-annie-path="/user/:id">
  <h2>User Profile</h2>
  <p>User ID: <span data-annie-bind="current-route-params.0.id">Loading...</span></p>
</view>
```

### ✅ **Nested Routing**
Create hierarchical navigation structures with parent-child relationships.

```html
<!-- Parent route with nested container -->
<view id="dashboard">
  <h2>Dashboard</h2>
  
  <!-- Nested route navigation -->
  <div data-annie-nested-routes>
    <button data-annie-subroute="/stats" data-annie-lazy="stats-widget">Stats</button>
    <button data-annie-subroute="/reports" data-annie-lazy="reports-widget">Reports</button>
  </div>
  
  <!-- Nested route views -->
  <div data-annie-subroute-view="/stats" style="display: none;">
    <h3>Statistics Dashboard</h3>
  </div>
  
  <div data-annie-subroute-view="/reports" style="display: none;">
    <h3>Reports Dashboard</h3>
  </div>
</view>
```

### ✅ **Lazy Loading**
Load JavaScript modules on-demand with configurable preloading strategies.

```html
<!-- Lazy loading with different strategies -->
<a data-annie-route='{"target": "analytics"}'
   data-annie-lazy="analytics-bundle"
   data-annie-preload="hover">
   Analytics (preload on hover)
</a>

<a data-annie-route='{"target": "admin"}'
   data-annie-lazy='{"module": "admin-module", "timeout": 10000, "retry": 3}'
   data-annie-preload="visible">
   Admin Panel (preload when visible)
</a>
```

**Preload Strategies:**
- `none` - Load only when route is accessed
- `hover` - Preload when user hovers over route link
- `visible` - Preload when route link becomes visible
- `immediate` - Preload immediately on page load

### ✅ **Navigation Events & Lifecycle Hooks**
Add custom logic to navigation with lifecycle hooks.

```html
<a data-annie-route='{"target": "checkout"}'
   data-annie-on-enter="analytics.trackCheckout, form.validateCart"
   data-annie-on-leave="cart.saveProgress"
   data-annie-on-params="handleParamChange">
   Checkout
</a>
```

**Available Hooks:**
- `onEnter` - Called when navigating to a route
- `onLeave` - Called when leaving a route  
- `onParams` - Called when route parameters change
- `beforeNavigate` - Called before navigation (can cancel)
- `afterNavigate` - Called after navigation completes

### ✅ **Query Parameters**
Handle URL query strings with automatic parsing and state management.

```html
<a data-annie-route='{"target": "search"}'
   data-annie-query='{"q": "annie", "category": "framework", "sort": "name"}'
   data-annie-history="push">
   Search Results
</a>
```

### ✅ **History Management**
Full browser history integration with push/replace state management.

```html
<!-- Different history modes -->
<a data-annie-history="push">Push to History</a>
<a data-annie-history="replace">Replace History</a>
<a data-annie-history="none">No History Change</a>
```

## 🔧 **Configuration**

### **Enable Advanced Routing**

```javascript
// Initialize Annie with advanced routing
const annie = new AnnieFramework({
  apiConfig: { baseUrl: '/api' },
  autoInitialize: true,
  enableAdvancedRouting: true  // Enable advanced routing features
});
```

### **Route Configuration Options**

```typescript
interface AdvancedRouteConfig {
  // Basic routing (existing)
  target?: string | RouteCondition[];
  
  // Advanced features
  path?: string;                    // URL path with parameters: "/user/:id"
  params?: { [key: string]: RouteParamType };  // Parameter type definitions
  query?: { [key: string]: any };   // Default query parameters
  lazy?: string | LazyLoadConfig;   // Lazy loading configuration
  preload?: PreloadStrategy;        // When to preload lazy content
  nested?: boolean;                 // Supports nested child routes
  history?: HistoryMode;            // History API behavior
  state?: any;                      // Route state data
  
  // Lifecycle hooks
  onEnter?: string | string[];      // Functions to call on route enter
  onLeave?: string | string[];      // Functions to call on route leave
  onParams?: string;                // Function to call when params change
}
```

## 🎨 **Data Attribute API**

### **Basic Attributes**
```html
<!-- Traditional routing (still supported) -->
<a data-route='{"target": "home"}'>Home</a>

<!-- Enhanced routing -->
<a data-annie-route='{"target": "dashboard"}'>Dashboard</a>
```

### **Path-Based Routing**
```html
<a data-annie-path="/product/:id/review/:reviewId"
   data-annie-params='{"id": "number", "reviewId": "string"}'>
   Product Review
</a>
```

### **Lazy Loading**
```html
<!-- Simple lazy loading -->
<a data-annie-lazy="user-module">User Module</a>

<!-- Advanced lazy loading -->
<a data-annie-lazy='{"module": "analytics", "timeout": 5000, "retry": 2, "fallback": "<div>Loading...</div>"}'>
   Analytics
</a>
```

### **Preloading**
```html
<a data-annie-preload="none">Load on Click</a>
<a data-annie-preload="hover">Load on Hover</a>
<a data-annie-preload="visible">Load When Visible</a>
<a data-annie-preload="immediate">Load Immediately</a>
```

### **Navigation Events**
```html
<a data-annie-on-enter="handleEnter">
<a data-annie-on-leave="handleLeave">
<a data-annie-on-params="handleParamChange">
```

### **History & State**
```html
<a data-annie-history="push">
<a data-annie-history="replace">
<a data-annie-history="none">
<a data-annie-state='{"context": "navigation"}'>
```

## 💻 **Programmatic API**

### **Basic Navigation**
```javascript
// Enhanced navigateTo (uses advanced router if enabled)
annie.navigateTo('dashboard');

// Navigate with parameters
annie.navigateWithParams('user', {
  params: { id: 123 },
  query: { tab: 'profile' },
  state: { fromSearch: true },
  history: 'push'
});

// Path-based navigation
annie.navigateToPath('/product/456/reviews', {
  query: { sort: 'date' },
  history: 'push'
});
```

### **Router Access**
```javascript
// Get advanced router instance
const router = annie.getAdvancedRouter();

// Get current route info
const current = router.getCurrentRoute();
console.log('Current path:', current.path);
console.log('Parameters:', current.params);
console.log('Query:', current.query);

// Get navigation history
const history = router.getHistory();
console.log('Visited routes:', history.length);

// Add navigation event listener
router.addEventListener('navigation', (event) => {
  console.log('Navigation event:', event);
});
```

### **Route Information**
```javascript
// Route parameters available in data store
const params = annie.dataset('current-route-params');
console.log('User ID:', params[0].id);

// Query parameters
const query = annie.dataset('current-route-query');
console.log('Search term:', query[0].q);

// Route state
const state = annie.dataset('current-route-state');
console.log('Navigation context:', state[0]);
```

## 🏗️ **Architecture & Implementation**

### **Core Components**

1. **AdvancedRouter** - Main routing engine with enterprise features
2. **RouteParams** - Parameter parsing and type conversion
3. **QueryParams** - Query string handling
4. **LazyLoader** - Module loading with retry logic
5. **Navigation Events** - Lifecycle management

### **Integration with Existing Router**

The Advanced Router enhances rather than replaces the existing basic router:

```typescript
// Annie automatically uses advanced router when available
public navigateTo(view: string): void {
  if (this.advancedRouter) {
    this.advancedRouter.navigateTo(view);
  } else {
    this.router.navigateTo(view);  // Fallback to basic router
  }
}
```

### **Data Attribute Categories**

Advanced routing uses Annie's standardized data attribute system:

```typescript
// Framework identification
data-annie-component="advanced-route"
data-annie-framework="advanced-route-container"

// Functional roles  
data-annie-role="route-enabled"
data-annie-role="route-active"

// State management
data-annie-state-route-state="enabled"
data-annie-state-loading-state="active"

// Configuration data
data-annie-data-route-params='{"id": 123}'
data-annie-data-last-activated="1640995200000"
```

## 🎯 **Use Cases**

### **E-Commerce Application**
```html
<!-- Product catalog with categories -->
<a data-annie-path="/products/:category"
   data-annie-params='{"category": "string"}'
   data-annie-lazy="product-catalog">
   Browse Products
</a>

<!-- Individual product page -->
<a data-annie-path="/product/:id"
   data-annie-params='{"id": "number"}'
   data-annie-on-enter="analytics.trackProduct">
   Product Details
</a>

<!-- Checkout flow with validation -->
<a data-annie-path="/checkout/:step"
   data-annie-on-enter="validateCheckoutStep"
   data-annie-on-leave="saveCheckoutProgress">
   Checkout
</a>
```

### **Dashboard Application**
```html
<!-- Dashboard with nested views -->
<view id="dashboard">
  <div data-annie-nested-routes>
    <a data-annie-subroute="/overview" data-annie-preload="immediate">Overview</a>
    <a data-annie-subroute="/analytics" data-annie-lazy="analytics-module">Analytics</a>
    <a data-annie-subroute="/reports" data-annie-lazy="reports-module">Reports</a>
  </div>
</view>
```

### **User Management**
```html
<!-- User list with search -->
<a data-annie-path="/users"
   data-annie-query='{"page": 1, "limit": 20}'
   data-annie-lazy="user-list">
   All Users
</a>

<!-- User profile with tabs -->
<a data-annie-path="/user/:id/:tab"
   data-annie-params='{"id": "number", "tab": "string"}'
   data-annie-on-params="handleTabChange">
   User Profile
</a>
```

## 🚀 **Performance Benefits**

### **Bundle Optimization**
- **Lazy Loading**: Load modules only when needed
- **Preloading**: Smart preloading reduces perceived load times
- **Module Splitting**: Automatic code splitting for large applications

### **Memory Management**
- **Route Cleanup**: Automatic cleanup of route subscriptions
- **Event Management**: Proper event listener management
- **State Cleanup**: Route state cleanup on navigation

### **Caching**
- **Module Cache**: Loaded modules are cached for subsequent visits
- **Route Cache**: Route information is cached for performance
- **Preload Cache**: Preloaded modules are available instantly

## 🔍 **Debugging & Development**

### **Route Information**
```javascript
// Debug current route
console.log('Current route:', annie.getAdvancedRouter().getCurrentRoute());

// Debug navigation history
console.log('Route history:', annie.getAdvancedRouter().getHistory());

// Debug route parameters
console.log('Route params:', annie.dataset('current-route-params'));
console.log('Query params:', annie.dataset('current-route-query'));
```

### **Event Debugging**
```javascript
// Listen to all navigation events
const router = annie.getAdvancedRouter();
router.addEventListener('beforeNavigate', (event) => {
  console.log('Before navigate:', event);
});

router.addEventListener('afterNavigate', (event) => {
  console.log('After navigate:', event);
});
```

### **Performance Monitoring**
```javascript
// Monitor lazy loading performance
window.addEventListener('annie:module-loaded', (event) => {
  console.log('Module loaded:', event.detail.module, 'in', event.detail.loadTime, 'ms');
});
```

## 🎨 **CSS & Styling**

### **Route State Classes**
Advanced routing automatically applies CSS classes based on route state:

```css
/* Active route styling */
[data-annie-role="route-active"] {
  background: #007bff;
  color: white;
}

/* Loading state */
[data-annie-state-loading-state="active"] {
  opacity: 0.7;
  pointer-events: none;
}

/* Route animations */
view {
  transition: opacity 0.3s ease-in-out;
}

view:not(.active) {
  opacity: 0;
  transform: translateY(20px);
}

view.active {
  opacity: 1;
  transform: translateY(0);
}
```

## 📊 **Comparison: Basic vs Advanced Routing**

| Feature | Basic Router | Advanced Router |
|---------|-------------|-----------------|
| Route Parameters | ❌ | ✅ `/user/:id` |
| Nested Routes | ❌ | ✅ Hierarchical |
| Lazy Loading | ❌ | ✅ With strategies |
| Query Parameters | ❌ | ✅ Automatic parsing |
| History Management | ❌ | ✅ Push/Replace |
| Navigation Events | ❌ | ✅ Full lifecycle |
| Type Safety | ❌ | ✅ Parameter types |
| Performance Optimization | ❌ | ✅ Preloading |
| Bundle Size | Small | Larger (+~15KB) |
| Complexity | Simple | Enterprise-grade |

## 🎯 **Migration Guide**

### **From Basic to Advanced Routing**

1. **Enable Advanced Routing**:
```javascript
const annie = new AnnieFramework({
  // ... existing config
  enableAdvancedRouting: true
});
```

2. **Update Route Attributes** (Optional):
```html
<!-- Before (still works) -->
<a data-route='{"target": "home"}'>Home</a>

<!-- After (enhanced) -->
<a data-annie-route='{"target": "home"}'>Home</a>
```

3. **Add Advanced Features**:
```html
<!-- Add parameters -->
<a data-annie-path="/user/:id" data-annie-params='{"id": "number"}'>User</a>

<!-- Add lazy loading -->
<a data-annie-lazy="user-module" data-annie-preload="hover">Users</a>

<!-- Add lifecycle hooks -->
<a data-annie-on-enter="analytics.track">Tracked Route</a>
```

## 🏆 **Best Practices**

### **Route Design**
- Use semantic URL structures: `/products/electronics/phones`
- Keep parameter names consistent: `id`, `slug`, `category`
- Use appropriate parameter types: `number` for IDs, `string` for slugs

### **Lazy Loading**
- Lazy load large modules (analytics, admin panels)
- Use preload strategies appropriately:
  - `hover` for main navigation
  - `visible` for secondary content
  - `immediate` for critical paths

### **Navigation Events**
- Keep lifecycle functions lightweight
- Use analytics events for tracking
- Implement proper error handling

### **Performance**
- Preload critical routes
- Cache route parameters in data store
- Clean up event listeners properly

## 🚀 **Roadmap Completion**

**Advanced Routing (Item #3) - ✅ COMPLETED**

This implementation completes Item #3 of Annie's roadmap, bringing the framework to **11/15 items complete (73% Angular parity)**. The advanced routing system provides:

✅ **Nested routes, guards, lazy loading, navigation events** - All delivered  
✅ **AI-First Design** - Declarative data attributes  
✅ **Enterprise-Ready** - Performance optimization and error handling  
✅ **Backward Compatible** - Works alongside existing basic router  

**Next Items**: CLI & Tooling (#13), SSR & AOT (#14), Ecosystem (#15)

---

*Annie's Advanced Routing: Enterprise navigation with AI-friendly simplicity* 🎯🚀