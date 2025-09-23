# 🌟 Annie Framework
**Enterprise-Grade TypeScript Framework for Reactive Data Binding & Real-Time Applications**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)

> *Annie is not just another JavaScript framework. It's a comprehensive enterprise solution for building data-driven applications with minimal code and maximum flexibility.*

## 🚀 What is Annie?

Annie Framework is a modern, modular TypeScript framework designed specifically for enterprise applications. Unlike React, Angular, or Vue, Annie doesn't force you into an opinionated structure. Instead, it provides powerful tools that work together seamlessly while allowing you to build applications your way.

### Note
One benefit over previous version is reduction in code. A dataset alias can be referenced using ds('dataset_name_lower_snake_Case') syntax and let code is needed to manage datasets since the API call happens automagically.

###
TODO: will need to add config options with help to know what is available.
there is a config object and there are client side elements that should only be server side to review such as: openAiKey

### 🎯 The Enterprise Problem Annie Solves

Building enterprise applications involves:
- **Dynamic Context Rendering** - Display data that changes based on user actions
- **Form Management** - Capture, validate, and submit complex data structures  
- **API Integration** - Seamless CRUD operations with server-side code
- **Real-Time Updates** - Live data synchronization across multiple users
- **State Management** - Handle complex application state with undo/redo
- **Error Handling** - Graceful error recovery and user feedback
- **Memory Management** - Prevent memory leaks in long-running applications

**Annie handles all of this out of the box.**

## 🏆 Why Choose Annie Over Other Frameworks?

### Annie vs React/Angular/Vue/Svelte

| Feature | Annie | React | Angular | Vue | Svelte |
|---------|-------|-------|---------|-----|--------|
| **Learning Curve** | ⭐ Minimal | ⭐⭐⭐ Steep | ⭐⭐⭐⭐ Very Steep | ⭐⭐ Moderate | ⭐⭐ Moderate |
| **Form Handling** | ✅ Built-in | ❌ External libs | ✅ Built-in | ❌ External libs | ⭐ Basic built-in |
| **Real-time Data** | ✅ SignalR/WebSocket | ❌ External libs | ❌ External libs | ❌ External libs | ❌ External libs |
| **Memory Management** | ✅ Automatic | ❌ Manual | ❌ Manual | ❌ Manual | ✅ Automatic |
| **API Integration** | ✅ Zero-config | ❌ Boilerplate | ❌ Boilerplate | ❌ Boilerplate | ❌ Boilerplate |
| **Enterprise Features** | ✅ Included | ❌ Build yourself | ⭐ Some included | ❌ Build yourself | ❌ Build yourself |
| **Bundle Size** | 🟢 Small | 🟡 Medium | 🔴 Large | 🟢 Small | 🟢 Very Small |

### The Annie Advantage

**Form Submission Comparison:**

**Annie (1 line):**
```html
<div data-trigger='[{"type":"xhr","form":["form1"],"query":["update-user"]}]'>
  Submit Form
</div>
```

**React (20+ lines):**
```jsx
const [formData, setFormData] = useState({});
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    // ... error handling, state management, etc.
  } catch (error) {
    // ... more boilerplate
  }
};
```

**Angular (Multiple files + 30+ lines):**
```typescript
// Component, Service, Module files...
// HTTP interceptors, error handling, forms module imports...
// We'll spare you the details 😅
```

## ✨ Core Features

### 🔄 **Reactive Data Binding**
```html
<!-- Data automatically updates when backend changes -->
<div data-observe='[{"datasource": "users", "type": "html", "field": "name"}]'></div>
<span data-observe='[{"datasource": "orders", "type": "text", "field": "total"}]'></span>

<!-- Dynamic image attributes -->
<img data-observe='[{"datasource": "persistent_data", "type": "attribute", "field": "logo", "value": "src"}]' 
     data-prepend="/assets/img/clients/dk_" />
```

### 📡 **Zero-Config API Integration**
```javascript
// Initialize datasets to load
window._datasetsinit = {
    load: ['users', 'orders', 'products'],
    remote: false,
    lazyload: ['reports']
};

// That's it! Annie handles the rest.
```

### 🎮 **Smart Form Handling**
```html
<!-- Multi-form submission -->
<div data-trigger='[{
  "type": "xhr",
  "form": ["userForm", "addressForm"], 
  "query": ["save-user-profile"]
}]'>Save Profile</div>

<!-- Nested forms, file uploads, validation - all handled automatically -->
```

### 🌐 **Real-Time Collaboration**
```javascript
// SignalR integration with mouse tracking and AI commands
const annie = new AnnieFramework({
    signalRUrl: '/hub',
    openAiApiKey: 'your-key',
    enableRemoteControl: true
});
```

