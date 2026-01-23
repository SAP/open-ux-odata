# Sales Orders Example

This is Example 2 from the Basic Examples documentation - a hierarchical structure with parent-child relationships.

## Features

- Sales Order header and items (one-level deep hierarchy)
- Multiple entity relationships (Customer, Product)
- Navigation properties with referential constraints
- Deep expansion support

## Running the Example

1. Install dependencies (from the workspace root):
   ```bash
   pnpm install
   ```

2. Start the mockserver:
   ```bash
   cd samples/sales-orders-app
   npx ui5 serve
   ```

3. Test the service:
   ```bash
   # Get all sales orders
   curl http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrders
   
   # Get order with items and customer
   curl "http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrders('5000001')?\$expand=Items(\$expand=Product),Customer"
   
   # Get all items for an order
   curl "http://localhost:8080/sap/opu/odata/sap/SALES_ORDER_SRV/SalesOrders('5000001')/Items"
   ```

## Key Points

- **Navigation Property Correlation**: Each `SalesOrderItem` has an `OrderID` that matches a `SalesOrder`'s `OrderID`
- **Automatic Filtering**: The mockserver automatically filters items when you expand: `$expand=Items`
- **Referential Constraints**: Defined in metadata to establish relationships

## Project Structure

```
sales-orders-app/
├── webapp/
│   └── localService/
│       ├── metadata.xml
│       └── data/
│           ├── SalesOrders.json
│           ├── SalesOrderItems.json
│           ├── Products.json
│           └── Customers.json
└── ui5.yaml
```

## Documentation

For more details, see the [Basic Examples documentation](../../docs/examples/basic/README.md#example-2-sales-orders-with-items-one-level-deep).

