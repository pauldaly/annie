# 📊 Annie Forms - Table Cell Field Targeting

## 🎯 Overview

Annie's FormRenderer now supports **dynamic table cell field placement**, allowing you to add form fields directly to specific cells in existing tables or dynamically created table rows. This is perfect for creating editable data tables, inline forms, spreadsheet-like interfaces, and dynamic data entry workflows.

## ✨ Key Features

### 1. **Precise Cell Targeting**
- Target cells by row ID and cell index
- Use CSS selectors for flexible targeting
- Support for dynamic row creation
- Data association with table rows

### 2. **Multiple Targeting Methods**
```typescript
// Target by row ID and cell index
layout: {
  tableRowId: 'user-123',
  tableCellIndex: 2  // Third column (0-based)
}

// Target by CSS selectors
layout: {
  tableRowSelector: 'tr[data-product-id="456"]',
  tableCellSelector: '.price-column'
}

// Create new row if needed
layout: {
  createTableRow: true,
  tableContainer: '#data-table tbody',
  tableRowData: { id: 'new-row', status: 'pending' }
}
```

### 3. **Simplified Field Creation**
Table cell fields are automatically optimized:
- Compact styling for table cells
- No label wrappers (uses placeholders)
- Full width input elements
- Focused styling for table context

## 🔧 API Reference

### FormFieldConfig.layout Table Properties

```typescript
interface FormFieldConfig {
  layout?: {
    // Table cell targeting
    tableRowId?: string;        // Target specific table row by ID
    tableRowSelector?: string;  // Target table row by CSS selector
    tableCellIndex?: number;    // Target cell by index (0-based)
    tableCellSelector?: string; // Target specific cell by CSS selector
    tableRowData?: any;         // Data to associate with table row
    createTableRow?: boolean;   // Create new table row if not found
    tableContainer?: string;    // Table/tbody selector for new rows
  };
}
```

### New Methods

#### addFieldToTableCell()
Add a field to a specific table cell:
```typescript
renderer.addFieldToTableCell(fieldConfig, {
  rowId?: string;
  rowSelector?: string;
  cellIndex?: number;
  cellSelector?: string;
  createRow?: boolean;
  tableContainer?: string;
  rowData?: any;
});
```

#### addFieldsToTableRow()
Add multiple fields to a table row:
```typescript
renderer.addFieldsToTableRow(fields, {
  rowId?: string;
  rowSelector?: string;
  createRow?: boolean;
  tableContainer?: string;
  rowData?: any;
  startCellIndex?: number;  // Starting column (default: 0)
});
```

#### createEditableTableRow()
Create a complete editable table row:
```typescript
const row = renderer.createEditableTableRow(fields, {
  tableContainer: string;     // Required: table/tbody selector
  rowData?: any;             // Data attributes for the row
  includeActions?: boolean;   // Add Save/Cancel buttons
  onSave?: (data: any) => void;
  onCancel?: () => void;
});
```

## 🚀 Common Use Cases

### 1. Editable Data Table

Transform a static data table into an editable form:

```typescript
// Make a specific row editable
function editUser(userId: string) {
  const fields = [
    { name: 'edit-name', type: 'text', placeholder: 'Name' },
    { name: 'edit-email', type: 'email', placeholder: 'Email' },
    { name: 'edit-role', type: 'select', options: roleOptions }
  ];
  
  renderer.addFieldsToTableRow(fields, {
    rowId: userId,
    startCellIndex: 1  // Skip ID column
  });
  
  // Add save/cancel buttons to actions column
  const actionsCell = document.querySelector(`#${userId} .actions-cell`);
  actionsCell.innerHTML = `
    <button onclick="saveUser('${userId}')">Save</button>
    <button onclick="cancelEdit('${userId}')">Cancel</button>
  `;
}
```

### 2. Dynamic Data Entry

Add new rows for data entry (invoices, shopping carts, etc.):

```typescript
function addInvoiceItem() {
  const itemFields = [
    { name: 'item-description', type: 'text', placeholder: 'Description' },
    { name: 'item-quantity', type: 'number', placeholder: 'Qty' },
    { name: 'item-price', type: 'number', placeholder: 'Price' },
    { name: 'item-total', type: 'number', readonly: true }
  ];
  
  const newRow = renderer.createEditableTableRow(itemFields, {
    tableContainer: '#invoice-items tbody',
    includeActions: true,
    rowData: {
      id: `item-${Date.now()}`,
      status: 'new'
    },
    onSave: async (data) => {
      const result = await api.createInvoiceItem(data);
      if (result.success) {
        // Replace editable row with read-only data
        refreshInvoiceTable();
      }
    },
    onCancel: () => {
      newRow?.remove();
    }
  });
  
  // Auto-calculate total when quantity or price changes
  const qtyInput = newRow.querySelector('[name="item-quantity"]');
  const priceInput = newRow.querySelector('[name="item-price"]');
  const totalInput = newRow.querySelector('[name="item-total"]');
  
  [qtyInput, priceInput].forEach(input => {
    input?.addEventListener('input', () => {
      const qty = parseFloat(qtyInput.value) || 0;
      const price = parseFloat(priceInput.value) || 0;
      totalInput.value = (qty * price).toFixed(2);
    });
  });
}
```

### 3. Inline Cell Editing

Spreadsheet-style editing where users click cells to edit:

```typescript
// Add click-to-edit functionality
document.addEventListener('click', (e) => {
  const cell = e.target.closest('td.editable');
  const row = cell?.closest('tr');
  
  if (cell && row && !cell.querySelector('.annie-table-cell-field')) {
    const cellIndex = Array.from(row.children).indexOf(cell);
    const fieldType = cell.dataset.fieldType || 'text';
    
    renderer.addFieldToTableCell({
      name: `edit-${row.id}-${cellIndex}`,
      type: fieldType,
      placeholder: cell.textContent?.trim() || ''
    }, {
      rowId: row.id,
      cellIndex: cellIndex
    });
    
    // Focus the new field
    const input = cell.querySelector('.annie-table-cell-field');
    input?.focus();
    input?.select();
    
    // Save on blur
    input?.addEventListener('blur', () => {
      const newValue = input.value;
      // Save to backend
      updateCellValue(row.id, cellIndex, newValue);
      // Replace with read-only content
      cell.innerHTML = newValue;
      cell.classList.remove('editing');
    });
  }
});
```

### 4. Dynamic Grid/Table Forms

Create forms that dynamically add rows and columns:

```typescript
class DynamicTableForm {
  constructor(renderer, tableSelector) {
    this.renderer = renderer;
    this.table = document.querySelector(tableSelector);
    this.rowCount = 0;
  }
  
  addRow(fieldConfigs) {
    const rowId = `dynamic-row-${++this.rowCount}`;
    
    // Create the row
    const row = document.createElement('tr');
    row.id = rowId;
    
    // Add a cell for row number
    const numberCell = document.createElement('td');
    numberCell.textContent = this.rowCount;
    row.appendChild(numberCell);
    
    // Add empty cells for fields
    fieldConfigs.forEach(() => {
      row.appendChild(document.createElement('td'));
    });
    
    // Add actions cell
    const actionsCell = document.createElement('td');
    actionsCell.innerHTML = `
      <button onclick="this.removeRow('${rowId}')">Remove</button>
    `;
    row.appendChild(actionsCell);
    
    this.table.querySelector('tbody').appendChild(row);
    
    // Add fields to the row
    this.renderer.addFieldsToTableRow(fieldConfigs, {
      rowId: rowId,
      startCellIndex: 1  // Skip row number
    });
    
    return row;
  }
  
  removeRow(rowId) {
    document.getElementById(rowId)?.remove();
  }
  
  collectAllData() {
    const rows = this.table.querySelectorAll('tbody tr');
    return Array.from(rows).map(row => {
      return this.renderer.collectRowData(row, this.fieldConfigs);
    });
  }
}
```

## 🎨 Styling

Table cell fields automatically receive these CSS classes:

```css
.annie-table-cell-field {
  width: 100%;
  border: 1px solid #ddd;
  padding: 4px 8px;
  font-size: 14px;
  border-radius: 3px;
  background: white;
}