### 🧠 **State Management with Undo/Redo**
```javascript
annie.updateField('users', 'name', 'John Doe');
annie.undo(); // Reverts the change
annie.redo(); // Reapplies the change
```

### 🛡️ **Error Boundaries & Recovery**
```javascript
// Automatic error recovery with user notifications
annie.getErrorBoundary().setRecoveryStrategy('retry', {
    maxAttempts: 3,
    backoffMs: 1000
});
```

## 🏗️ Architecture

### 📁 **Modular Structure**
```
src/
├── core/                    # Framework Core
│   ├── api-client.ts       # HTTP/XHR request handling
│   ├── api-controller.ts   # Request queue management  
│   ├── data-store.ts       # Reactive data storage
│   ├── router.ts           # Client-side routing
│   ├── state-manager.ts    # Undo/redo state management
│   ├── error-boundary.ts   # Error handling & recovery
│   ├── notification-manager.ts # User notifications
│   ├── signalr-manager.ts  # Real-time communication
│   └── logger.ts           # Comprehensive logging
├── ui/                     # UI Components
│   ├── observer.ts         # Data binding & DOM updates
│   ├── trigger-handler.ts  # Event handling
│   ├── ai-command-processor.ts # AI-powered commands
│   └── remote-control-ui.ts    # Remote collaboration UI
├── utils/                  # Utilities
│   ├── cleanup.ts          # Memory leak prevention
│   ├── type-guards.ts      # Runtime validation
│   └── helpers.ts          # Utility functions
└── annie.ts               # Main framework orchestrator
```

### 🔧 **Dependency Injection**
Annie uses a built-in DI container for loose coupling and easy testing:

```typescript
// All services are auto-wired
const dataStore = annie.getDataStore();
const apiController = annie.getApiController();
const stateManager = annie.getStateManager();
```

## 🚀 Quick Start

### 1. **Basic Setup**
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Annie App</title>
</head>
<body>
    <!-- Your content here -->
    
    <script type="module">
        import { AnnieFramework } from './dist/annie.esm.js';
        
        const annie = new AnnieFramework({
            apiConfig: { baseUrl: '/api' },
            logLevel: 'Info'
        });
    </script>
</body>
</html>
```

### 2. **Enterprise Setup with All Features**
```javascript
// Configure for enterprise use
window._datasetsinit = {
    load: ['users', 'permissions', 'settings'],
    lazyload: ['reports', 'analytics']
};

const annie = new AnnieFramework({
    apiConfig: { 
        baseUrl: '/api',
        timeout: 30000 
    },
    signalRUrl: '/collaborate-hub',
    openAiApiKey: process.env.OPENAI_API_KEY,
    enableRemoteControl: true,
    notificationConfig: {
        position: 'top-right',
        theme: 'modern'
    },
    stateManagerConfig: {
        maxHistorySize: 100,
        enablePersistence: true
    },
    errorBoundaryConfig: {
        enableRecovery: true,
        showErrorUI: true
    }
});
```

### 3. **Data Binding Examples**
```html
<!-- Simple data display -->
<h1 data-observe='[{"datasource": "user", "type": "text", "field": "name"}]'></h1>

<!-- Dynamic image source -->
<img data-observe='[{"datasource": "user", "type": "src", "field": "avatar"}]' />

<!-- Conditional styling -->
<div data-observe='[{
    "datasource": "order", 
    "type": "class", 
    "field": "status",
    "conditions": [
        {"value": "pending", "class": "status-pending"},
        {"value": "completed", "class": "status-complete"}
    ]
}]'>Order Status</div>

<!-- Dynamic lists -->
<ul data-observe='[{
    "datasource": "products",
    "type": "repeat",
    "template": "<li data-field=\"name\"></li>"
}]'></ul>
```

### 4. **Form Handling**
```html
<form id="userForm">
    <input name="firstName" placeholder="First Name" />
    <input name="lastName" placeholder="Last Name" />
    <input name="email" type="email" placeholder="Email" />
</form>

<div id="addressForm">
    <input name="street" placeholder="Street" />
    <input name="city" placeholder="City" />
    <input name="zipCode" placeholder="ZIP Code" />
</div>

