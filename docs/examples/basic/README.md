# Basic Examples

This section contains simple, easy-to-understand examples for common mockserver scenarios.

> 🚀 **Quick Start**: You can find the complete runnable code for these examples in the [samples/](../../../samples/README.md#basic-examples) directory.

---

## Example 1: Simple Product Catalog with CRUD ([Sample](../../../samples/product-catalog))

A basic product catalog with Create, Read, Update, Delete operations.

### Project Structure

```
my-app/
├── webapp/
│   ├── localService/
│   │   ├── metadata.xml
│   │   └── data/
│   │       ├── Products.json
│   │       └── Categories.json
│   └── manifest.json
└── ui5.yaml
```

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: product-catalog
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata/sap/PRODUCTS_SRV
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
```

### Metadata

**webapp/localService/metadata.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
    <edmx:Include Alias="Common" Namespace="com.sap.vocabularies.Common.v1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
    <edmx:Include Alias="UI" Namespace="com.sap.vocabularies.UI.v1"/>
  </edmx:Reference>
  <edmx:DataServices>
    <Schema Namespace="ProductService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <!-- Product Entity Type -->
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="ProductID" Type="Edm.String" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
        <Property Name="Description" Type="Edm.String"/>
        <Property Name="Price" Type="Edm.Decimal" Scale="2" Precision="10"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        <Property Name="CategoryID" Type="Edm.String"/>
        <Property Name="StockQuantity" Type="Edm.Int32"/>
        <NavigationProperty Name="Category" Type="ProductService.Category">
          <ReferentialConstraint Property="CategoryID" ReferencedProperty="CategoryID"/>
        </NavigationProperty>
      </EntityType>
      
      <!-- Category Entity Type -->
      <EntityType Name="Category">
        <Key>
          <PropertyRef Name="CategoryID"/>
        </Key>
        <Property Name="CategoryID" Type="Edm.String" Nullable="false"/>
        <Property Name="CategoryName" Type="Edm.String"/>
        <Property Name="Description" Type="Edm.String"/>
        <NavigationProperty Name="Products" Type="Collection(ProductService.Product)" Partner="Category"/>
      </EntityType>
      
      <!-- Entity Container -->
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Products" EntityType="ProductService.Product">
          <NavigationPropertyBinding Path="Category" Target="Categories"/>
        </EntitySet>
        <EntitySet Name="Categories" EntityType="ProductService.Category">
          <NavigationPropertyBinding Path="Products" Target="Products"/>
        </EntitySet>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

### Mock Data

**webapp/localService/data/Categories.json**:
```json
[
  {
    "CategoryID": "NB",
    "CategoryName": "Notebooks",
    "Description": "Portable computers for mobile professionals"
  },
  {
    "CategoryID": "AC",
    "CategoryName": "Accessories",
    "Description": "Computer accessories and peripherals"
  },
  {
    "CategoryID": "SW",
    "CategoryName": "Software",
    "Description": "Software applications and licenses"
  }
]
```

**webapp/localService/data/Products.json**:
```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook Basic 15",
    "Description": "Notebook Basic 15 with 2,80 GHz quad core, 15\" LCD, 4 GB DDR3 RAM",
    "Price": "956.00",
    "CurrencyCode": "EUR",
    "CategoryID": "NB",
    "StockQuantity": 25
  },
  {
    "ProductID": "HT-1001",
    "Name": "Notebook Basic 17",
    "Description": "Notebook Basic 17 with 2,80 GHz quad core, 17\" LCD, 4 GB DDR3 RAM",
    "Price": "1249.00",
    "CurrencyCode": "EUR",
    "CategoryID": "NB",
    "StockQuantity": 18
  },
  {
    "ProductID": "HT-1002",
    "Name": "Notebook Professional 15",
    "Description": "Notebook Professional 15 with 3,2 GHz quad core, 15\" LCD, 8 GB DDR3 RAM",
    "Price": "1399.00",
    "CurrencyCode": "EUR",
    "CategoryID": "NB",
    "StockQuantity": 12
  },
  {
    "ProductID": "HT-2000",
    "Name": "Wireless Mouse",
    "Description": "Ergonomic wireless mouse with USB receiver",
    "Price": "29.99",
    "CurrencyCode": "EUR",
    "CategoryID": "AC",
    "StockQuantity": 150
  },
  {
    "ProductID": "HT-2001",
    "Name": "USB-C Hub",
    "Description": "7-port USB-C hub with HDMI and Ethernet",
    "Price": "79.99",
    "CurrencyCode": "EUR",
    "CategoryID": "AC",
    "StockQuantity": 45
  }
]
```

### Testing the Service

**Read Products**:
```
GET http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products
```

**Read Single Product with Category**:
```
GET http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products('HT-1000')?$expand=Category
```

**Filter Products by Category**:
```
GET http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products?$filter=CategoryID eq 'NB'
```

**Create New Product**:
```
POST http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products
Content-Type: application/json

