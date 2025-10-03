# Enhanced State Management

Annie Framework now includes a comprehensive enhanced state management system that brings **Redux-style** architecture with **Actions**, **Reducers**, **Effects**, **Selectors**, and **Entity Management** while maintaining full backward compatibility with the existing StateManager.

## 🚀 Key Features

✅ **Actions & Action Creators** - Type-safe action creation and dispatching  
✅ **Reducers** - Pure functions for state transitions  
✅ **Effects** - Side effect management with Observable streams  
✅ **Selectors** - Memoized state selection with caching  
✅ **Entity Management** - CRUD operations for normalized data  
✅ **Immutable Updates** - Built-in immutable state handling  
✅ **Observable Streams** - Real-time action and state monitoring  
✅ **Time Travel** - Action history and debugging support  
✅ **Backward Compatible** - All existing StateManager APIs work unchanged  

## Quick Start

```typescript
import { 
  createEnhancedStateManager, 
  createAction, 
  createSelector,
  createEntityAdapter 
} from './annie';

// Create enhanced state manager
const stateManager = createEnhancedStateManager(logger, {
  enableActions: true,
  enableEffects: true,
  enableSelectors: true,
  enableEntities: true,
  strictMode: false
});

// Define actions
const increment = createAction<number>('INCREMENT');
const decrement = createAction('DECREMENT');

// Register reducer
stateManager.registerReducer('counter', (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return state + (action.payload || 1);
    case 'DECREMENT':
      return state - 1;
    default:
      return state;
  }
});

// Dispatch actions
stateManager.dispatch(increment(5));    // counter: 5
stateManager.dispatch(decrement());     // counter: 4

// Use selectors
const doubleCounter = createSelector(
  (state) => state.counter * 2
);
stateManager.registerSelector('double', doubleCounter);
const result = stateManager.select('double'); // 8
```

## Configuration Options

```typescript
interface EnhancedStateManagerConfig extends StateManagerConfig {
  enableActions?: boolean;        // Enable action/reducer system
  enableEffects?: boolean;        // Enable side effects
  enableSelectors?: boolean;      // Enable memoized selectors
  enableEntities?: boolean;       // Enable entity management
  strictMode?: boolean;           // Enforce immutable updates
  enableActionLogging?: boolean;  // Log all dispatched actions
  maxEffectsHistory?: number;     // Action history size
}
```

## Actions & Action Creators

### Basic Actions

```typescript
// Create action creators
const increment = createAction<number>('INCREMENT');
const setUser = createAction<{id: string, name: string}>('SET_USER');

// Dispatch actions
stateManager.dispatch(increment(5));
stateManager.dispatch(setUser({ id: '123', name: 'John' }));
```

### Action Groups

```typescript
// Create related actions together
const counterActions = createActionGroup('Counter', {
  increment: undefined,
  decrement: undefined,
  reset: undefined,
  setValue: undefined
});

// Results in:
// counterActions.increment.type === '[Counter] increment'
// counterActions.decrement.type === '[Counter] decrement'
// etc.

stateManager.dispatch(counterActions.increment());
stateManager.dispatch(counterActions.setValue(42));
```

### Action Metadata

Actions automatically include metadata:

```typescript
const action = increment(5);
// {
//   type: 'INCREMENT',
//   payload: 5,
//   meta: {
//     timestamp: 1696234567890
//   }
// }
```

## Reducers

Reducers are pure functions that specify how state changes in response to actions:

```typescript
// Basic reducer
const counterReducer = (state: number = 0, action: Action) => {
  switch (action.type) {
    case 'INCREMENT':
      return state + (action.payload || 1);
    case 'DECREMENT':
      return state - 1;
    case 'RESET':
      return 0;
    default:
      return state;
  }
};

stateManager.registerReducer('counter', counterReducer);
```

### Multiple Reducers

```typescript
// User reducer
const userReducer = (state: User | null = null, action: Action) => {
  switch (action.type) {
    case 'SET_USER':
      return action.payload;
    case 'CLEAR_USER':
      return null;
    default:
      return state;
  }
};

// Todo list reducer
const todosReducer = (state: Todo[] = [], action: Action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return [...state, action.payload];
    case 'REMOVE_TODO':
      return state.filter(todo => todo.id !== action.payload);
    default:
      return state;
  }
};

stateManager.registerReducer('user', userReducer);
stateManager.registerReducer('todos', todosReducer);
```