<!-- Submit both forms in one API call; Any element can be a form -->
<button data-trigger='[{
    "type": "xhr",
    "form": ["userForm", "addressForm"],
    "query": ["save-user-profile"],
    "callback": "onProfileSaved"
}]'>Save Profile</button>
```

## 🎯 Advanced Features

### 🤖 **AI-Powered Commands**
```javascript
// Voice/text commands for complex operations
annie.getAICommandProcessor().addCommand({
    trigger: "create user report",
    action: (params) => {
        annie.loadData('generate-user-report');
        annie.navigateTo('reports');
    }
});
```

### 🔗 **Real-Time Collaboration**
```javascript
// Mouse cursor tracking and shared interactions
annie.getSignalRManager().enableMouseTracking();
annie.getRemoteControlUI().showCollaborators();
```

### 📊 **Memory Management**
```javascript
// Automatic memory leak detection
annie.startMemoryMonitoring(30000); // Check every 30 seconds

// Manual cleanup
annie.cleanupElements('.dynamic-content');
annie.resetComponent('datastore');
```

### 🎨 **Custom Notifications**
```javascript
annie.getNotificationManager().show({
    type: 'success',
    title: 'Data Saved',
    message: 'User profile updated successfully',
    actions: [
        { label: 'View Profile', action: () => annie.navigateTo('profile') }
    ]
});
```

## 🔧 Installation & Build

### NPM Installation
```bash
npm install annie-framework
```

### Development Build
```bash
# Clone repository
git clone https://github.com/pauldaly/annie.git
cd annie

# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Create UMD/ESM bundles
npm run bundle
```

### Build Outputs
- `dist/annie.esm.js` - ES Module build
- `dist/annie.umd.js` - UMD build for script tags
- `dist/types/` - TypeScript definitions

## 🎪 Examples & Demos

Check out the included demo files:
- `demo.html` - Basic data binding
- `demo-validation.html` - Form validation
- `demo-notifications.html` - Notification system
- `demo-data-attributes.html` - Advanced data attributes
- `sample-business-app.html` - Complete business application
- `sample-modern-spa.html` - Single-page application

## 🆚 Framework Comparison

### What Annie Has That Others Don't

#### ✅ **Unique Annie Features**
- **Zero-config API integration** - Works with any backend
- **Multi-form submission** - Combine multiple forms in one request
- **Automatic memory management** - No manual cleanup required
- **Built-in real-time collaboration** - SignalR integration
- **AI command processing** - Voice/text commands
- **Enterprise error boundaries** - Automatic recovery strategies
- **Undo/redo state management** - Built into the core
- **Data attribute binding** - No special syntax to learn

#### ❌ **What Annie Doesn't Have (Yet)**
- **Component Libraries** - No pre-built UI components (like Material-UI)
- **Server-Side Rendering** - Currently client-side only
- **Mobile Framework** - No React Native equivalent
- **DevTools Extension** - No browser debugging extension
- **Large Ecosystem** - Smaller community than React/Angular
- **IDE Integration** - Limited autocomplete/IntelliSense support
- **Testing Framework** - No built-in testing utilities
- **Animation Framework** - No CSS-in-JS or animation library

### When to Choose Annie

#### ✅ **Perfect For:**
- Enterprise web applications
- Data-heavy dashboards
- Real-time collaborative tools
- Form-intensive applications
- Rapid prototyping
- Teams who want minimal boilerplate

#### ❌ **Consider Alternatives For:**
- Mobile applications (use React Native)
- Static websites (use Next.js/Gatsby)
- Component-heavy UIs (use React + component library)
- Large teams needing strict structure (use Angular)
- SEO-critical sites (use server-side rendering)

## 🛣️ Roadmap

### 🔮 **Planned Features**
- **Component System** - Reusable UI components
- **SSR Support** - Server-side rendering
- **DevTools Extension** - Browser debugging tools
- **Testing Framework** - Built-in testing utilities
- **Mobile SDK** - React Native-style mobile development
- **Plugin Ecosystem** - Third-party extensions
- **Performance Monitoring** - Built-in performance metrics
- **Accessibility Tools** - WCAG compliance helpers

### 🤝 **Contributing**
We welcome contributions! Annie is built by developers who believe enterprise development should be simpler.

- **Bug Reports**: [GitHub Issues](https://github.com/pauldaly/annie/issues)
- **Feature Requests**: [Discussions](https://github.com/pauldaly/annie/discussions)
- **Pull Requests**: [Contributing Guide](CONTRIBUTING.md)

## 📞 **Support**

- **Documentation**: [Annie Docs](https://annie-framework.dev/docs)
- **Community**: [Discord Server](https://discord.gg/annie)
- **Commercial Support**: [Enterprise Plans](https://annie-framework.dev/enterprise)

## 📄 **License**

Annie Framework is [MIT licensed](LICENSE.md) - free for personal and commercial use.

---

*Built with ❤️ by developers who think enterprise development should be enjoyable, not painful.*

**[Get Started Now →](https://annie-framework.dev/quickstart)** | **[View Examples →](./demo.html)** | **[Join Community →](https://discord.gg/annie)**
