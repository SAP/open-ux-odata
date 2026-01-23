# Multiple Services with Cross-References Sample

This sample demonstrates how to configure and use multiple OData services with cross-service communication and validation.

## Features

- ✅ Three independent OData services
- ✅ Cross-service data validation
- ✅ Automatic stock management
- ✅ Service aliases for clean code
- ✅ Auto-fill from product master
- ✅ Value help integration

## Project Structure

```
multi-service/
├── ui5.yaml
├── package.json
└── webapp/
    └── localService/
        ├── sales/                      # Sales Order Service
        │   ├── metadata.xml
        │   └── data/
        │       ├── SalesOrders.json
        │       ├── SalesOrderItems.js  # Cross-service validation
        │       └── Customers.json
        ├── products/                   # Product Master Service
        │   ├── metadata.xml
        │   └── data/
        │       ├── Products.json
        │       └── Categories.json
        └── valuehelp/                  # Value Help Service
            ├── metadata.xml
            └── data/
                ├── Currencies.json
                └── Countries.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the mockserver:
```bash
npm start
```

3. Open browser:
```
http://localhost:8080
```

## Testing

### Test 1: Create Item with Valid Product

```bash
POST http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "10",
  "ProductID": "MAT-1000",
  "Quantity": "2.000"
}
```

**Expected**: Success with auto-filled Description, UnitPrice, and Amount

### Test 2: Insufficient Stock

```bash
POST http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "20",
  "ProductID": "MAT-1002",
  "Quantity": "20.000"
}
```

**Expected**: 400 Error - Only 10 units available

### Test 3: Invalid Product

```bash
POST http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrderItems
Content-Type: application/json

{
  "OrderID": "SO-001",
  "ItemNo": "30",
  "ProductID": "INVALID",
  "Quantity": "1.000"
}
```

**Expected**: 400 Error - Product does not exist

### Test 4: Check Product Stock

```bash
GET http://localhost:8080/sap/opu/odata/sap/PRODUCT_MASTER_SRV/Products('MAT-1000')
```

### Test 5: Get Value Helps

```bash
GET http://localhost:8080/sap/opu/odata/sap/VALUE_HELP_SRV/Currencies
GET http://localhost:8080/sap/opu/odata/sap/VALUE_HELP_SRV/Countries
```

## Key Features Demonstrated

### 1. Cross-Service Validation

The `SalesOrderItems.js` file implements validation against the product master service:

```javascript
const productService = await this.base.getEntityInterface('Products', 'products');
const product = productService.fetchEntries({ ProductID: data.ProductID });
```

### 2. Automatic Stock Updates

After creating an item, stock is automatically decremented:

```javascript
const newStock = product.StockQuantity - parseFloat(data.Quantity);
await productService.updateEntry({ ProductID: data.ProductID }, { StockQuantity: newStock });
```

### 3. Auto-Fill from Master Data

Product details are automatically populated:
- Description from ProductName
- UnitPrice from Price
- Amount calculated (Price × Quantity)

### 4. Service Aliases

Clean service references using aliases:
- `sales` → /sap/opu/odata/sap/SALES_ORDER_SRV
- `products` → /sap/opu/odata/sap/PRODUCT_MASTER_SRV
- `valuehelp` → /sap/opu/odata/sap/VALUE_HELP_SRV

## Learn More

- [Documentation: Cross-Service Communication](../../docs/advanced-features/README.md#multiple-services-and-cross-service-communication)
- [Documentation: Multi-Service Configuration](../../docs/configuration-reference/README.md#configuring-single-vs-multiple-services)
specVersion: "3.0"
metadata:
  name: multi-service-app
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