## Selectors & Memoization

Selectors efficiently derive data from state with automatic memoization:

```typescript
// Basic selector
const getTodoCount = createSelector(
  (state) => state.todos?.length || 0
);

// Complex selector with dependencies
const getCompletedTodos = createSelector(
  (state) => state.todos?.filter(todo => todo.completed) || []
);

const getTodoStats = createSelector(
  (state) => {
    const todos = state.todos || [];
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length
    };
  },
  { memoize: true, maxCacheSize: 50 }
);

// Register and use selectors
stateManager.registerSelector('todoCount', getTodoCount);
stateManager.registerSelector('todoStats', getTodoStats);

const count = stateManager.select('todoCount');
const stats = stateManager.select('todoStats');

// Or use inline selectors
const doubleCounter = stateManager.select(state => state.counter * 2);
```

### Selector Performance

Memoized selectors cache results and only recompute when dependencies change:

```typescript
// This expensive selector will only run when state.items changes
const expensiveCalculation = createSelector(
  (state) => {
    // Expensive computation
    return state.items.reduce((sum, item) => {
      return sum + complexCalculation(item);
    }, 0);
  },
  { memoize: true }
);
```

## Effects (Side Effects)

Effects handle asynchronous operations and side effects:

```typescript
import { Observable } from './observable';

// Async effect example
const asyncDataEffect = (effects) => {
  return effects.action$.map(action => {
    if (action.type === 'FETCH_USER') {
      // Trigger async operation
      fetchUserFromAPI(action.payload.userId)
        .then(user => {
          effects.dispatch(setUser(user));
        })
        .catch(error => {
          effects.dispatch(setError(error.message));
        });
    }
    return null; // No immediate action to dispatch
  }).filter(action => action !== null);
};

// Register effect
const unregister = stateManager.registerEffect(asyncDataEffect);

// Trigger async operation
stateManager.dispatch(fetchUser({ userId: '123' }));
```

### Effect Context

Effects receive a context object with:

```typescript
interface Effect {
  action$: Observable<Action>;     // Stream of all actions
  state$: Observable<any>;         // Stream of state changes  
  dispatch: (action: Action) => void; // Dispatch function
}
```

### Complex Effects

```typescript
// Auto-save effect
const autoSaveEffect = (effects) => {
  return effects.state$
    .debounceTime(1000)  // Wait 1 second after last change
    .map(state => {
      // Save to localStorage or API
      saveToStorage(state);
      return saveSuccess();
    });
};

// Notification effect
const notificationEffect = (effects) => {
  return effects.action$.map(action => {
    if (action.type === 'SHOW_NOTIFICATION') {
      setTimeout(() => {
        effects.dispatch(hideNotification());
      }, 3000);
    }
    return null;
  }).filter(Boolean);
};
```

## Entity Management

Manage normalized data with powerful entity adapters:

```typescript
// Define entity interface
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created: number;
}

// Create entity adapter
const todoAdapter = createEntityAdapter<Todo>({
  selectId: (todo) => todo.id,
  sortComparer: (a, b) => a.created - b.created
});

// Entity reducer using adapter
const todosReducer = (state = { ids: [], entities: {} }, action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return todoAdapter.addOne(state, {
        id: Date.now(),
        title: action.payload,
        completed: false,
        created: Date.now()
      });
      
    case 'UPDATE_TODO':
      return todoAdapter.updateOne(state, {
        id: action.payload.id,
        changes: action.payload.changes
      });
      
    case 'REMOVE_TODO':
      return todoAdapter.removeOne(state, action.payload);
      
    case 'TOGGLE_TODO':
      const todo = state.entities[action.payload];
      return todoAdapter.updateOne(state, {
        id: action.payload,
        changes: { completed: !todo?.completed }
      });
      
    default:
      return state;
  }
};

stateManager.registerReducer('todos', todosReducer);
```

### Entity Adapter Methods

