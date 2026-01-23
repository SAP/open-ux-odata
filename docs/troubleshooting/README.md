# Troubleshooting and Debugging

Comprehensive guide to solving common issues, debugging techniques, and diagnostic tools for the FE Mockserver.

---

## Table of Contents

- [Common Issues and Solutions](#common-issues-and-solutions)
- [Debugging Techniques](#debugging-techniques)
- [Logging and Tracing](#logging-and-tracing)
- [Diagnostic Tools](#diagnostic-tools)

---

## Common Issues and Solutions

### FAQ - Frequently Asked Questions

#### Q: Mockserver doesn't start - "Cannot find module" error

**Problem**:
```
Error: Cannot find module '@sap-ux/ui5-middleware-fe-mockserver'
```

**Solution**:
```bash
# Ensure the package is installed
npm install --save-dev @sap-ux/ui5-middleware-fe-mockserve

# Verify installation
npm list @sap-ux/ui5-middleware-fe-mockserver
```

#### Q: Service returns 404 - "Service not found"

**Problem**: Accessing `/sap/opu/odata/sap/MY_SERVICE/` returns 404.

**Solution**:
```yaml
# ❌ Wrong - Missing or incorrect path
services:
  - urlPath: /wrong/path
    metadataPath: ./webapp/localService/metadata.xml

# ✅ Correct - Path must match manifest.json
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    metadataPath: ./webapp/localService/metadata.xml
```

**Verify in manifest.json**:
```json
{
  "sap.app": {
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/MY_SERVICE/",
        "type": "OData"
      }
    }
  }
}
```

#### Q: Metadata parsing error

**Problem**:
```
Error parsing metadata: Unexpected token < in JSON
```

**Solution**:
```yaml
# ❌ Wrong - File doesn't exist or path is incorrect
metadataPath: ./webapp/localService/metadat.xml  # Typo!

# ✅ Correct - Verify file exists
metadataPath: ./webapp/localService/metadata.xml
```

**Verify metadata file**:
```bash
# Check file exists
ls -la webapp/localService/metadata.xml

# Validate XML
xmllint --noout webapp/localService/metadata.xml
```

#### Q: Mock data not loading

**Problem**: Service works but returns empty arrays.

**Solution**:

**Check 1: File naming**
```javascript
// ❌ Wrong - Case mismatch
// Metadata: <EntitySet Name="Products" .../>
// File: products.json  (lowercase)

// ✅ Correct - Exact match
// Metadata: <EntitySet Name="Products" .../>
// File: Products.json  (capital P)
```

**Check 2: File location**
```yaml
# Ensure mockdataPath is correct
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    mockdataPath: ./webapp/localService/data  # Files must be here
```

**Check 3: JSON format**
```json
// ❌ Wrong - Invalid JSON
[
  {
    "ProductID": "001",
    "Name": "Product"  // Missing comma
  }
  {
    "ProductID": "002"
  }
]

// ✅ Correct - Valid JSON
[
  {
    "ProductID": "001",
    "Name": "Product"
  },
  {
    "ProductID": "002",
    "Name": "Another Product"
  }
]
```

#### Q: Navigation properties return empty

**Problem**: `$expand=Category` returns null or empty.

**Cause**: Missing or incorrect referential constraints.

**Solution**:

**Check metadata**:
```xml
<!-- ✅ Correct - Has referential constraint -->
<NavigationProperty Name="Category" Type="MyService.Category">
  <ReferentialConstraint Property="CategoryID" ReferencedProperty="CategoryID"/>
</NavigationProperty>

<!-- ❌ Wrong - Missing constraint -->
<NavigationProperty Name="Category" Type="MyService.Category"/>
```

**Check mock data correlation**:
```json
// Products.json
[
  {
    "ProductID": "P001",
    "CategoryID": "CAT-1"  // Must match a category
  }
]

// Categories.json
[
  {
    "CategoryID": "CAT-1",  // Must exist!
    "CategoryName": "Category 1"
  }
]
```

#### Q: Child entities not filtering by parent

**Problem**: All items shown regardless of parent order.

**Solution**:

**Ensure composite keys in child entities**:
```json
// ❌ Wrong - Missing OrderID
[
  {
    "ItemNo": "10",
    "ProductID": "P001"
  }
]

// ✅ Correct - Includes parent key
[
  {
    "OrderID": "SO-001",  // Parent key!
    "ItemNo": "10",
    "ProductID": "P001"
  }
]
```

**Check referential constraints**:
```xml
<NavigationProperty Name="Items" Type="Collection(MyService.Item)" Partner="Order">
  <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
</NavigationProperty>
```

#### Q: Custom action returns "Not implemented"

**Problem**: Custom action returns 501 error.

**Solution**:

**Create entity set JavaScript file**:
```javascript
// Products.js (not product.js!)
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    if (actionDefinition.name === 'MyAction') {
      // Implementation
      return actionData;
    }
  }
};
```

**For unbound actions, use EntityContainer.js**:
```javascript
// EntityContainer.js
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    if (actionDefinition.name === 'UnboundAction') {
      // Implementation
      return { success: true };
    }
  }
};
```

#### Q: Cross-service access fails

**Problem**: `getEntityInterface('Entity', 'service-alias')` returns undefined.

**Solution**:

**Define service alias**:
```yaml
services:
  - urlPath: /sap/opu/odata/sap/SERVICE_A
    alias: service-a  # Define alias!
    
  - urlPath: /sap/opu/odata/sap/SERVICE_B
    alias: service-b  # Define alias!
```

**Use async/await**:
```javascript
// ❌ Wrong - Not awaiting
const otherService = this.base.getEntityInterface('Entity', 'service-b');

// ✅ Correct - Using await
const otherService = await this.base.getEntityInterface('Entity', 'service-b');
```

---

## Debugging Techniques

### VS Code Debug Configuration

**`.vscode/launch.json`**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Start Mockserver with Debugger",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["start"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "sap-fe-mockserver:*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug OPA5 Tests",
      "program": "${workspaceFolder}/node_modules/@ui5/cli/bin/ui5.js",
      "args": ["serve", "--config", "ui5-mock.yaml"],
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "sap-fe-mockserver:*"
      }
    }
  ]
}
```

**package.json script**:
```json
{
  "scripts": {
    "start:debug": "node --inspect-brk node_modules/@ui5/cli/bin/ui5.js serve",
    "test:debug": "node --inspect-brk node_modules/@ui5/cli/bin/ui5.js serve --config ui5-mock.yaml"
  }
}
```

### Breakpoint Placement

**Strategic breakpoint locations**:

1. **Action entry point**:
```javascript
executeAction: function(actionDefinition, actionData, keys, odataRequest) {
  debugger;  // See all action calls
  // ...
}
```

2. **Before data modification**:
```javascript
onBeforeAddEntry: function(keys, data, odataRequest) {
  debugger;  // Inspect data before creation
  // ...
}
```

3. **After data read**:
```javascript
async onAfterRead(data, odataRequest) {
  debugger;  // See data being returned
  return data;
}
```

4. **Error conditions**:
```javascript
if (!product) {
  debugger;  // Investigate why product not found
  this.throwError('Product not found', 404);
}
```

### Inspecting Request/Response Flow

**Add logging to trace flow**:
```javascript
module.exports = {
  async onBeforeAddEntry(keys, data, odataRequest) {
    console.group('🔵 CREATE Entry');
    console.log('📥 Incoming data:', JSON.stringify(data, null, 2));
    console.log('🔑 Keys:', keys);
    console.log('🌐 URL:', odataRequest.url);
    console.log('👤 Tenant:', odataRequest.tenantId);
    console.groupEnd();
  },
  
  async onAfterAddEntry(keys, data, odataRequest) {
    console.group('✅ CREATED Entry');
    console.log('📤 Final data:', JSON.stringify(data, null, 2));
    console.groupEnd();
  }
};
```

---

## Logging and Tracing

### Enabling Debug Logs for Every Request

**Configuration**:
```yaml
configuration:
  debug: true  # Enable all debug logs
  services:
    - urlPath: /sap/opu/odata/sap/MY_SERVICE
      metadataPath: ./webapp/localService/metadata.xml
