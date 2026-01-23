# Configuration Reference

Complete reference for all FE Mockserver configuration options.

---

## YAML Configuration

### Complete `ui5.yaml` Reference

The primary configuration file for UI5 applications using the mockserver middleware.

```yaml
specVersion: "3.0"
metadata:
  name: my-app
type: application

# Server configuration
server:
  customMiddleware:
    - name: sap-fe-mockserver
      # Position in middleware chain
      afterMiddleware: compression
      
      # Mockserver configuration
      configuration:
        # Base mount path for all services (optional, default: /)
        mountPath: /
        
        # Enable debug logging (optional, default: false)
        debug: true
        
        # Watch mode - reload on file changes (optional, default: false)
        watch: true
        
        # Services array (required)
        services:
          - # Service URL path (required)
            urlPath: /sap/opu/odata/sap/MY_SERVICE
            
            # Metadata source (required - one of these)
            metadataPath: ./webapp/localService/metadata.xml
            
            # Mock data folder (optional)
            mockdataPath: ./webapp/localService/data
            
            # Auto-generate mock data (optional, default: false)
            generateMockData: true
            
            # Watch mode for this service (optional, default: false)
            watch: true
            
            # Annotations (optional)
            annotations:
              - localPath: ./webapp/localService/annotations.xml
                urlPath: /annotations
              - localPath: ./webapp/localService/annotations2.xml
                urlPath: /annotations2
```

### Common Configuration Patterns

#### Minimal Configuration

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata/sap/MY_SERVICE
            metadataPath: ./webapp/localService/metadata.xml
```

#### Multiple Services

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          # Main application service
          - urlPath: /sap/opu/odata/sap/MAIN_SERVICE
            metadataPath: ./webapp/localService/main/metadata.xml
            mockdataPath: ./webapp/localService/main/data
            generateMockData: true
            
          # Value help service
          - urlPath: /sap/opu/odata/sap/VH_SERVICE
            metadataPath: ./webapp/localService/valuehelp/metadata.xml
            mockdataPath: ./webapp/localService/valuehelp/data
            
          # Reference data service
          - urlPath: /sap/opu/odata4/sap/REF_SERVICE/0001
            metadataPath: ./webapp/localService/reference/metadata.xml
            mockdataPath: ./webapp/localService/reference/data
```

#### With Annotations

```yaml
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    metadataPath: ./webapp/localService/metadata.xml
    mockdataPath: ./webapp/localService/data
    annotations:
      - localPath: ./webapp/localService/annotations/annotation1.xml
        urlPath: /annotation1
      - localPath: ./webapp/localService/annotations/annotation2.xml
        urlPath: /annotation2
```

---

## JavaScript Configuration

For more dynamic or complex configurations, use JavaScript.

### `config.js` File Structure and Usage

**File**: `webapp/localService/config.js`

```javascript
/**
 * Mockserver Configuration
 * This file is loaded by the mockserver middleware to configure services
 */
module.exports = {
  // Debug mode
  debug: true,
  
  // Watch mode
  watch: true,
  
  // Services array
  services: [
    {
      urlPath: '/sap/opu/odata/sap/MY_SERVICE',
      metadataPath: './webapp/localService/metadata.xml',
      mockdataPath: './webapp/localService/data',
      generateMockData: true,
      numberOfEntities: 15
    }
  ]
};
```

### Wrapping with `module.exports = {}`

**Why it's required**: Node.js uses CommonJS module system. The `module.exports` syntax exports your configuration object so the mockserver can import and use it.

```javascript
// ❌ Wrong - No export
{
  services: [
    { urlPath: '/service' }
  ]
}

// ✅ Correct - Proper export
module.exports = {
  services: [
    { urlPath: '/service' }
  ]
};
```

### Configuration Object Properties

#### Complete Property Reference

