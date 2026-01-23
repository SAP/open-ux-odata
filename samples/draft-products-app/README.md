# Draft-Enabled Products Example

This is Example 3 from the Basic Examples documentation - product management with draft functionality.

## Features

- Draft-enabled entity with key properties (IsActiveEntity, HasActiveEntity, HasDraftEntity)
- Draft actions (draftEdit, draftActivate, draftPrepare)
- Custom validation logic in draftPrepare
- Flexible Programming Model support

## Running the Example

1. Install dependencies (from the workspace root):
   ```bash
   pnpm install
   ```

2. Start the mockserver:
   ```bash
   cd samples/draft-products-app
   npx ui5 serve
   ```

3. Test the draft workflow:
   ```bash
   # Get all active products
   curl "http://localhost:8080/sap/opu/odata4/sap/PRODUCTS_DRAFT/0001/Products?\$filter=IsActiveEntity eq true"
   
   # Create a draft (edit existing product)
   curl -X POST "http://localhost:8080/sap/opu/odata4/sap/PRODUCTS_DRAFT/0001/Products(ProductID='HT-1000',IsActiveEntity=true)/draftEdit"
   
   # Update the draft
   curl -X PATCH "http://localhost:8080/sap/opu/odata4/sap/PRODUCTS_DRAFT/0001/Products(ProductID='HT-1000',IsActiveEntity=false)" \
     -H "Content-Type: application/json" \
     -d '{"Name": "Updated Notebook", "Price": "999.00"}'
   
   # Validate draft (runs custom validation)
   curl -X POST "http://localhost:8080/sap/opu/odata4/sap/PRODUCTS_DRAFT/0001/Products(ProductID='HT-1000',IsActiveEntity=false)/draftPrepare"
   
   # Activate draft
   curl -X POST "http://localhost:8080/sap/opu/odata4/sap/PRODUCTS_DRAFT/0001/Products(ProductID='HT-1000',IsActiveEntity=false)/draftActivate"
   ```

## Draft Workflow

1. **Create Draft**: Call `draftEdit` action on an active entity
2. **Modify Draft**: Use PATCH to update draft properties
3. **Validate**: Call `draftPrepare` to run validation logic
4. **Activate**: Call `draftActivate` to make changes permanent

## Custom Validation

The `Products.js` file contains custom validation logic that:
- Validates product name length (minimum 3 characters)
- Ensures price is greater than zero
- Warns about low stock quantities
- Returns validation errors in strict mode

## Project Structure

```
draft-products-app/
├── webapp/
│   └── localService/
│       ├── metadata.xml
│       └── data/
│           ├── Products.json
│           └── Products.js (custom logic)
└── ui5.yaml
```

## Documentation

For more details, see the [Basic Examples documentation](../../docs/examples/basic/README.md#example-3-draft-enabled-entity).

