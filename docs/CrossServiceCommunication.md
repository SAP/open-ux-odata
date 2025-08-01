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

## Service Aliases

To make cross-service references easier and more maintainable, you can define short aliases for your services in the configuration:

```yaml
# ui5.yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        services:
          - urlBasePath: /sap/opu/odata/sap/MY_FIRST_SERVICE
            alias: service1
            metadataPath: ./first-service/metadata.xml
            mockdataPath: ./first-service/mockdata
          - urlBasePath: /sap/opu/odata/sap/MY_SECOND_SERVICE  
            alias: service2
            metadataPath: ./second-service/metadata.xml
            mockdataPath: ./second-service/mockdata
```

With aliases defined, you can reference services using short names like `'service2'` instead of long URLs.

## API Reference

### getEntityInterface (Enhanced)

The `getEntityInterface` method has been enhanced to support cross-service access:

```javascript
// Same service access (existing behavior)
this.base.getEntityInterface(entityName)

// Cross-service access (new capability)
this.base.getEntityInterface(entityName, serviceNameOrAlias)
```

**Parameters:**
- `entityName: string` - The name of the entity set
- `serviceNameOrAlias: string` (optional) - The URL path or alias of the target service

**Returns:**
- `Promise<FileBasedMockData | undefined>` - The entity interface for the entity

**Throws:**
- Error if the service is not found
- Error if the entity is not found in the target service
- Error if cross-service communication is not enabled

## Usage Examples

### Basic Cross-Service Update (Using Alias)

Update an entity in another service when executing an action:

```javascript
// In RootEntity.js (first service)
module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        // Update current service
        this.base.updateEntry(keys, { status: 'processed' });
        // Update corresponding entity in second service using alias
        this.base.getEntityInterface('RelatedEntity', 'service2')
            .then(function(otherServiceEntity) {
                if (otherServiceEntity) {
                    // Same API as this.base.updateEntry
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
        // Create audit entry in logging service using full URL
        this.base.getEntityInterface('AuditLog', '/audit/service')
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

## Available Operations

Once you obtain an entity interface from another service using `getEntityInterface`, you can perform all standard mockdata operations with the same simplified API as `this.base`:

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
this.base.getEntityInterface('Entity', 'service2')
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

## Limitations

- Cross-service operations use a shared tenant context (empty tenant ID)
- Circular dependencies between services should be avoided
- Performance may be impacted by excessive cross-service calls
- All target services must be configured in the same mockserver instance

## Troubleshooting

### Common Issues

**Service not found error:**
```
Error: Service 'service2' not found in registry. Available services: /first/service (alias: service1), /second/service (alias: service2), /third/service, /fourth/service
```
- Verify the service alias or URL path matches your configuration
- Check that the service is properly registered in your mockserver setup

**Entity not found error:**
```
Error: Entity 'MyEntity' not found in service 'service2'
```
- Verify the entity name exists in the target service's metadata
- Check that the entity set is properly configured with **mockdata**