```javascript
module.exports = {
  // Base path for all services
  mountPath: '/',
  
  // Enable debug logging
  debug: false,
  
  // Watch files for changes
  watch: false,
  
  // Services configuration
  services: [
    {
      // Service URL path (required)
      urlPath: '/sap/opu/odata/sap/MY_SERVICE',
      
      // Metadata options (choose one)
      metadataPath: './localService/metadata.xml',
      
      // Mock data folder
      mockdataPath: './localService/data',
      
      // Auto-generate data
      generateMockData: true,
      
      // Watch this service's files
      watch: false,
      
      // Annotations
      annotations: [
        {
          localPath: './localService/annotations.xml',
          urlPath: '/annotations'
        }
      ],
    }
  ]
};
```

### Service Mapping Arrays

When working with multiple services, organize them logically:

```javascript
module.exports = {
  services: [
    // Main business service
    {
      urlPath: '/sap/opu/odata/sap/SALES_ORDER_SRV',
      metadataPath: './localService/sales/metadata.xml',
      mockdataPath: './localService/sales/data',
      annotations: [
        {
          localPath: './localService/sales/annotations.xml',
          urlPath: '/sales-annotations'
        }
      ]
    },
    
    // Value help service
    {
      urlPath: '/sap/opu/odata/sap/VALUE_HELP_SRV',
      metadataPath: './localService/valuehelp/metadata.xml',
      mockdataPath: './localService/valuehelp/data',
      generateMockData: true
    },
    
    // Master data service
    {
      urlPath: '/sap/opu/odata4/sap/MASTER_DATA/0001',
      metadataPath: './localService/masterdata/metadata.xml',
      mockdataPath: './localService/masterdata/data'
    }
  ]
};
```

#### Conditional Services

```javascript
const services = [
  {
    urlPath: '/sap/opu/odata/sap/MAIN_SERVICE',
    metadataPath: './localService/main/metadata.xml',
    mockdataPath: './localService/main/data'
  }
];

// Add value help service only in development
if (process.env.INCLUDE_VALUE_HELP === 'true') {
  services.push({
    urlPath: '/sap/opu/odata/sap/VH_SERVICE',
    metadataPath: './localService/vh/metadata.xml',
    mockdataPath: './localService/vh/data'
  });
}

module.exports = { services };
```

---

## Mockdata File API

Customize entity behavior with JavaScript files in your mockdata folder.

### `getInitialDataSet()` - Dynamic Data Generation

Generate mock data programmatically instead of using static JSON files.

**Signature**:
```javascript
getInitialDataSet?: (contextId: string) => object[]
```

**Parameters**:
- `contextId`: Tenant/context identifier

**Example** - `Products.js`:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    console.log('Generating data for context:', contextId);
    
    const products = [];
    const categories = ['Notebooks', 'Accessories', 'Software'];
    
    for (let i = 1; i <= 20; i++) {
      products.push({
        ProductID: `HT-${1000 + i}`,
        Name: `Product ${i}`,
        Description: `This is product number ${i}`,
        Price: (Math.random() * 2000).toFixed(2),
        CurrencyCode: 'EUR',
        Category: categories[i % categories.length],
        InStock: i % 3 !== 0,
        StockQuantity: Math.floor(Math.random() * 100)
      });
    }
    
    return products;
  }
};
```

**Tenant-Specific Data**:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    // Different data per tenant
    const baseData = [...]; // Common data
    
    if (contextId === '100') {
      // Tenant 100 specific data
      return baseData.filter(item => item.Region === 'EMEA');
    } else if (contextId === '200') {
      // Tenant 200 specific data
      return baseData.filter(item => item.Region === 'AMER');
    }
    
    return baseData;
  }
};
```

### `executeAction()` - Action/Function Handling

Handle custom actions and functions.

**Signature**:
```javascript
executeAction?: (
  actionDefinition: Action,
  actionData: any,
  keys: Record<string, any>,
  odataRequest: ODataRequest
) => object | undefined
```

**Parameters**:
- `actionDefinition`: Metadata definition of the action/function
  - `name`: Action name
  - `isBound`: Whether it's bound to an entity
  - `parameters`: Action parameters
  - `returnType`: Expected return type
- `actionData`: Data sent with the action (for bound actions, includes entity data)
- `keys`: Key values of the entity (for bound actions)
- `odataRequest`: Full OData request object
  - `tenantId`: Current tenant
  - `isStrictMode`: Whether strict mode is enabled

