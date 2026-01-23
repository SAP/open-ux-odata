# Intermediate Examples

Complete, production-ready examples demonstrating intermediate-level FE Mockserver scenarios.

> 🚀 **Quick Start**: You can find the complete runnable code for these examples in the [samples/](../../../samples/README.md#intermediate-examples) directory.

---

## Table of Contents

- [Filter Bar with Value Helps](#filter-bar-with-value-helps)
- [Custom Actions Implementation](#custom-actions-implementation)
- [Multiple Services with Cross-References](#multiple-services-with-cross-references)

---

## Filter Bar with Value Helps ([Sample](../../../samples/vh-filter-bar))

**Scenario**: Complete example demonstrating filter bar integration with multiple value help services.

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: vh-filter-bar
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata/sap/SALES_ANALYTICS
            metadataPath: ./webapp/localService/analytics/metadata.xml
            mockdataPath: ./webapp/localService/analytics/data
            alias: analytics
          - urlPath: /sap/opu/odata/sap/VH_COMPANY_CODE
            metadataPath: ./webapp/localService/vh/companycode/metadata.xml
            mockdataPath: ./webapp/localService/vh/companycode/data
            alias: vh-company
          - urlPath: /sap/opu/odata/sap/VH_SALES_ORG
            metadataPath: ./webapp/localService/vh/salesorg/metadata.xml
            mockdataPath: ./webapp/localService/vh/salesorg/data
            alias: vh-salesorg
```

### Value Help Mock Data

**vh/companycode/data/CompanyCodes.json**:
```json
[
  {
    "CompanyCode": "1000",
    "CompanyName": "SAP AG",
    "Country": "DE",
    "Currency": "EUR",
    "City": "Walldorf"
  },
  {
    "CompanyCode": "2000",
    "CompanyName": "SAP America",
    "Country": "US",
    "Currency": "USD",
    "City": "Newtown Square"
  },
  {
    "CompanyCode": "3000",
    "CompanyName": "SAP UK",
    "Country": "GB",
    "Currency": "GBP",
    "City": "London"
  }
]
```

**vh/salesorg/data/SalesOrganizations.json**:
```json
[
  {
    "SalesOrganization": "1000",
    "SalesOrgName": "Germany Sales",
    "CompanyCode": "1000",
    "Country": "DE"
  },
  {
    "SalesOrganization": "1010",
    "SalesOrgName": "Germany Direct Sales",
    "CompanyCode": "1000",
    "Country": "DE"
  },
  {
    "SalesOrganization": "2000",
    "SalesOrgName": "US East Coast",
    "CompanyCode": "2000",
    "Country": "US"
  },
  {
    "SalesOrganization": "2010",
    "SalesOrgName": "US West Coast",
    "CompanyCode": "2000",
    "Country": "US"
  },
  {
    "SalesOrganization": "3000",
    "SalesOrgName": "UK Sales",
    "CompanyCode": "3000",
    "Country": "GB"
  }
]
```

### Dependent Value Help Logic

**vh/salesorg/data/SalesOrganizations.js**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const filters = odataRequest.queryOptions?.$filter;
    
    // Filter sales orgs by company code if specified
    if (filters && filters.includes('CompanyCode')) {
      const match = filters.match(/CompanyCode eq '([^']+)'/);
      const companyCode = match ? match[1] : null;
      
      if (companyCode) {
        console.log(`Filtering sales orgs for company: ${companyCode}`);
        return data.filter(org => org.CompanyCode === companyCode);
      }
    }
    
    return data;
  }
};
```

---

## Custom Actions Implementation ([Sample](../../../samples/custom-actions))

**Scenario**: Implement various action types for business operations.

### Actions Metadata

**sales/metadata.xml** (add to Schema):
```xml
<!-- Factory Action - Create new order -->
<Action Name="CreateOrderFromTemplate" IsBound="false">
  <Parameter Name="TemplateID" Type="Edm.String"/>
  <Parameter Name="CustomerID" Type="Edm.String"/>
  <ReturnType Type="SalesService.SalesOrder"/>
</Action>

<!-- Bound Action - Apply discount -->
<Action Name="ApplyDiscount" IsBound="true">
  <Parameter Name="in" Type="SalesService.SalesOrder"/>
  <Parameter Name="DiscountPercent" Type="Edm.Decimal"/>
  <ReturnType Type="SalesService.SalesOrder"/>
</Action>

<!-- Bound Action - Confirm order -->
<Action Name="ConfirmOrder" IsBound="true">
  <Parameter Name="in" Type="SalesService.SalesOrder"/>
  <ReturnType Type="SalesService.SalesOrder"/>
</Action>

<!-- Static Function - Get statistics -->
<Function Name="GetOrderStatistics" IsBound="false">
  <ReturnType Type="SalesService.OrderStatistics"/>
</Function>

<!-- Complex Type for statistics -->
<ComplexType Name="OrderStatistics">
  <Property Name="TotalOrders" Type="Edm.Int32"/>
  <Property Name="TotalRevenue" Type="Edm.Decimal"/>
  <Property Name="AverageOrderValue" Type="Edm.Decimal"/>
  <Property Name="TopCustomer" Type="Edm.String"/>
</ComplexType>

<!-- Add to EntityContainer -->
<ActionImport Name="CreateOrderFromTemplate" Action="SalesService.CreateOrderFromTemplate"/>
<FunctionImport Name="GetOrderStatistics" Function="SalesService.GetOrderStatistics"/>
```

### Implementation

**EntityContainer.js** (for unbound actions):
```javascript
module.exports = {
  executeAction: async function(actionDefinition, actionData, keys, odataRequest) {
    const actionName = actionDefinition.name;
    
    // Factory Action - Create order from template
    if (actionName === 'CreateOrderFromTemplate') {
      const orderInterface = await this.base.getEntityInterface('SalesOrders');
      const templateInterface = await this.base.getEntityInterface('OrderTemplates');
      
      // Get template
      const template = templateInterface?.fetchEntries({ 
        TemplateID: actionData.TemplateID 
      });
      
      if (!template) {
        this.throwError('Template not found', 404);
      }
      
      // Generate new order ID
      const existingOrders = orderInterface.getData();
      const maxID = Math.max(
        ...existingOrders.map(o => parseInt(o.OrderID.replace('SO-', ''))),
        0
      );
      const newOrderID = `SO-${String(maxID + 1).padStart(6, '0')}`;
      
      // Create order
      const newOrder = {
        OrderID: newOrderID,
        CustomerID: actionData.CustomerID,
        OrderDate: new Date().toISOString().split('T')[0],
        TotalAmount: template.DefaultAmount || '0.00',
        CurrencyCode: template.Currency || 'USD',
        Status: 'NEW',
        CreatedBy: odataRequest.tenantId || 'SYSTEM',
        CreatedAt: new Date().toISOString()
      };
      
      const created = orderInterface.create(newOrder);
      
      // Copy template items if they exist
      if (template.Items) {
        const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
        template.Items.forEach((templateItem, index) => {
          itemInterface.create({
            OrderID: newOrderID,
            ItemNo: String((index + 1) * 10).padStart(6, '0'),
            ProductID: templateItem.ProductID,
            Quantity: templateItem.Quantity,
            UnitPrice: templateItem.UnitPrice,
            Amount: (parseFloat(templateItem.Quantity) * parseFloat(templateItem.UnitPrice)).toFixed(2)
          });
        });
      }
      
      return created;
    }
    
    // Static Function - Get statistics
    if (actionName === 'GetOrderStatistics') {
      const orderInterface = await this.base.getEntityInterface('SalesOrders');
      const orders = orderInterface.getData();
      
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.TotalAmount), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Find top customer
      const customerTotals = orders.reduce((acc, order) => {
        acc[order.CustomerID] = (acc[order.CustomerID] || 0) + parseFloat(order.TotalAmount);
        return acc;
      }, {});
      
      const topCustomer = Object.entries(customerTotals)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      
      return {
        TotalOrders: totalOrders,
        TotalRevenue: totalRevenue.toFixed(2),
        AverageOrderValue: avgOrderValue.toFixed(2),
        TopCustomer: topCustomer
      };
    }
  }
};
```

**SalesOrders.js** (for bound actions):
```javascript
module.exports = {
  executeAction: async function(actionDefinition, actionData, keys, odataRequest) {
    const actionName = actionDefinition.name;
    
    // Bound Action - Apply Discount
    if (actionName === 'ApplyDiscount') {
      const discountPercent = parseFloat(actionData.DiscountPercent);
      
      // Validation
      if (discountPercent < 0 || discountPercent > 50) {
        this.throwError('Invalid discount', 400, {
          error: {
            code: 'INVALID_DISCOUNT',
            message: 'Discount must be between 0 and 50 percent',
            target: 'DiscountPercent'
          }
        });
      }
      
      // Calculate new amount
      const originalAmount = parseFloat(actionData.TotalAmount);
      const discountAmount = originalAmount * (discountPercent / 100);
      const newAmount = originalAmount - discountAmount;
      
      // Update items proportionally
      const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
      const items = itemInterface.getData()
        .filter(item => item.OrderID === actionData.OrderID);
      
      for (const item of items) {
        const itemDiscount = parseFloat(item.Amount) * (discountPercent / 100);
        await itemInterface.updateEntry(
          { OrderID: item.OrderID, ItemNo: item.ItemNo },
          {
            Amount: (parseFloat(item.Amount) - itemDiscount).toFixed(2),
            DiscountApplied: discountPercent
          }
        );
      }
      
      return {
        ...actionData,
        TotalAmount: newAmount.toFixed(2),
        DiscountPercent: discountPercent,
        DiscountAmount: discountAmount.toFixed(2),
        LastModified: new Date().toISOString()
      };
    }
    
    // Bound Action - Confirm Order
    if (actionName === 'ConfirmOrder') {
      // Validate order can be confirmed
      if (actionData.Status === 'CONFIRMED') {
        this.throwError('Order already confirmed', 409);
      }
      
      // Check all items have stock
      const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
      const productService = await this.base.getEntityInterface('Products', 'products');
      
      const items = itemInterface.getData()
        .filter(item => item.OrderID === actionData.OrderID);
      
      const stockIssues = [];
      for (const item of items) {
        const product = productService?.fetchEntries({ ProductID: item.ProductID });
        if (product && product.StockQuantity < parseFloat(item.Quantity)) {
          stockIssues.push({
            ProductID: item.ProductID,
            Available: product.StockQuantity,
            Required: parseFloat(item.Quantity)
          });
        }
      }
      
      if (stockIssues.length > 0) {
        this.throwError('Cannot confirm order - insufficient stock', 412, {
          error: {
            code: 'STOCK_UNAVAILABLE',
            message: 'Some items do not have sufficient stock',
            details: stockIssues
          }
        });
      }
      
      // Confirm order
      return {
        ...actionData,
        Status: 'CONFIRMED',
        ConfirmedAt: new Date().toISOString(),
        ConfirmedBy: odataRequest.tenantId || 'SYSTEM'
      };
    }
  }
};
```

### Testing Actions

**Test Factory Action**:
```
POST /CreateOrderFromTemplate
Content-Type: application/json

{
  "TemplateID": "TMPL-001",
  "CustomerID": "CUST-001"
}
```

**Test Bound Action - Apply Discount**:
```
POST /SalesOrders('SO-000001')/ApplyDiscount
Content-Type: application/json

{
  "DiscountPercent": 10
}
```

**Test Static Function**:
```
GET /GetOrderStatistics()
```

---

## Multiple Services with Cross-References ([Sample](../../../samples/multi-service))

**Scenario**: Sales order service that validates products against a separate product master service.

### Project Structure

```
multi-service/
├── ui5.yaml
└── webapp/
    ├── localService/
    │   ├── sales/
    │   │   ├── metadata.xml
    │   │   └── data/
    │   │       ├── SalesOrders.json
    │   │       ├── SalesOrderItems.js
    │   │       └── Customers.json
    │   ├── products/
    │   │   ├── metadata.xml
    │   │   └── data/
    │   │       ├── Products.json
    │   │       └── Categories.json
    │   └── valuehelp/
    │       ├── metadata.xml
    │       └── data/
    │           ├── Currencies.json
    │           └── Countries.json
    └── manifest.json
```

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: multi-service
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          # Main sales service
          - urlPath: /sap/opu/odata/sap/SALES_ORDER_SRV
            metadataPath: ./webapp/localService/sales/metadata.xml
            mockdataPath: ./webapp/localService/sales/data
            alias: sales
            
          # Product master service
          - urlPath: /sap/opu/odata/sap/PRODUCT_MASTER_SRV
            metadataPath: ./webapp/localService/products/metadata.xml
            mockdataPath: ./webapp/localService/products/data
            alias: products
            
          # Value help service
          - urlPath: /sap/opu/odata/sap/VALUE_HELP_SRV
            metadataPath: ./webapp/localService/valuehelp/metadata.xml
            mockdataPath: ./webapp/localService/valuehelp/data
            alias: valuehelp
```

### Cross-Service Validation

**sales/data/SalesOrderItems.js**:
```javascript
module.exports = {
  async onBeforeAddEntry(keys, data, odataRequest) {
    console.log('🔍 Validating new sales order item...');
    
    // Validate product exists in product master
    const productService = await this.base.getEntityInterface('Products', 'products');
    
    if (!productService) {
      this.throwError('Product service unavailable', 503, {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Product master service is not available'
        }
      });
    }
    
    const product = productService.fetchEntries({ ProductID: data.ProductID });
    
    if (!product) {
      this.throwError('Invalid product', 400, {
        error: {
          code: 'INVALID_PRODUCT',
          message: `Product ${data.ProductID} does not exist in product master`,
          target: 'ProductID'
        }
      });
    }
    
    // Validate stock availability
    if (product.StockQuantity < parseFloat(data.Quantity)) {
      this.throwError('Insufficient stock', 400, {
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${product.StockQuantity} units available. Requested: ${data.Quantity}`,
          target: 'Quantity',
          '@Common.numericSeverity': 4
        }
      });
    }
    
    // Auto-fill data from product master
    data.Description = product.ProductName;
    data.UnitPrice = product.Price;
    data.Amount = (parseFloat(product.Price) * parseFloat(data.Quantity)).toFixed(2);
    
    // Get currency from value help if not specified
    if (!data.CurrencyCode) {
      const currencyService = await this.base.getEntityInterface('Currencies', 'valuehelp');
      const defaultCurrency = currencyService?.getData().find(c => c.IsDefault);
      data.CurrencyCode = defaultCurrency?.CurrencyCode || 'USD';
    }
    
    console.log('✅ Item validated successfully');
  },
  
  async onAfterAddEntry(keys, data, odataRequest) {
    // Update stock in product service
    const productService = await this.base.getEntityInterface('Products', 'products');
    const product = productService.fetchEntries({ ProductID: data.ProductID });
    
    if (product) {
      const newStock = product.StockQuantity - parseFloat(data.Quantity);
      await productService.updateEntry(
        { ProductID: data.ProductID },
        { 
          StockQuantity: newStock,
          LastModified: new Date().toISOString()
        }
      );
      console.log(`📦 Stock updated for ${data.ProductID}: ${newStock} units remaining`);
    }
    
    // Update order total
    await this.updateOrderTotal(data.OrderID);
  },
  
  async updateOrderTotal(orderID) {
    const orderService = await this.base.getEntityInterface('SalesOrders');
    const itemService = await this.base.getEntityInterface('SalesOrderItems');
    
    const items = itemService.getData().filter(item => item.OrderID === orderID);
    const total = items.reduce((sum, item) => sum + parseFloat(item.Amount), 0);
    
    await orderService.updateEntry(
      { OrderID: orderID },
      { TotalAmount: total.toFixed(2) }
    );
  }
};
```

### Mock Data

**products/data/Products.json**:
```json
[
  {
    "ProductID": "MAT-1000",
    "ProductName": "Laptop Pro 15",
    "Category": "Electronics",
    "Price": "1299.00",
    "StockQuantity": 50,
    "IsActive": true
  },
  {
    "ProductID": "MAT-1001",
    "ProductName": "Wireless Mouse",
    "Category": "Accessories",
    "Price": "29.99",
    "StockQuantity": 200,
    "IsActive": true
  },
  {
    "ProductID": "MAT-1002",
    "ProductName": "Monitor 27\"",
    "Category": "Electronics",
    "Price": "449.00",
    "StockQuantity": 10,
    "IsActive": true
  },
  {
    "ProductID": "MAT-1003",
    "ProductName": "Keyboard Mechanical",
    "Category": "Accessories",
    "Price": "89.99",
    "StockQuantity": 0,
    "IsActive": false
  }
]
```

**valuehelp/data/Currencies.json**:
```json
[
  {
    "CurrencyCode": "USD",
    "CurrencyName": "US Dollar",
    "Symbol": "$",
    "IsDefault": true
  },
  {
    "CurrencyCode": "EUR",
    "CurrencyName": "Euro",
    "Symbol": "€",
    "IsDefault": false
  },
  {
    "CurrencyCode": "GBP",
    "CurrencyName": "British Pound",
    "Symbol": "£",
    "IsDefault": false
  }
]
```

### Testing

**Test 1: Create item with valid product**:
```
POST /SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "30",
  "ProductID": "MAT-1000",
  "Quantity": "2.000"
}
```

**Expected**: Success, auto-filled price and description

**Test 2: Create item with insufficient stock**:
```
POST /SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "40",
  "ProductID": "MAT-1002",
  "Quantity": "20.000"
}
```

**Expected**: 400 error - only 10 units available

**Test 3: Create item with invalid product**:
```
POST /SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "50",
  "ProductID": "INVALID",
  "Quantity": "1.000"
}
```

**Expected**: 400 error - product doesn't exist

---

## What's Next?

- 📖 **[Advanced Examples](../advanced/README.md)** - More complex scenarios
- 🧪 **[OPA5 Testing](../../opa5-testing/README.md)** - Test these examples
- 📚 **[Core Concepts](../../core-concepts/README.md)** - Understand the fundamentals