.annie-table-cell-field:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0,122,204,0.1);
}

.annie-table-actions {
  white-space: nowrap;
  padding: 4px;
}

.annie-table-actions button {
  margin: 0 2px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}
```

## 📝 Field Configuration Examples

### Basic Cell Targeting
```typescript
renderer.addField({
  name: 'edit-price',
  type: 'number',
  placeholder: 'Enter price',
  layout: {
    tableRowId: 'product-123',
    tableCellIndex: 3  // Price column
  }
});
```

### Responsive Cell Targeting
```typescript
renderer.addField({
  name: 'description',
  type: 'textarea',
  placeholder: 'Product description',
  layout: {
    tableRowSelector: 'tr[data-product-id="456"]',
    tableCellSelector: '.description-cell',
    // These still work for table cells:
    order: 1,
    gridArea: 'desc'  // If cell uses CSS Grid internally
  }
});
```

### Creating New Rows
```typescript
renderer.addField({
  name: 'new-item-name',
  type: 'text',
  placeholder: 'Item name',
  layout: {
    createTableRow: true,
    tableContainer: '#items-table tbody',
    tableRowData: {
      id: `item-${Date.now()}`,
      status: 'new',
      category: 'products'
    },
    tableCellIndex: 0  // First column
  }
});
```

## 🔄 Integration with Existing Features

Table cell targeting works seamlessly with Annie's existing features:

### State Management
```typescript
// Fields in table cells are still part of the reactive form
const form = new ReactiveForm('table-form', stateManager);
const renderer = new FormRenderer(form, options);

// Changes in table cells update form state
form.subscribe('field-changed', (fieldName, value) => {
  console.log(`Table cell ${fieldName} changed to:`, value);
});
```

### Validation
```typescript
// Table cell fields support full validation
renderer.addFieldToTableCell({
  name: 'price',
  type: 'number',
  validators: [
    (value) => value > 0 ? { valid: true } : { valid: false, message: 'Price must be positive' }
  ]
}, {
  rowId: 'product-123',
  cellIndex: 2
});
```

### Grid Layout Integration
```typescript
// You can use regular grid layout for the overall form
// and table cell targeting for specific data entry areas
const renderer = new FormRenderer(form, {
  layout: { type: 'grid', columns: 12 }
});

// Regular grid fields
renderer.addField({
  name: 'search',
  type: 'text',
  layout: { column: 8 }  // Grid layout
});

// Table cell fields in a specific section
renderer.addFieldToTableCell({
  name: 'inline-edit',
  type: 'text'
}, {
  rowId: 'data-row-1',
  cellIndex: 2  // Table cell targeting
});
```

## 🚀 Performance Considerations

- **Field Creation**: Table cell fields are lighter than full form fields (no label wrapper)
- **Event Handling**: Each field still gets proper event handling and validation
- **Memory Management**: Fields are properly cleaned up when rows are removed
- **DOM Updates**: Minimal DOM manipulation for cell targeting
- **State Sync**: Table cell changes sync with form state efficiently

## 📋 Comparison: Manual vs Annie Table Targeting

### ❌ Manual Approach:
```javascript
// Manual table cell editing
cell.innerHTML = `<input type="text" value="${cell.textContent}">`;
const input = cell.querySelector('input');
input.addEventListener('blur', () => {
  // Manual validation
  if (!validateInput(input.value)) {
    showError('Invalid value');
    return;
  }
  // Manual state update
  updateDataStore(rowId, columnId, input.value);
  // Manual cleanup
  cell.innerHTML = input.value;
});
```

### ✅ Annie Table Targeting:
```typescript
// Annie handles everything automatically
renderer.addFieldToTableCell({
  name: 'edit-value',
  type: 'text',
  validators: [customValidator]  // Automatic validation
}, {
  rowId: rowId,
  cellIndex: columnIndex
});
// Automatic: state management, validation, cleanup, event handling
```

---

The table cell targeting feature transforms Annie from just a form builder into a comprehensive **data table management system**, perfect for admin panels, spreadsheet apps, invoice systems, and any interface that needs inline editing capabilities.