```

### Request Payload Logging

**Enable in configuration**:
```yaml
configuration:
  debug: true
  logRequests: true  # Log all incoming requests
```

**Custom request logging**:
```javascript
// EntityContainer.js or any entity file
module.exports = {
  async onBeforeAction(actionDefinition, actionData, keys) {
    console.group('📨 Action Request');
    console.log('Action:', actionDefinition.name);
    console.log('Data:', JSON.stringify(actionData, null, 2));
    console.log('Keys:', JSON.stringify(keys, null, 2));
    console.groupEnd();
    
    return actionData;
  }
};
```

### Response Payload Logging

**Custom response logging**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    console.group('📤 Response Data');
    console.log('Entity Set:', odataRequest.entitySetName);
    console.log('Count:', data.length);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.groupEnd();
    
    return data;
  },
  
  async onAfterAction(actionDefinition, actionData, keys, responseData, odataRequest) {
    console.group('📤 Action Response');
    console.log('Action:', actionDefinition.name);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.groupEnd();
    
    return responseData;
  }
};
```

### Error Tracking

**Comprehensive error logging**:
```javascript
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    try {
      console.log(`⚙️  Executing action: ${actionDefinition.name}`);
      
      // Your logic here
      const result = this.performAction(actionData);
      
      console.log(`✅ Action ${actionDefinition.name} succeeded`);
      return result;
      
    } catch (error) {
      console.group('❌ Action Error');
      console.error('Action:', actionDefinition.name);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('Data:', actionData);
      console.groupEnd();
      
      this.throwError(error.message, 500, {
        error: {
          code: 'ACTION_FAILED',
          message: error.message,
          details: error.stack
        }
      });
    }
  }
};
```

