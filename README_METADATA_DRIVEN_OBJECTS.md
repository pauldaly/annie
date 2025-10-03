# Metadata-Driven Data Object Management

## Overview

The Annie Framework now supports **metadata-driven data object management** instead of hardcoded object configurations. This approach allows your application to dynamically configure complex object mappings based on metadata provided by your server.

## Key Benefits

✅ **No Hardcoded Configurations**: Object mappings are provided by the server  
✅ **Dynamic and Flexible**: Add new object types without code changes  
✅ **Cacheable**: Metadata can be cached locally for performance  
✅ **Versionable**: Support for metadata versioning and updates  
✅ **Multi-table Objects**: Handle complex objects spanning multiple database tables  

## How It Works

### 1. Server Provides Metadata

Instead of calling `registerObjectType()` in your code, your server provides object metadata via an API endpoint:

```typescript
// Configuration
const annie = new AnnieFramework({
    apiConfig: { baseUrl: '/api' },
    metadataOptions: {
        endpoint: '/api/metadata/objects',  // Server endpoint
        cacheKey: 'annie_object_metadata',  // Local storage key
        ttl: 60,                           // Cache for 60 minutes
        version: '1.0'                     // Expected version
    }
});
```

### 2. Server Metadata Format

Your server should return metadata in this format:

```json
[
    {
        "objectType": "person",
        "primaryKey": "id",
        "version": "1.0",
        "lastModified": "2025-09-23T10:00:00Z",
        "tables": [
            {
                "tableName": "people",
                "dataset": "people",
                "keyField": "id",
                "isCollection": false,
                "required": true,
                "fields": [
                    { "source": "id", "target": "id" },
                    { "source": "firstName", "target": "first_name" },
                    { "source": "lastName", "target": "last_name" }
                ]
            },
            {
                "tableName": "person_phones",
                "dataset": "phones", 
                "keyField": "person_id",
                "isCollection": true,
                "fields": [
                    { "source": "personId", "target": "person_id" },
                    { "source": "phoneNumber", "target": "phone_number" },
                    { "source": "phoneType", "target": "phone_type" }
                ]
            }
        ]
    }
]
```

### 3. Using the Data Object Manager

Once metadata is loaded, you can work with complex objects:

```typescript
// Initialize and load metadata
await annie.initialize();

// Check available object types
const types = annie.getAvailableObjectTypes();
console.log('Available types:', types); // ['person', 'order', ...]

// Create a complete person object from multiple tables
const person = annie.createDataObject('person', 123);
// Returns: { id: 123, firstName: "John", lastName: "Doe", 
//           person_phones: [...], person_addresses: [...] }

// Update across multiple tables
annie.updateDataObject('person', 123, {
    first_name: "Johnny",
    phone_number: "555-NEW-PHONE"
});

// Submit all changes with tracking
const changes = annie.getDataObjectManager().buildSubmissionData({
    mode: 'auto',
    datasets: [
        { name: 'people', format: 'nested', filter: { changedOnly: true } },
        { name: 'phones', format: 'nested', filter: { changedOnly: true } }
    ]
});
```

## Metadata Structure Explained

### Object Configuration
- **objectType**: Unique identifier for the object (e.g., "person", "order")
- **primaryKey**: The main identifier field
- **version**: Metadata version for cache validation
- **tables**: Array of table mappings that make up this object

### Table Mapping
- **tableName**: Database table name
- **dataset**: Local dataset name in Annie's DataStore
- **keyField**: Foreign key field linking to the main object
- **isCollection**: `true` for one-to-many relationships (phones, addresses)
- **required**: Whether this table is required for the object
- **fields**: Optional field mappings (defaults to direct mapping)

### Field Mapping
- **source**: Field name in the local dataset
- **target**: Field name in the database table
- **transform**: Optional transformation function
- **validation**: Validation rules
- **defaultValue**: Default value if missing

## Caching and Performance

The framework automatically handles caching:

```typescript
// Metadata is cached in localStorage
// Cache is validated by TTL and version
// Falls back to cache if server is unavailable

// Manual cache operations
annie.loadObjectMetadata({
    endpoint: '/api/metadata/objects',
    cacheKey: 'my_cache_key',
    ttl: 120  // 2 hours
});
```

## Migration from Hardcoded Approach

### Before (Hardcoded)
```typescript
// ❌ Not scalable
dataObjectManager.registerObjectType({
    name: "person",
    primaryKey: "id",
    tables: [/* ... */]
});
```

### After (Metadata-Driven)
```typescript
// ✅ Scalable and flexible
await annie.initialize(); // Automatically loads metadata
const person = annie.createDataObject('person', 123);
```

## Example Server Implementation

Your server should provide an endpoint like `/api/metadata/objects` that returns the metadata JSON. This allows you to:

- Add new object types without deploying frontend code
- Modify field mappings dynamically
- Support different object structures per environment
- Version your metadata for controlled rollouts

## Try the Example

Open `example-metadata-objects.html` to see a working demonstration of the metadata-driven approach with sample data and interactive controls.

## Next Steps

1. Implement the `/api/metadata/objects` endpoint on your server
2. Update your Annie Framework configuration to include `metadataOptions`
3. Remove any hardcoded `registerObjectType()` calls
4. Test with the provided example page

The metadata-driven approach makes your data object management truly dynamic and maintainable!