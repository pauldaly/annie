# Annie Component System - Visual Builder Integration

## Overview

Annie's component system is designed for **non-developers** using visual builders. Components are created visually, stored as JSON, served by BoltAPI, and processed by Annie with minimal code.

## Component Flow

1. **Visual Builder**: User drags/drops to create component
2. **BoltAPI**: Stores component as JSON definition  
3. **HTML Generation**: BoltAPI outputs `data-annie-component` attributes
4. **Annie Processing**: Loads JSON, renders component, handles lifecycle

## What BoltAPI Should Provide

### 1. Component JSON Format
```json
{
  "id": "user-card",
  "name": "User Card",
  "version": "1.0.0",
  "template": `
    <div class="user-card" data-annie-ref="root">
      <img data-annie-bind="user.avatar" alt="Avatar" />
      <h3 data-annie-bind="user.name">{{user.name}}</h3>
      <p data-annie-bind="user.email">{{user.email}}</p>
      <button data-annie-event="click:onContact">Contact</button>
      <slot name="actions"></slot>
    </div>
  `,
  "properties": {
    "user": {
      "type": "object",
      "required": true,
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "avatar": { "type": "string" }
      }
    }
  },
  "events": {
    "onContact": {
      "description": "Fired when contact button is clicked",
      "parameters": ["user"]
    }
  },
  "styles": {
    "css": ".user-card { border: 1px solid #ccc; padding: 1rem; }",
    "scoped": true
  }
}
```

### 2. BoltAPI Endpoints
```
GET /api/components/{id}           - Get component definition
GET /api/components/library        - List all available components
POST /api/components               - Save new component (from visual builder)
PUT /api/components/{id}           - Update component
```

### 3. HTML Output from BoltAPI
```html
<!-- BoltAPI generates this from visual builder -->
<div data-annie-component="user-card" 
     data-user='{"name":"John Doe","email":"john@example.com","avatar":"avatar.jpg"}'
     data-on-contact="handleUserContact">
  <!-- Optional slot content -->
  <div slot="actions">
    <button>Edit</button>
    <button>Delete</button>
  </div>
</div>
```

## What Annie Provides

### 1. Component Processor
```typescript
class ComponentSystem {
  // Auto-scan for data-annie-component attributes
  initialize() {
    document.querySelectorAll('[data-annie-component]').forEach(element => {
      this.renderComponent(element);
    });
  }

  // Lazy load component definition and render
  async renderComponent(element: HTMLElement) {
    const componentId = element.getAttribute('data-annie-component');
    const definition = await this.loadComponent(componentId);
    const instance = new ComponentInstance(element, definition);
    instance.render();
  }
}
```

### 2. Data Binding Attributes
- `data-annie-bind="path.to.value"` - Two-way data binding
- `data-annie-event="eventType:handlerName"` - Event handling
- `data-annie-ref="name"` - Element reference
- `data-annie-if="condition"` - Conditional rendering
- `data-annie-for="item in items"` - List rendering

### 3. Simple API for Developers
```typescript
// Register custom event handlers
annie.components.on('user-card:onContact', (user) => {
  console.log('Contact user:', user);
});

// Programmatically create components
annie.components.create('user-card', {
  user: { name: 'Jane', email: 'jane@example.com' }
}, '#container');

// Update component data
annie.components.update('#user-card-1', { user: newUserData });
```

## Visual Builder Requirements

### 1. Component Designer
- Drag/drop HTML elements
- Property panel for setting component properties
- Event binding UI (click → action dropdown)
- Live preview of component
- Slot/content area support

### 2. Property Definition
- Visual form builder for component properties
- Type selection (string, number, object, array)
- Validation rules
- Default values
- Required/optional flags

### 3. Export Format
- Generate component JSON definition
- Create usage examples with data-annie-component
- Validate component before saving

## Implementation Benefits

### For Non-Developers
- ✅ No JavaScript coding required
- ✅ Visual drag/drop interface
- ✅ Immediate preview and testing
- ✅ Reusable component library
- ✅ Property forms auto-generated

### For Developers  
- ✅ Minimal integration code
- ✅ Standard HTML attributes
- ✅ Event system integration
- ✅ Server-side rendering ready
- ✅ Component versioning and updates

### For Annie Framework
- ✅ Stays lightweight and focused
- ✅ No complex compilation needed
- ✅ Works with existing state management
- ✅ Compatible with server-side generation
- ✅ Progressive enhancement approach

## Example Workflow

1. **Designer** opens visual builder
2. **Drags** user card template from library
3. **Configures** properties (user object structure)  
4. **Adds** click event → "Send Email" action
5. **Saves** component to library
6. **BoltAPI** serves component JSON
7. **Page builder** uses component: `data-annie-component="user-card"`
8. **Annie** auto-loads and renders component
9. **User** interacts, events flow through Annie's system

## Technical Specifications

### Component Lifecycle
```typescript
interface ComponentLifecycle {
  onBeforeMount?(element: HTMLElement): void;
  onMounted?(element: HTMLElement): void;
  onDataChanged?(newData: any, oldData: any): void;
  onBeforeUnmount?(element: HTMLElement): void;
}
```

### Event System Integration
```typescript
// Components emit events through Annie's existing system
annie.events.emit('component:user-card:contact', { user, element });

// Global component event handling
annie.events.on('component:*:*', (eventName, data) => {
  console.log('Component event:', eventName, data);
});
```

### State Integration
```typescript
// Components can bind to Annie's state manager
<div data-annie-component="user-list" 
     data-users="state:users" 
     data-on-update="state:setUsers">
</div>
```

This approach gives you the power of a component system while maintaining Annie's philosophy of simplicity and non-developer accessibility.