{
  "ProductID": "HT-3000",
  "Name": "Office Suite Pro",
  "Description": "Professional office software suite",
  "Price": "199.99",
  "CurrencyCode": "EUR",
  "CategoryID": "SW",
  "StockQuantity": 999
}
```

**Update Product**:
```
PATCH http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products('HT-1000')
Content-Type: application/json

{
  "Price": "899.00",
  "StockQuantity": 30
}
```

**Delete Product**:
```
DELETE http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products('HT-3000')
```

---

## Example 2: Sales Orders with Items (One-Level Deep) ([Sample](../../../samples/sales-orders-app))

A hierarchical structure with parent-child relationship.

### Project Structure

```
my-app/
├── webapp/
│   ├── localService/
│   │   ├── metadata.xml
│   │   └── data/
│   │       ├── SalesOrders.json
│   │       ├── SalesOrderItems.json
│   │       ├── Products.json
│   │       └── Customers.json
│   └── manifest.json
└── ui5.yaml
```

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: sales-orders-app
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata/sap/SALES_ORDER_SRV
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
```

### Metadata (Simplified)

**webapp/localService/metadata.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="SalesService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <!-- Sales Order Entity -->
      <EntityType Name="SalesOrder">
        <Key>
          <PropertyRef Name="OrderID"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
        <Property Name="CustomerID" Type="Edm.String"/>
        <Property Name="OrderDate" Type="Edm.Date"/>
        <Property Name="TotalAmount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        <Property Name="Status" Type="Edm.String"/>
        
        <NavigationProperty Name="Items" Type="Collection(SalesService.SalesOrderItem)" Partner="SalesOrder"/>
        <NavigationProperty Name="Customer" Type="SalesService.Customer">
          <ReferentialConstraint Property="CustomerID" ReferencedProperty="CustomerID"/>
        </NavigationProperty>
      </EntityType>
      
      <!-- Sales Order Item Entity -->
      <EntityType Name="SalesOrderItem">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ItemNo"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
        <Property Name="ItemNo" Type="Edm.String" Nullable="false"/>
        <Property Name="ProductID" Type="Edm.String"/>
        <Property Name="Quantity" Type="Edm.Int32"/>
        <Property Name="UnitPrice" Type="Edm.Decimal" Scale="2" Precision="10"/>
        <Property Name="Amount" Type="Edm.Decimal" Scale="2" Precision="10"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        
        <NavigationProperty Name="SalesOrder" Type="SalesService.SalesOrder" Partner="Items">
          <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
        </NavigationProperty>
        <NavigationProperty Name="Product" Type="SalesService.Product">
          <ReferentialConstraint Property="ProductID" ReferencedProperty="ProductID"/>
        </NavigationProperty>
      </EntityType>
      
      <!-- Product Entity -->
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="ProductID" Type="Edm.String" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
        <Property Name="Price" Type="Edm.Decimal" Scale="2" Precision="10"/>
      </EntityType>
      
      <!-- Customer Entity -->
      <EntityType Name="Customer">
        <Key>
          <PropertyRef Name="CustomerID"/>
        </Key>
        <Property Name="CustomerID" Type="Edm.String" Nullable="false"/>
        <Property Name="CustomerName" Type="Edm.String"/>
        <Property Name="City" Type="Edm.String"/>
        <Property Name="Country" Type="Edm.String"/>
      </EntityType>
      
      <!-- Entity Container -->
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="SalesOrders" EntityType="SalesService.SalesOrder">
          <NavigationPropertyBinding Path="Items" Target="SalesOrderItems"/>
          <NavigationPropertyBinding Path="Customer" Target="Customers"/>
        </EntitySet>
        <EntitySet Name="SalesOrderItems" EntityType="SalesService.SalesOrderItem">
          <NavigationPropertyBinding Path="SalesOrder" Target="SalesOrders"/>
          <NavigationPropertyBinding Path="Product" Target="Products"/>
        </EntitySet>
        <EntitySet Name="Products" EntityType="SalesService.Product"/>
        <EntitySet Name="Customers" EntityType="SalesService.Customer"/>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

### Mock Data

**webapp/localService/data/Customers.json**:
```json
[
  {
    "CustomerID": "CUST001",
    "CustomerName": "ACME Corporation",
    "City": "San Francisco",
    "Country": "USA"
  },
  {
    "CustomerID": "CUST002",
    "CustomerName": "Global Tech Inc",
    "City": "New York",
    "Country": "USA"
  },
  {
    "CustomerID": "CUST003",
    "CustomerName": "European Enterprises",
    "City": "Berlin",
    "Country": "Germany"
  }
]
```

