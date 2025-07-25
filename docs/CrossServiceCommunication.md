# Cross-Service Communication

The SAP UI5 FE Mockserver supports cross-service communication, allowing entity sets in one service to interact with and modify data in other services. This feature is particularly useful for testing complex scenarios where multiple OData services need to coordinate with each other.

## Overview

By default, each mockserver service operates in isolation. With cross-service communication enabled, you can:

- Update entities in other services from your action implementations
- Read data from other services
- Perform cross-service operations like cascading updates
- Test complex business scenarios involving multiple services

## Prerequisites

Cross-service communication is automatically enabled when you configure multiple services in your mockserver setup. No additional configuration is required.

## API Reference

### getOtherServiceEntityInterface

Access an entity interface from another service to perform operations.

```javascript
this.base.getOtherServiceEntityInterface(serviceName, entityName)
```

**Parameters:**
- `serviceName: string` - The URL path of the target service (e.g., '/sap/opu/odata/sap/MY_SERVICE')
- `entityName: string` - The name of the entity set in the target service

**Returns:**
- `Promise<FileBasedMockData | undefined>` - The entity interface for the target service's entity

**Throws:**
- Error if the service is not found
- Error if the entity is not found in the target service
- Error if cross-service communication is not enabled

## Usage Examples

### Basic Cross-Service Update

Update an entity in another service when executing an action:

```javascript
// In RootEntity.js (first service)
module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        // Update current service
        this.base.updateEntry(keys, { status: 'processed' });
        
        // Update corresponding entity in second service - works exactly like this.base.updateEntry!
        this.base.getOtherServiceEntityInterface('/second/service', 'RelatedEntity')
            .then(function(otherServiceEntity) {
                if (otherServiceEntity) {
                    // Same API as this.base.updateEntry - just pass keys and partial data
                    // Automatically preserves existing fields (ID, name, etc.)
                    return otherServiceEntity.updateEntry(keys, {
                        lastModified: new Date().toISOString(),
                        processedBy: 'FirstService'
                    });
                }
            })
            .then(function() {
                console.log('Cross-service update completed');
            })
            .catch(function(error) {
                console.error('Cross-service update failed:', error.message);
            });
    }
};
```

### Cross-Service Data Creation

Create new entries in other services:

```javascript
module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        // Create audit entry in logging service
        this.base.getOtherServiceEntityInterface('/audit/service', 'AuditLog')
            .then(function(auditService) {
                if (auditService) {
                    return auditService.addEntry({
                        entityId: keys.ID,
                        action: actionDefinition.name,
                        timestamp: new Date().toISOString(),
                        source: 'MainService'
                    });
                }
            })
            .catch(function(error) {
                console.error('Audit logging failed:', error.message);
            });
    }
};
```

### Complex Cross-Service Workflow

Implement complex business logic across multiple services:

```javascript
module.exports = {
    executeAction: async function (actionDefinition, actionData, keys) {
        try {
            // Step 1: Update current service
            this.base.updateEntry(keys, { status: 'processing' });
            
            // Step 2: Check inventory in another service
            const inventoryService = await this.base.getOtherServiceEntityInterface(
                '/inventory/service', 
                'Stock'
            );
            
            if (inventoryService) {
                const stockItems = await inventoryService.fetchEntries(
                    { productId: keys.productId }
                );
                
                if (stockItems.length > 0 && stockItems[0].quantity > 0) {
                    // Step 3: Reserve inventory - automatically preserves other fields
                    await inventoryService.updateEntry(
                        { productId: keys.productId },
                        { 
                            quantity: stockItems[0].quantity - 1,
                            reserved: stockItems[0].reserved + 1
                        }
                    );
                    
                    // Step 4: Update order status
                    this.base.updateEntry(keys, { status: 'confirmed' });
                } else {
                    // Step 5: Handle out of stock
                    this.base.updateEntry(keys, { status: 'backordered' });
                }
            }
        } catch (error) {
            console.error('Cross-service workflow failed:', error.message);
            this.base.updateEntry(keys, { status: 'error' });
        }
    }
};
```

## Available Operations

Once you obtain an entity interface from another service using `getOtherServiceEntityInterface`, you can perform all standard mockdata operations with the same simplified API as `this.base`:

### Data Modification
- `addEntry(mockEntry)` - Create new entries
- `updateEntry(keyValues, patchData)` - **Update existing entries (automatically preserves existing fields)**
- `removeEntry(keyValues)` - Delete entries

### Data Retrieval
- `fetchEntries(keyValues)` - Get specific entries by key
- `getAllEntries()` - Get all entries
- `hasEntry(keyValues)` - Check if entry exists

### Utility Operations
- `getEmptyObject()` - Get template object for the entity
- `generateKey(property, lineIndex)` - Generate keys for new entries

> **Note:** The cross-service interface has been enhanced to work exactly like `this.base` methods. The `updateEntry` method automatically fetches existing data and merges your changes, preserving all unmodified fields.

## Error Handling

Always implement proper error handling for cross-service operations:

```javascript
this.base.getOtherServiceEntityInterface('/other/service', 'Entity')
    .then(function(otherService) {
        if (!otherService) {
            console.warn('Target service not available');
            return;
        }
        // Perform operations...
    })
    .catch(function(error) {
        if (error.message.includes('not found in registry')) {
            console.error('Service not configured:', error.message);
        } else if (error.message.includes('Entity') && error.message.includes('not found')) {
            console.error('Target entity does not exist:', error.message);
        } else {
            console.error('Unexpected error:', error.message);
        }
    });
```

## Best Practices

### 1. Service Dependencies
- Document cross-service dependencies clearly
- Ensure target services are properly configured
- Handle cases where dependent services might be unavailable

### 2. Error Resilience
- Always use `.catch()` for promise-based operations
- Implement fallback behavior when cross-service operations fail
- Log errors appropriately for debugging

### 3. Performance Considerations
- Minimize cross-service calls where possible
- Use asynchronous operations to avoid blocking
- Consider caching frequently accessed data

### 4. Testing
- Test scenarios with all dependent services running
- Test error scenarios (missing services, missing entities)
- Verify data consistency across services

## Limitations

- Cross-service operations use a shared tenant context (empty tenant ID)
- Circular dependencies between services should be avoided
- Performance may be impacted by excessive cross-service calls
- All target services must be configured in the same mockserver instance

## Troubleshooting

### Common Issues

**Service not found error:**
```
Error: Service '/my/service' not found in registry
```
- Verify the service URL path matches your configuration
- Check that the service is properly registered in your mockserver setup

**Entity not found error:**
```
Error: Entity 'MyEntity' not found in service '/my/service'
```
- Verify the entity name exists in the target service's metadata
- Check that the entity set is properly configured with mockdata

**Cross-service access not enabled:**
```
Error: Cross-service access is not enabled. ServiceRegistry not available.
```
- Ensure you're using the latest version of the mockserver
- Verify multiple services are configured in your setup

### Debug Tips

1. **Enable debug logging** to see service registration:
   ```yaml
   configuration:
     debug: true
   ```

2. **List available services** in your action:
   ```javascript
   console.log('Available services:', Object.keys(serviceRegistry));
   ```

3. **Verify entity availability** before operations:
   ```javascript
   const entityInterface = await this.base.getOtherServiceEntityInterface(serviceName, entityName);
   if (entityInterface) {
       console.log('Entity interface available');
   } else {
       console.log('Entity interface not found');
   }
   ``` 