```typescript
// Adding entities
todoAdapter.addOne(state, entity);
todoAdapter.addMany(state, [entity1, entity2]);
todoAdapter.setAll(state, allEntities);

// Updating entities  
todoAdapter.updateOne(state, { id, changes });
todoAdapter.updateMany(state, [{ id, changes }, ...]);
todoAdapter.upsertOne(state, entity); // Add or update
todoAdapter.upsertMany(state, entities);

// Removing entities
todoAdapter.removeOne(state, id);
todoAdapter.removeMany(state, [id1, id2]);
todoAdapter.removeAll(state);

// Selecting entities
const allTodos = todoAdapter.selectAll(entityState);
const todoIds = todoAdapter.selectIds(entityState);
const todoEntities = todoAdapter.selectEntities(entityState);
const todo = todoAdapter.selectById(entityState, id);
const count = todoAdapter.selectTotal(entityState);
```

### Entity Selectors

```typescript
// Create selectors for entity state
const selectAllTodos = createSelector(
  (state) => todoAdapter.selectAll(state.todos)
);

const selectCompletedTodos = createSelector(
  (state) => {
    const todos = todoAdapter.selectAll(state.todos);
    return todos.filter(todo => todo.completed);
  }
);

const selectTodoById = (id: number) => createSelector(
  (state) => todoAdapter.selectById(state.todos, id)
);
```

## Immutable Updates

Built-in support for immutable state updates:

```typescript
// Manual immutable update
stateManager.updateState('user', (draft) => {
  draft.name = 'Updated Name';
  draft.settings.theme = 'dark';
  // Mutations are applied immutably
});

// Batch immutable updates
stateManager.batchUpdateImmutable({
  counter: (draft) => draft + 1,
  user: (draft) => {
    draft.lastLogin = Date.now();
  },
  settings: (draft) => {
    draft.notifications = !draft.notifications;
  }
});
```

### Strict Mode

Enable strict mode to enforce immutable updates:

```typescript
const stateManager = createEnhancedStateManager(logger, {
  strictMode: true // Throws errors on mutable updates
});
```

## Observable Streams

Monitor actions and state changes in real-time:

```typescript
// Subscribe to all actions
stateManager.actions.subscribe({
  next: (action) => {
    console.log('Action dispatched:', action);
  },
  error: (err) => console.error('Action stream error:', err),
  complete: () => console.log('Action stream completed')
});

// Subscribe to state changes
stateManager.stateStream.subscribe({
  next: (state) => {
    console.log('State updated:', state);
    updateUI(state);
  },
  error: (err) => console.error('State stream error:', err),
  complete: () => console.log('State stream completed')
});

// Filter specific actions
stateManager.actions
  .filter(action => action.type.startsWith('USER_'))
  .subscribe(userAction => {
    console.log('User action:', userAction);
  });
```

## Time Travel & Debugging

Access action history for debugging and time travel:

```typescript
// Get action history
const history = stateManager.getActionHistory();
console.log(`${history.length} actions in history`);

// Log recent actions
history.slice(-5).forEach((action, index) => {
  console.log(`${index}: ${action.type} at ${new Date(action.meta.timestamp)}`);
});

// Get registered components
console.log('Reducers:', stateManager.getRegisteredReducers());
console.log('Selectors:', stateManager.getRegisteredSelectors());
```

## Practical Examples

### E-commerce Cart

```typescript
// Actions
const cartActions = createActionGroup('Cart', {
  addItem: undefined,
  removeItem: undefined,
  updateQuantity: undefined,
  clearCart: undefined,
  applyCoupon: undefined
});

// Cart entity adapter
const cartAdapter = createEntityAdapter({
  selectId: (item) => `${item.productId}-${item.variantId}`,
  sortComparer: (a, b) => a.addedAt - b.addedAt
});

// Cart reducer
const cartReducer = (state = { ids: [], entities: {} }, action) => {
  switch (action.type) {
    case '[Cart] addItem':
      return cartAdapter.upsertOne(state, {
        ...action.payload,
        addedAt: Date.now()
      });
      
    case '[Cart] updateQuantity':
      return cartAdapter.updateOne(state, {
        id: action.payload.itemId,
        changes: { quantity: action.payload.quantity }
      });
      
    case '[Cart] removeItem':
      return cartAdapter.removeOne(state, action.payload);
      
    case '[Cart] clearCart':
      return cartAdapter.removeAll(state);
      
    default:
      return state;
  }
};

// Cart selectors
const selectCartItems = createSelector(
  (state) => cartAdapter.selectAll(state.cart)
);

const selectCartTotal = createSelector(
  (state) => {
    const items = cartAdapter.selectAll(state.cart);
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
);

const selectCartItemCount = createSelector(
  (state) => cartAdapter.selectTotal(state.cart)
);

// Usage
stateManager.registerReducer('cart', cartReducer);
stateManager.registerSelector('cartItems', selectCartItems);
stateManager.registerSelector('cartTotal', selectCartTotal);
stateManager.registerSelector('cartItemCount', selectCartItemCount);

// Add items to cart
stateManager.dispatch(cartActions.addItem({
  productId: 'prod-123',
  variantId: 'var-456', 
  name: 'Wireless Headphones',
  price: 99.99,
  quantity: 1
}));

// Get cart info
const total = stateManager.select('cartTotal');
const itemCount = stateManager.select('cartItemCount');
```

