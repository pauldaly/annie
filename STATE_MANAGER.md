# Central State Manager

The Central State Manager provides a centralized, reactive state management system for the Annie Framework. It enables components to share state, subscribe to changes, and maintain application-wide consistency.

## 🎯 Features

### ✅ Core Functionality
- **Centralized State**: Single source of truth for application state
- **Reactive Updates**: Automatic notifications when state changes
- **Type Safety**: Full TypeScript support with generic types
- **Subscription System**: Components can subscribe to specific state changes
- **Event System**: Global state change events

### ✅ Advanced Features
- **Time Travel**: Navigate through state change history
- **Snapshots**: Create and restore state snapshots
- **Batch Updates**: Update multiple state values efficiently
- **Local Storage**: Optional persistence across browser sessions
- **Debug Tools**: Built-in debugging and monitoring capabilities

## 🚀 Basic Usage

### Initialize StateManager
```typescript
import { StateManager } from './core/state-manager.js';

const stateManager = new StateManager({
  enableDevTools: true,
  enableTimeTravel: true,
  enableLocalStorage: true,
  maxHistorySize: 100
});
```

### Set and Get State
```typescript
// Set state
stateManager.setState('user.name', 'John Doe');
stateManager.setState('ui.theme', 'dark');

// Get state
const userName = stateManager.getState('user.name');
const theme = stateManager.getState('ui.theme');
```

### Subscribe to Changes
```typescript
// Subscribe to specific key
const subscriptionId = stateManager.subscribeToKey('user.name', (newValue, oldValue) => {
  console.log(`User name changed from ${oldValue} to ${newValue}`);
});

// Subscribe to multiple keys
const multiSub = stateManager.subscribe((change) => {
  console.log(`${change.key} changed:`, change);
}, {
  keys: ['user.name', 'user.email']
});

// Subscribe with filter
const filteredSub = stateManager.subscribe((change) => {
  console.log('High priority change:', change);
}, {
  filter: (change) => change.source === 'high-priority'
});
```

## 🔄 Integration with Annie Framework

The StateManager is automatically integrated with the Annie Framework:

```typescript
const annie = new AnnieFramework({
  apiConfig: { baseUrl: '/api' },
  stateManagerConfig: {
    enableDevTools: true,
    enableLocalStorage: true
  }
});

// Access state manager
const stateManager = annie.getStateManager();

// DataStore changes automatically sync to state
annie.getDataStore().setDataset('users', userData);
// Automatically creates state: datastore.users
```

## 🎛️ Advanced Features

### Batch Updates
```typescript
// Update multiple values at once
stateManager.batchUpdate({
  'user.name': 'Jane Doe',
  'user.email': 'jane@example.com',
  'user.lastLogin': new Date().toISOString()
}, 'user-update');
```

### Time Travel
```typescript
// Enable time travel in config
const stateManager = new StateManager({
  enableTimeTravel: true,
  maxHistorySize: 50
});

// Go back 3 state changes
stateManager.timeTravel(3);

// Return to present
stateManager.resetToPresent();

// View history
const history = stateManager.getHistory();
```

### Snapshots
```typescript
// Create snapshot
const snapshot = stateManager.createSnapshot('before-update');

// Restore from snapshot
stateManager.restoreSnapshot(snapshot, 'snapshot-restore');
```

### Local Storage Persistence
```typescript
const stateManager = new StateManager({
  enableLocalStorage: true,
  storagePrefix: 'my-app-state'
});

// State automatically persists to localStorage
stateManager.setState('user.preferences', { theme: 'dark', lang: 'en' });
// Stored as: my-app-state-user.preferences

// State automatically loads on page refresh
```

## 🔍 Debugging

### Debug Tools
```typescript
// Enable dev tools (adds to window.__ANNIE_STATE_MANAGER__)
const stateManager = new StateManager({
  enableDevTools: true
});

// Get debug information
const debugInfo = stateManager.getDebugInfo();
console.log('State count:', debugInfo.stateCount);
console.log('Subscriptions:', debugInfo.subscriptionCount);
console.log('History size:', debugInfo.historySize);
```

### Event Monitoring
```typescript
// Subscribe to all state change events
stateManager.on('stateChanged', (change) => {
  console.log('Global state change:', change);
});
```

## 🏗️ Architecture Benefits

### 🔗 **Reactive Data Flow**
```
DataStore Changes → StateManager → Component Updates
     ↑                                      ↓
API Updates    ←  Component Actions  ←  UI Events
```

### 🎯 **Single Source of Truth**
- All application state flows through StateManager
- No conflicting state between components
- Predictable state updates and debugging

### 🔄 **Automatic Synchronization**
- DataStore changes automatically update central state
- Components can subscribe to relevant state slices
- Cross-component communication through shared state

## 📊 Real-World Example

```typescript
// Initialize Annie Framework with StateManager
const annie = new AnnieFramework({
  apiConfig: { baseUrl: '/api' },
  stateManagerConfig: {
    enableDevTools: true,
    enableLocalStorage: true,
    enableTimeTravel: true
  }
});

const stateManager = annie.getStateManager();

// Subscribe to user authentication state
stateManager.subscribeToKey('auth.user', (user) => {
  if (user) {
    document.body.setAttribute('data-authenticated', 'true');
    showDashboard();
  } else {
    document.body.setAttribute('data-authenticated', 'false');
    showLoginForm();
  }
});

// Subscribe to UI theme changes
stateManager.subscribeToKey('ui.theme', (theme) => {
  document.body.setAttribute('data-theme', theme);
});

// Handle login
async function login(credentials) {
  try {
    const user = await annie.loadData({ endpoint: '/auth/login', data: credentials });
    
    // Update central state (triggers all subscribers)
    stateManager.batchUpdate({
      'auth.user': user,
      'auth.lastLogin': new Date().toISOString(),
      'ui.notifications': [],
      'app.initialized': true
    }, 'login-success');
    
  } catch (error) {
    stateManager.setState('auth.error', error.message, 'login-error');
  }
}

// Components automatically react to state changes
stateManager.subscribeToKey('auth.error', (error) => {
  if (error) {
    showNotification('Login failed: ' + error, 'error');
  }
});
```

## 🔧 Configuration Options

```typescript
interface StateManagerConfig {
  enableDevTools?: boolean;        // Add to window for debugging
  enableTimeTravel?: boolean;      // Enable state history navigation
  maxHistorySize?: number;         // Maximum history entries (default: 100)
  enableLocalStorage?: boolean;    // Persist state to localStorage
  storagePrefix?: string;          // localStorage key prefix (default: 'annie-state')
}
```

## 🎉 Benefits Over Traditional State Management

### ✅ **Simplified API**
- No complex reducers or actions
- Direct state updates with automatic notifications
- Built-in TypeScript support

### ✅ **Framework Integration**
- Seamless integration with existing Annie Framework components
- Automatic DataStore synchronization
- Works with existing subscription patterns

### ✅ **Developer Experience**
- Time travel debugging
- Automatic persistence
- Built-in dev tools
- Real-time state monitoring

### ✅ **Performance**
- Efficient batch updates
- Selective subscriptions (only get notified of relevant changes)
- Lazy loading of state slices
- Automatic cleanup

The Central State Manager provides a powerful, yet simple solution for managing application state in the Annie Framework, making complex state management scenarios straightforward and maintainable.