**webapp/localService/data/Products.json**:
```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook Basic 15",
    "Price": "956.00"
  },
  {
    "ProductID": "HT-1001",
    "Name": "Notebook Basic 17",
    "Price": "1249.00"
  },
  {
    "ProductID": "HT-2000",
    "Name": "Wireless Mouse",
    "Price": "29.99"
  }
]
```

**webapp/localService/data/SalesOrders.json**:
```json
[
  {
    "OrderID": "5000001",
    "CustomerID": "CUST001",
    "OrderDate": "2024-01-15",
    "TotalAmount": "1205.99",
    "CurrencyCode": "EUR",
    "Status": "DELIVERED"
  },
  {
    "OrderID": "5000002",
    "CustomerID": "CUST002",
    "OrderDate": "2024-01-18",
    "TotalAmount": "2498.00",
    "CurrencyCode": "USD",
    "Status": "IN_TRANSIT"
  },
  {
    "OrderID": "5000003",
    "CustomerID": "CUST003",
    "OrderDate": "2024-01-20",
    "TotalAmount": "986.99",
    "CurrencyCode": "EUR",
    "Status": "PROCESSING"
  }
]
```

**webapp/localService/data/SalesOrderItems.json**:
```json
[
  {
    "OrderID": "5000001",
    "ItemNo": "10",
    "ProductID": "HT-1000",
    "Quantity": 1,
    "UnitPrice": "956.00",
    "Amount": "956.00",
    "CurrencyCode": "EUR"
  },
  {
    "OrderID": "5000001",
    "ItemNo": "20",
    "ProductID": "HT-2000",
    "Quantity": 1,
    "UnitPrice": "29.99",
    "Amount": "29.99",
    "CurrencyCode": "EUR"
  },
  {
    "OrderID": "5000001",
    "ItemNo": "30",
    "ProductID": "HT-1001",
    "Quantity": 1,
    "UnitPrice": "1249.00",
    "Amount": "1249.00",
    "CurrencyCode": "EUR"
  },
  {
    "OrderID": "5000002",
    "ItemNo": "10",
    "ProductID": "HT-1001",
    "Quantity": 2,
    "UnitPrice": "1249.00",
    "Amount": "2498.00",
    "CurrencyCode": "USD"
  },
  {
    "OrderID": "5000003",
    "ItemNo": "10",
    "ProductID": "HT-1000",
    "Quantity": 1,
    "UnitPrice": "956.00",
    "Amount": "956.00",
    "CurrencyCode": "EUR"
  },
  {
    "OrderID": "5000003",
    "ItemNo": "20",
    "ProductID": "HT-2000",
    "Quantity": 1,
    "UnitPrice": "29.99",
    "Amount": "29.99",
    "CurrencyCode": "EUR"
  }
]
```

### Key Points

**Navigation Property Correlation**:
- Each `SalesOrderItem` has an `OrderID` that matches a `SalesOrder`'s `OrderID`
- The mockserver automatically filters items when you expand: `$expand=Items`
- The referential constraint in metadata defines this relationship

**Testing Deep Expansion**:
```
GET /SalesOrders('5000001')?$expand=Items($expand=Product),Customer
```

**Response** (showing nested navigation):
```json
{
  "OrderID": "5000001",
  "CustomerID": "CUST001",
  "OrderDate": "2024-01-15",
  "TotalAmount": "1205.99",
  "CurrencyCode": "EUR",
  "Status": "DELIVERED",
  "Customer": {
    "CustomerID": "CUST001",
    "CustomerName": "ACME Corporation",
    "City": "San Francisco",
    "Country": "USA"
  },
  "Items": [
    {
      "OrderID": "5000001",
      "ItemNo": "10",
      "ProductID": "HT-1000",
      "Quantity": 1,
      "UnitPrice": "956.00",
      "Amount": "956.00",
      "Product": {
        "ProductID": "HT-1000",
        "Name": "Notebook Basic 15",
        "Price": "956.00"
      }
    },
    {
      "OrderID": "5000001",
      "ItemNo": "20",
      "ProductID": "HT-2000",
      "Quantity": 1,
      "UnitPrice": "29.99",
      "Amount": "29.99",
      "Product": {
        "ProductID": "HT-2000",
        "Name": "Wireless Mouse",
        "Price": "29.99"
      }
    }
  ]
}
```

---

## Example 3: Draft-Enabled Entity ([Sample](../../../samples/draft-products-app))

Product management with draft functionality.

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: draft-products-app
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata4/sap/PRODUCTS_DRAFT/0001
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
            flexibleProgrammingModel: true