### Performance Profiling

**Time tracking**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const startTime = Date.now();
    
    // Your data processing
    const processedData = await this.processData(data);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Data processing took ${duration}ms for ${data.length} items`);
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow processing detected: ${duration}ms`);
    }
    
    return processedData;
  }
};
```
---

## Diagnostic Tools

### Browser Developer Tools Integration

**Network Traffic Analysis**:

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Look for OData requests

**Key things to check**:
- ✅ Request URL matches service configuration
- ✅ Request method (GET, POST, PATCH, DELETE)
- ✅ Request headers (Content-Type, Accept)
- ✅ Request payload (for POST/PATCH)
- ✅ Response status (200, 201, 400, 404, etc.)
- ✅ Response payload
- 
### Health Check Endpoint

**Check mockserver status**:
```bash
# Check service is running
curl http://localhost:8080/sap/opu/odata/sap/MY_SERVICE/

# Check metadata
curl http://localhost:8080/sap/opu/odata/sap/MY_SERVICE/\$metadata

# Check specific entity set
curl http://localhost:8080/sap/opu/odata/sap/MY_SERVICE/Products
```

### Quick Diagnostic Checklist

When things aren't working, check in order:

1. ✅ **Mockserver is running**: Check terminal for startup messages
2. ✅ **Service URL is correct**: Matches manifest.json
3. ✅ **Metadata loads**: Visit `/$metadata` endpoint
4. ✅ **Mock data files exist**: Check file names match entity sets exactly
5. ✅ **JSON is valid**: Run validation script
6. ✅ **Navigation constraints exist**: Check metadata for ReferentialConstraints
7. ✅ **Cross-service aliases defined**: If using multiple services
8. ✅ **Debug logs enabled**: Set `debug: true` in config

---

## What's Next?

- 📚 **[Best Practices](../best-practices/mock-data.md)** - Tips for effective development
- 📖 **[Examples](../examples/README.md)** - Working examples to learn from
- ⚙️ **[Configuration Reference](../configuration-reference/README.md)** - All options explained
- 🔍 **[Advanced Features](../advanced-features/README.md)** - Complex scenarios

