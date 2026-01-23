# Product Catalog Example

This is Example 1 from the Basic Examples documentation - a simple product catalog with CRUD operations.

## Features

- Product and Category entities
- Navigation between Products and Categories
- Full CRUD support
- Filtering and expansion

## Running the Example

1. Install dependencies (from the workspace root):
   ```bash
   pnpm install
   ```

2. Start the mockserver:
   ```bash
   cd samples/product-catalog
   npx ui5 serve
   ```

3. Test the service:
   ```bash
   # Read Products
   curl http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products
   
   # Read Single Product with Category
   curl "http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products('HT-1000')?\$expand=Category"
   
   # Filter Products by Category
   curl "http://localhost:8080/sap/opu/odata/sap/PRODUCTS_SRV/Products?\$filter=CategoryID eq 'NB'"
   ```

## Project Structure

```
product-catalog/
├── webapp/
│   └── localService/
│       ├── metadata.xml
│       └── data/
│           ├── Products.json
│           └── Categories.json
└── ui5.yaml
```

## Documentation

For more details, see the [Basic Examples documentation](../../docs/examples/basic/README.md#example-1-simple-product-catalog-with-crud).

