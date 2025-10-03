# JsonLogic Integration - Solving Component System Limitations

## Overview

By integrating the existing JsonLogic implementation from `boltts.ts`, we've solved the major limitations of the component system while maintaining Annie's philosophy of **no-code for non-developers**.

## What JsonLogic Adds

### 1. **Conditional Logic Without Code**
```html
<!-- Simple conditions -->
<div data-annie-if="user.isActive">Only show for active users</div>

<!-- Complex logic -->
<div data-annie-if='{"and": [{"var": "user.isActive"}, {"&gt;": [{"var": "user.age"}, 18]}]}'>
  Adult active users only
</div>

<!-- Comparisons -->
<div data-annie-if='{"==": [{"var": "user.plan"}, "premium"]}'>
  Premium features
</div>
```

### 2. **Dynamic Classes Based on Data**
```html
<!-- Object-based conditional classes -->
<div data-annie-class='{
  "active": {"var": "user.isActive"},
  "premium": {"==": [{"var": "user.plan"}, "premium"]},
  "new-user": {"&lt;": [{"var": "user.loginCount"}, 3]}
}'>
  Dynamic styling based on user state
</div>
```

### 3. **Loops Without Programming**
```html
<!-- Simple loops -->
<div data-annie-for="user in users">
  <span data-annie-bind="user.name">{{user.name}}</span>
</div>

<!-- With filtering (handled by JsonLogic in data preparation) -->
<div data-annie-for="activeUser in activeUsers">
  <span data-annie-bind="activeUser.name">{{activeUser.name}}</span>
</div>
```

## How Visual Builder Can Use This

### 1. **Condition Builder UI**
Instead of writing JSON, the visual builder provides:

- **Dropdown menus** for operators (`>`, `==`, `and`, `or`)
- **Field pickers** for data properties (`user.age`, `user.plan`)
- **Value inputs** for comparison values (`18`, `"premium"`)
- **Logic combinators** for complex conditions

**Visual Builder Interface:**
```
[Show this element when:]
[ user.age ] [ > ] [ 18 ] [AND] [ user.isActive ] [ == ] [ true ]

Generates: {"and": [{"&gt;": [{"var": "user.age"}, 18]}, {"var": "user.isActive"}]}
```

### 2. **Class Builder UI**
Visual styling with conditions:

```
[Apply CSS classes based on conditions:]
✅ active     → when user.isActive is true
✅ premium    → when user.plan equals "premium" 
✅ new-user   → when user.loginCount is less than 3

Generates: {
  "active": {"var": "user.isActive"},
  "premium": {"==": [{"var": "user.plan"}, "premium"]},
  "new-user": {"&lt;": [{"var": "user.loginCount"}, 3]}
}
```

### 3. **Loop Builder UI**
Drag-and-drop list creation:

```
[Create a list from data:]
Item variable name: [ user      ]
Data source:       [ users     ] (dropdown of available arrays)
Filter (optional): [ user.isActive == true ]

Generates: data-annie-for="user in users"
```

## JsonLogic Operations Available

### **Comparison**
- `==`, `!=`, `===`, `!==`
- `>`, `>=`, `<`, `<=`

### **Logic**
- `and`, `or`, `!` (not)
- `if` (ternary condition)

### **Math**
- `+`, `-`, `*`, `/`, `%`
- `min`, `max`

### **Arrays**
- `in` (contains)
- `filter`, `map`, `reduce`
- `some`, `none`, `all`

### **Strings**
- `cat` (concatenate)
- `substr` (substring)

### **Variables**
- `var` (get nested property)
- `missing` (check for missing fields)

## Limitations Solved

### ❌ **Before JsonLogic**
- No conditional logic in templates
- Static component behavior
- No loops or dynamic lists
- No computed styling

### ✅ **After JsonLogic**
- **Rich conditionals** without coding
- **Dynamic behavior** based on data
- **Loops and filtering** through visual UI
- **Computed classes** for responsive styling
- **Complex logic** through visual rule builder

## Visual Builder Implementation Strategy

### 1. **Rule Builder Component**
```javascript
// Visual builder creates this UI:
const ruleBuilder = {
  type: 'condition',
  left: { type: 'field', value: 'user.age' },
  operator: '>',
  right: { type: 'value', value: 18 },
  logic: 'and',
  next: {
    left: { type: 'field', value: 'user.isActive' },
    operator: '==',
    right: { type: 'value', value: true }
  }
};

// Converts to JsonLogic:
{"and": [{"&gt;": [{"var": "user.age"}, 18]}, {"var": "user.isActive"}]}
```

### 2. **Property Inspector**
When user selects a component, show:

- **Visibility Rules** → `data-annie-if` builder
- **Style Rules** → `data-annie-class` builder  
- **Data Binding** → `data-annie-bind` field picker
- **Event Handlers** → `data-annie-event` action selector

### 3. **No Code Required**
- Users never see JSON or JavaScript
- All logic built through visual interfaces
- Real-time preview of conditions
- Validation prevents invalid logic

## Benefits for Non-Developers

✅ **Visual Logic Builder** - Drag & drop conditional rules  
✅ **Real-time Preview** - See conditions change immediately  
✅ **No Syntax Errors** - Visual builder prevents invalid logic  
✅ **Reusable Rules** - Save common conditions for reuse  
✅ **Progressive Complexity** - Start simple, add complexity as needed  

## Benefits for Developers

✅ **Standard JsonLogic** - Well-documented, battle-tested logic system  
✅ **Extensible** - Can add custom operations easily  
✅ **Debuggable** - Clear JSON structure for troubleshooting  
✅ **Performant** - Efficient evaluation of complex conditions  
✅ **Server Compatible** - Same JsonLogic works server-side  

## Examples in Action

### **E-commerce Product Card**
```html
<div data-annie-component="product-card" 
     data-annie-class='{
       "on-sale": {"&gt;": [{"var": "product.discount"}, 0]},
       "low-stock": {"&lt;": [{"var": "product.inventory"}, 10]},
       "premium": {"==": [{"var": "product.tier"}, "premium"]}
     }'>
  
  <!-- Sale badge (only if discount > 0) -->
  <div data-annie-if='{"&gt;": [{"var": "product.discount"}, 0]}'>
    <span class="sale-badge">{{product.discount}}% OFF</span>
  </div>
  
  <!-- Low stock warning -->
  <div data-annie-if='{"&lt;": [{"var": "product.inventory"}, 10]}'>
    <p class="warning">Only {{product.inventory}} left!</p>
  </div>
  
  <!-- Reviews (only if reviews exist) -->
  <div data-annie-if='{"&gt;": [{"var": "product.reviews.length"}, 0]}'>
    <div data-annie-for="review in product.reviews">
      <p data-annie-bind="review.text">{{review.text}}</p>
    </div>
  </div>
</div>
```

This gives non-developers the power to create **complex, dynamic components** through visual interfaces while maintaining Annie's core philosophy of **enterprise functionality with minimal code complexity**.

The visual builder becomes the "programming interface" - users build logic visually, Annie executes it automatically.