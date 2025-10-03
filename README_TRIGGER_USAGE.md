# Annie Framework - Trigger Types Reference

## Trigger Type Usage Guide

### 1. **API Trigger** - For XHR/POST Requests with Data
Use when you want to send data to the server via XHR without navigating away from the page.

```html
<!-- Basic API call -->
<div data-trigger='{"type": "api", "query": ["endpoint-name"]}'>API Call</div>

<!-- POST with parameters (DataTable scenario) -->
<tr data-trigger='{"type": "api", "method": "post", "action": "/staff-overview", "params": [{"accountguid": "123", "name": "John Doe"}]}'>
  <td>John Doe</td>
  <td>123</td>
</tr>

<!-- API with form data -->
<button data-trigger='{"type": "api", "method": "post", "action": "/submit", "form": ["myForm"], "params": [{"id": "123"}]}'>Submit</button>

<!-- API with data attributes (legacy) -->
<div data-trigger='{"type": "api", "method": "post", "action": "/update"}' 
     data-userid="456" 
     data-role="admin">Update User</div>
```

**Features:**
- Makes XHR requests (stays on current page)
- Supports POST/GET/PUT/DELETE methods
- Includes form data, parameters, and data attributes
- Returns response data to the page

### 2. **Click Trigger** - For Navigation/Routing with Form Submission
Use when you want to navigate to a different page with POST parameters.

```html
<!-- Navigate to external URL (uses window.location) -->
<button data-trigger='{"type": "click", "action": "https://www.example.com"}'>Go to Example</button>

<!-- Navigate to internal page with POST parameters -->
<div data-trigger='{"type": "click", "method": "post", "action": "/staff-profile", "params": [{"accountguid": "123"}]}'>View Profile</div>

<!-- Navigate with data attributes as parameters -->
<button data-trigger='{"type": "click", "method": "post", "action": "/dashboard"}' 
        data-userid="456" 
        data-role="admin">Go to Dashboard</button>

<!-- Navigate with callback -->
<button data-trigger='{"type": "click", "action": "/dashboard", "callbefore": {"function": "saveData", "params": []}}'>Go to Dashboard</button>

<!-- Just callback (no navigation) -->
<button data-trigger='{"type": "click", "callbefore": {"function": "showAlert", "params": ["Hello!"]}}'>Show Alert</button>
```

**Features:**
- **Internal URLs**: Creates hidden POST form with parameters, auto-prepends language code (`/staff` → `/en/staff`)
- **External URLs**: Uses `window.location.href` (no form submission)
- **Parameter collection**: Merges trigger params and element data attributes
- **Form submission**: Submits as POST with hidden inputs for all parameters
- Can execute callbacks before navigation

### 3. **Your DataTable Scenario**

For your staff DataTable where clicking a row should POST data to `/staff-overview`:

```javascript
// In DataTable createdRow callback:
createdRow: function (row, data, index) {
    $(row).attr('data-trigger', '{"type": "api", "method": "post", "action": "/staff-overview", "params": [{"accountguid":"' + data.accountguid + '"}]}');
}
```

This will:
1. Make a POST request to `/staff-overview`
2. Include the `accountguid` parameter
3. Include persistent data from the store
4. Stay on the current page
5. Process the server response

### 4. **Parameter Handling**

All parameter sources are merged into the final request:

```javascript
// Final request will include:
{
  // Store data (persistent across pages)
  "userid": "current-user-123",
  "sessionid": "sess-456",
  
  // Form data (if form specified)
  "department": "Engineering",
  "location": "San Francisco",
  
  // Trigger params (row-specific)
  "accountguid": "staff-001",
  "name": "Alice Johnson",
  
  // Data attributes (legacy)
  "role": "admin",
  "level": "senior",
  
  // Queries (API endpoints to call)
  "queries": [{"name": "staff-overview", "datasets": [{"dataset": "staff-overview"}]}]
}
```

### 5. **Dynamic Content Support**

The framework automatically detects dynamically added triggers:

```javascript
// This works automatically - no manual initialization needed
const newRow = document.createElement('tr');
newRow.setAttribute('data-trigger', '{"type": "api", "method": "post", "action": "/endpoint", "params": [{"id": "123"}]}');
document.body.appendChild(newRow);
```

**Manual reinitialize (if needed):**
```javascript
annie.reinitializeTriggers();
```

### 6. **Debug Information**

Enable debug logging:
```javascript
window.loglevel = "Debug";
```

Check browser console for:
- Trigger initialization messages
- Click events and parameter processing
- XHR request details
- Navigation actions

## Summary

- **API Trigger** = XHR requests with data (stays on page)
- **Click Trigger** = Navigation/routing (changes page)
- Use `type: "api"` for your DataTable scenario
- Parameters, form data, and persistent data automatically merge
- Dynamic content is automatically detected