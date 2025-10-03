# 📐 Annie Forms - Bootstrap-Style 12-Column Grid Layout

## 🎯 Overview

Annie's form renderer now includes a comprehensive 12-column grid layout system that provides Bootstrap-compatible field positioning with the power of CSS Grid. This allows you to create professional, responsive form layouts with precise control over field placement.

## ✨ Key Features

### 1. **Bootstrap-Compatible Grid System**
- 12-column grid layout (just like Bootstrap)
- Familiar column spans and offsets
- Responsive breakpoints (xs, sm, md, lg, xl)
- Easy migration from manual Bootstrap grids

### 2. **Enhanced Field Positioning**
```typescript
renderer.addField({
  name: 'firstName',
  type: 'text',
  label: 'First Name',
  layout: {
    column: 6,        // Span 6 out of 12 columns (50% width)
    offset: 2,        // Skip 2 columns (creates left margin)
    newRow: true,     // Force start on new row
    order: 3          // CSS order for visual reordering
  }
});
```

### 3. **Responsive Design**
```typescript
layout: {
  column: 8,           // Default: 8 columns
  xs: { column: 12 },  // Mobile: full width
  sm: { column: 10 },  // Small tablets: 10 columns  
  md: { column: 8 },   // Medium screens: 8 columns
  lg: { column: 6 },   // Large screens: 6 columns
  xl: { column: 4 }    // Extra large: 4 columns
}
```

### 4. **Container Targeting**
```typescript
// Target specific containers
layout: {
  containerId: 'sidebar-container',  // Place in specific element
  selector: '.header-search',        // Or use CSS selector
  column: 12
}
```

### 5. **Advanced Grid Features**
- Named grid areas support
- CSS order control for reordering
- Custom gap spacing
- Automatic CSS injection
- Grid overlay visualization (development mode)

## 🔧 Implementation Details

### FormRenderOptions Interface
```typescript
interface FormRenderOptions {
  layout?: {
    type: 'grid' | 'flex' | 'block';
    columns?: number;        // Default: 12
    gap?: string;           // Default: '15px'
    container?: string;     // Default container selector
  };
  validation?: ValidationOptions;
}
```

### FormFieldConfig Layout Properties
```typescript
interface FormFieldConfig {
  // ... existing properties
  layout?: {
    column?: number;           // 1-12 column span
    offset?: number;          // 0-11 column offset
    newRow?: boolean;         // Force new row
    order?: number;           // CSS order
    gridArea?: string;        // Named grid area
    containerId?: string;     // Target container ID
    selector?: string;        // Target container selector
    
    // Responsive breakpoints
    xs?: { column?: number; offset?: number; };
    sm?: { column?: number; offset?: number; };
    md?: { column?: number; offset?: number; };
    lg?: { column?: number; offset?: number; };
    xl?: { column?: number; offset?: number; };
  };
}
```

## 🚀 Usage Examples

### 1. Basic Two-Column Layout
```typescript
const renderer = new FormRenderer(form, {
  layout: { type: 'grid', columns: 12 }
});

renderer.addField({
  name: 'firstName',
  type: 'text', 
  label: 'First Name',
  layout: { column: 6 }
});

renderer.addField({
  name: 'lastName',
  type: 'text',
  label: 'Last Name', 
  layout: { column: 6 }
});
```

### 2. Responsive Contact Form
```typescript
// Email field - responsive sizing
renderer.addField({
  name: 'email',
  type: 'email',
  label: 'Email Address',
  layout: {
    column: 8,           // 8 columns on desktop
    xs: { column: 12 },  // Full width on mobile
    md: { column: 8 }    // 8 columns on tablets+
  }
});

// Phone field - smaller on desktop, full on mobile
renderer.addField({
  name: 'phone', 
  type: 'tel',
  label: 'Phone Number',
  layout: {
    column: 4,           // 4 columns on desktop
    xs: { column: 12 }   // Full width on mobile
  }
});

// Address - always full width, new row
renderer.addField({
  name: 'address',
  type: 'text',
  label: 'Street Address',
  layout: {
    column: 12,
    newRow: true  // Force new row
  }
});
```