```

### Metadata (Draft-Enabled)

Key additions for draft support:

```xml
<EntityType Name="Product">
  <Key>
    <PropertyRef Name="ProductID"/>
    <PropertyRef Name="IsActiveEntity"/>
  </Key>
  <Property Name="ProductID" Type="Edm.String" Nullable="false"/>
  <Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
  <Property Name="HasActiveEntity" Type="Edm.Boolean"/>
  <Property Name="HasDraftEntity" Type="Edm.Boolean"/>
  <Property Name="Name" Type="Edm.String"/>
  <Property Name="Price" Type="Edm.Decimal" Scale="2" Precision="10"/>
  <!-- Other properties... -->
</EntityType>

<!-- Draft Actions -->
<Action Name="draftEdit" IsBound="true">
  <Parameter Name="in" Type="ProductService.Product"/>
  <ReturnType Type="ProductService.Product"/>
</Action>

<Action Name="draftActivate" IsBound="true">
  <Parameter Name="in" Type="ProductService.Product"/>
  <ReturnType Type="ProductService.Product"/>
</Action>

<Action Name="draftPrepare" IsBound="true">
  <Parameter Name="in" Type="ProductService.Product"/>
  <ReturnType Type="ProductService.Product"/>
</Action>
```

### Mock Data

**webapp/localService/data/Products.json**:
```json
[
  {
    "ProductID": "HT-1000",
    "IsActiveEntity": true,
    "HasActiveEntity": true,
    "HasDraftEntity": false,
    "Name": "Notebook Basic 15",
    "Price": "956.00",
    "CurrencyCode": "EUR"
  },
  {
    "ProductID": "HT-1001",
    "IsActiveEntity": true,
    "HasActiveEntity": true,
    "HasDraftEntity": true,
    "Name": "Notebook Basic 17",
    "Price": "1249.00",
    "CurrencyCode": "EUR"
  },
  {
    "ProductID": "HT-1001",
    "IsActiveEntity": false,
    "HasActiveEntity": true,
    "HasDraftEntity": false,
    "Name": "Notebook Professional 17",
    "Price": "1349.00",
    "CurrencyCode": "EUR"
  }
]
```

### Custom Draft Logic

**webapp/localService/data/Products.js**:
```javascript
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    if (actionDefinition.name === 'draftPrepare') {
      // Validation logic
      const errors = [];
      
      if (!actionData.Name || actionData.Name.length < 3) {
        errors.push({
          code: 'NAME_TOO_SHORT',
          message: 'Product name must be at least 3 characters long',
          severity: 'error',
          target: 'Name'
        });
      }
      
      if (parseFloat(actionData.Price) <= 0) {
        errors.push({
          code: 'INVALID_PRICE',
          message: 'Price must be greater than zero',
          severity: 'error',
          target: 'Price'
        });
      }
      
      // Warning for low stock
      if (actionData.StockQuantity < 10) {
        errors.push({
          code: 'LOW_STOCK',
          message: 'Stock quantity is below minimum threshold',
          severity: 'warning',
          target: 'StockQuantity'
        });
      }
      
      // Throw 412 in strict mode if there are errors
      const hasErrors = errors.some(m => m.severity === 'error');
      if (hasErrors && odataRequest.isStrictMode) {
        this.throwError('Draft validation failed', 412, {
          error: {
            code: 'DRAFT_VALIDATION_FAILED',
            message: 'Cannot activate draft due to validation errors',
            details: errors
          }
        });
      }

      // Tenant isolation showcase
      if (odataRequest.tenantId === 'tenant-001') {
        console.log('Serving data for tenant 001');
      }
      
      return actionData;
    }
  }
};
```

### Testing Draft Workflow

**1. Create Draft**:
```
POST /Products(ProductID='HT-1000',IsActiveEntity=true)/draftEdit
```

**2. Update Draft**:
```
PATCH /Products(ProductID='HT-1000',IsActiveEntity=false)
Content-Type: application/json

{
  "Name": "Updated Name",
  "Price": "999.00"
}
```

**3. Validate Draft**:
```
POST /Products(ProductID='HT-1000',IsActiveEntity=false)/draftPrepare
```

**4. Activate Draft**:
```
POST /Products(ProductID='HT-1000',IsActiveEntity=false)/draftActivate
```

---

## What's Next?

- 📚 **[Intermediate Examples](../intermediate/README.md)** - More complex scenarios
- 🚀 **[Advanced Features](../../advanced-features/README.md)** - Deep hierarchies, cross-service
- 🧪 **[OPA5 Testing](../../opa5-testing/README.md)** - Automated testing with mockserver
- 📖 **[Core Concepts](../../core-concepts/README.md)** - Understanding the fundamentals