### Real-time Notifications

```typescript
// Notification actions
const notificationActions = createActionGroup('Notification', {
  show: undefined,
  hide: undefined,
  clear: undefined
});

// Notification effect for auto-hide
const notificationEffect = (effects) => {
  return effects.action$.map(action => {
    if (action.type === '[Notification] show' && action.payload.autoHide) {
      setTimeout(() => {
        effects.dispatch(notificationActions.hide(action.payload.id));
      }, action.payload.duration || 3000);
    }
    return null;
  }).filter(Boolean);
};

// Register effect
stateManager.registerEffect(notificationEffect);

// Show notification
stateManager.dispatch(notificationActions.show({
  id: 'notif-1',
  message: 'Item added to cart!',
  type: 'success',
  autoHide: true,
  duration: 2000
}));
```

### Async Data Loading

```typescript
// Data loading actions
const dataActions = createActionGroup('Data', {
  loadStart: undefined,
  loadSuccess: undefined,
  loadError: undefined
});

// Loading effect
const loadingEffect = (effects) => {
  return effects.action$.mergeMap(action => {
    if (action.type === '[Data] loadStart') {
      return fetch(`/api/data/${action.payload.endpoint}`)
        .then(response => response.json())
        .then(data => dataActions.loadSuccess({ 
          endpoint: action.payload.endpoint, 
          data 
        }))
        .catch(error => dataActions.loadError({ 
          endpoint: action.payload.endpoint, 
          error: error.message 
        }));
    }
    return [];
  });
};

// Loading state reducer
const loadingReducer = (state = {}, action) => {
  switch (action.type) {
    case '[Data] loadStart':
      return { ...state, [action.payload.endpoint]: true };
    case '[Data] loadSuccess':
    case '[Data] loadError':
      return { ...state, [action.payload.endpoint]: false };
    default:
      return state;
  }
};
```

## Migration Guide

The enhanced state management is fully backward compatible. Existing code continues to work unchanged:

```typescript
// ✅ Existing StateManager code still works
const stateManager = createEnhancedStateManager(logger);

// All original methods work unchanged
stateManager.setState('key', 'value');
stateManager.getState('key');
stateManager.subscribe(callback);
stateManager.batchUpdate({ key1: 'value1', key2: 'value2' });

// ✅ Gradually adopt new features
stateManager.registerReducer('counter', counterReducer);
stateManager.dispatch(increment(5));
```

## Performance Considerations

- **Memoized Selectors**: Automatically cache results until dependencies change
- **Structural Sharing**: Immutable updates only change what's necessary
- **Action Batching**: Multiple actions can be batched for performance
- **Lazy Effects**: Effects are only active when registered
- **Efficient Entities**: Entity adapters use normalized storage for O(1) lookups

## Best Practices

1. **Use Action Creators**: Always use `createAction()` for type safety
2. **Keep Reducers Pure**: No side effects in reducers
3. **Normalize Entity Data**: Use entity adapters for collections
4. **Memoize Selectors**: Use `createSelector()` for expensive computations
5. **Handle Async in Effects**: Keep all async operations in effects
6. **Batch Related Updates**: Use `batchUpdate()` for multiple state changes
7. **Enable Strict Mode**: Use in development to catch mutable updates

---

*This completes Task #5 from the Annie Framework roadmap: Enhanced State Management with Actions, Effects, Selectors, and Entity Management.*