**Example** - `Products.js`:
```javascript
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    const actionName = actionDefinition.name;
    
    // Handle different actions
    switch (actionName) {
      case 'ApplyDiscount':
        return this.handleApplyDiscount(actionData, keys);
        
      case 'CheckAvailability':
        return this.handleCheckAvailability(actionData);
        
      case 'draftPrepare':
          return this.handleDraftPrepare(actionData, odataRequest)
      default:
        this.throwError(`Action ${actionName} not implemented`, 501);
    }
  },
  
  handleApplyDiscount: function(actionData, keys) {
    // Apply discount to product
    const discountPercent = actionData.DiscountPercent || 0;
    const originalPrice = parseFloat(actionData.Price);
    const newPrice = originalPrice * (1 - discountPercent / 100);
    
    return {
      ...actionData,
      Price: newPrice.toFixed(2),
      DiscountApplied: discountPercent
    };
  },
  
  handleCheckAvailability: function(actionData) {
    // Return availability status
    return {
      ProductID: actionData.ProductID,
      Available: actionData.StockQuantity > 0,
      EstimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  },
  
  handleDraftPrepare: function(actionData, odataRequest) {
    // Validate draft before activation
    const errors = [];
    
    if (!actionData.Name || actionData.Name.length < 3) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Product name must be at least 3 characters',
        severity: 'error',
        target: 'Name'
      });
    }
    
    if (parseFloat(actionData.Price) <= 0) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Price must be greater than zero',
        severity: 'error',
        target: 'Price'
      });
    }
    
    if (errors.length > 0 && odataRequest.isStrictMode) {
      // Throw 412 error in strict mode
      this.throwError('Validation failed', 412, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Entity validation failed',
          details: errors
        }
      });
    }
    
    // Return entity with validation messages
    return {
      ...actionData,
      __messages: errors.length > 0 ? errors : undefined
    };
  }
};
```

### Context and Tenant Support

**Using Context in Actions**:
```javascript
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    const tenantId = odataRequest.tenantId;
    
    // Tenant-specific logic
    if (tenantId === '100') {
      // European tenant - prices in EUR
      actionData.CurrencyCode = 'EUR';
    } else if (tenantId === '200') {
      // American tenant - prices in USD
      actionData.CurrencyCode = 'USD';
    }
    
    return actionData;
  }
};
```

### Base Methods and Utilities

Access other entity sets and utility methods via `this.base`:

```javascript
module.exports = {
  executeAction: async function(actionDefinition, actionData, keys, odataRequest) {
    // Get interface to another entity set
    const categoryInterface = await this.base.getEntityInterface('Categories');
    
    // Get data from that entity set
    const categories = categoryInterface.getData();
    
    // Find specific category
    const category = categories.find(c => c.CategoryID === actionData.CategoryID);
    
    if (!category) {
      this.throwError('Category not found', 404);
    }
    
    // Get interface for cross-service entity
    const otherServiceEntity = await this.base.getEntityInterface(
      'Products', 
      'OTHER_SERVICE_ALIAS'
    );
    
    // Perform data operations
    const newEntity = categoryInterface.create({
      CategoryID: 'NEW',
      CategoryName: 'New Category'
    });
    
    categoryInterface.update('CAT001', {
      CategoryName: 'Updated Name'
    });
    
    categoryInterface.delete('CAT002');
    
    return actionData;
  },
  
  // Throw custom errors
  throwCustomError: function(message, code) {
    this.throwError(message, code, {
      error: {
        code: 'CUSTOM_ERROR',
        message: message,
        details: [
          {
            severity: 'error',
            message: 'Additional details here'
          }
        ]
      }
    });
  }
};
```

## What's Next?

- 🚀 **[Advanced Features](../advanced-features/README.md)** - Deep structures, actions, multiple services
- 📝 **[Mock Data Best Practices](../best-practices/mock-data.md)** - Creating effective test data
- 🧪 **[OPA5 Testing Integration](../opa5-testing/README.md)** - Set up automated tests
- 📚 **[Examples](../examples/README.md)** - Complete working examples