### 3. Advanced Layout with Centering
```typescript
// Centered title field
renderer.addField({
  name: 'title',
  type: 'text',
  label: 'Article Title',
  layout: {
    column: 8,    // 8 columns wide
    offset: 2     // 2 column offset = centered
  }
});

// Wide content area, slightly inset
renderer.addField({
  name: 'content',
  type: 'textarea',
  label: 'Article Content', 
  layout: {
    column: 10,   // 10 columns wide
    offset: 1,    // 1 column offset on each side
    newRow: true
  }
});
```

### 4. Multi-Container Layout
```typescript
// Main form content
renderer.addField({
  name: 'title',
  type: 'text',
  label: 'Title',
  layout: { column: 8 }
});

// Sidebar metadata
renderer.addField({
  name: 'category',
  type: 'select',
  label: 'Category',
  layout: {
    containerId: 'sidebar-metadata',
    column: 12
  }
});

renderer.addField({
  name: 'tags',
  type: 'text',
  label: 'Tags',
  layout: {
    containerId: 'sidebar-metadata', 
    column: 12
  }
});

// Footer actions
renderer.addField({
  name: 'save',
  type: 'submit',
  label: 'Save Draft',
  layout: {
    selector: '.form-footer-actions',
    column: 6
  }
});
```

## 📱 Responsive Breakpoints

| Breakpoint | Screen Size | CSS Media Query |
|------------|-------------|-----------------|
| `xs` | < 576px | `@media (max-width: 575px)` |
| `sm` | ≥ 576px | `@media (min-width: 576px)` |
| `md` | ≥ 768px | `@media (min-width: 768px)` |
| `lg` | ≥ 992px | `@media (min-width: 992px)` |
| `xl` | ≥ 1200px | `@media (min-width: 1200px)` |

## 🎨 Generated CSS Classes

The grid system automatically injects CSS classes following Bootstrap naming conventions:

```css
/* Column spans */
.annie-col-1 { grid-column: span 1; }
.annie-col-2 { grid-column: span 2; }
/* ... up to .annie-col-12 */

/* Offsets */
.annie-offset-1 { grid-column-start: 2; }
.annie-offset-2 { grid-column-start: 3; }
/* ... up to .annie-offset-11 */

/* Responsive classes */
@media (max-width: 575px) {
  .annie-xs-12 { grid-column: span 12; }
}

@media (min-width: 768px) {
  .annie-md-6 { grid-column: span 6; }
}
/* ... etc for all breakpoints */

/* Utility classes */
.annie-new-row { grid-column: 1 / -1; }
```

## 🔄 Migration from Manual Bootstrap

### Before (Manual Bootstrap):
```html
<div class="row">
  <div class="col-md-6">
    <label>First Name</label>
    <input type="text" name="firstName" />
  </div>
  <div class="col-md-6">
    <label>Last Name</label>
    <input type="text" name="lastName" />
  </div>
</div>
```

### After (Annie Dynamic Grid):
```typescript
renderer.addField({
  name: 'firstName',
  type: 'text',
  label: 'First Name',
  layout: { md: { column: 6 } }
});

renderer.addField({
  name: 'lastName', 
  type: 'text',
  label: 'Last Name',
  layout: { md: { column: 6 } }
});
```

## 🎯 Benefits Over Manual Grid Management

1. **Declarative Configuration** - Specify layout in field config, not HTML
2. **Dynamic Responsiveness** - Easy to change breakpoints and sizing
3. **Container Flexibility** - Place fields in any container
4. **State Integration** - Grid layout tied to form state
5. **Reordering Support** - Visual order independent of field order
6. **Automatic CSS Management** - No manual class application
7. **TypeScript Safety** - Full type checking for layout properties

## 🛠️ Development Tools

### Grid Overlay
For development, enable grid visualization:
```typescript
// Shows column boundaries and numbering
renderer.showGridOverlay(true);
```

### Layout Debugging
Monitor field positioning:
```typescript
renderer.onFieldAdded((field, layout) => {
  console.log(`Field "${field.name}" positioned:`, layout);
});
```

## 🚀 Future Enhancements

- [ ] CSS Grid template areas support
- [ ] Subgrid capabilities for nested forms
- [ ] Grid gap customization per breakpoint
- [ ] Visual grid editor interface
- [ ] Grid layout presets (sidebar, dashboard, etc.)
- [ ] Animation support for layout changes

---

The Annie grid system gives you the familiarity of Bootstrap with the power of modern CSS Grid, providing professional form layouts with minimal configuration. Perfect for creating responsive, dynamic forms that adapt to any screen size while maintaining precise control over field positioning.