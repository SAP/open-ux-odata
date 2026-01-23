# FE Mockserver Examples

Complete working examples demonstrating various mockserver features and use cases.

---

## 📚 Example Categories

### [Basic Examples](./basic/README.md)

Perfect for getting started with the mockserver. ([See all basic samples](../../samples/README.md#basic-examples))

- **Simple Product Catalog with CRUD** - Basic entity set operations ([Sample](../../samples/product-catalog))
- **Sales Orders with Items** - One-level hierarchical data with navigation properties ([Sample](../../samples/sales-orders-app))
- **Draft-Enabled Entity with Tenant Isolation** - Working with drafts and multi-tenancy ([Sample](../../samples/draft-products-app))

**Complexity**: ⭐ Beginner  
**Time to Complete**: 15-30 minutes each

---

### [Intermediate Examples](./intermediate/README.md)

More complex scenarios for real-world applications. ([See all intermediate samples](../../samples/README.md#intermediate-examples))

- **Filter Bar with Value Helps** - Value help entities and filter dependencies ([Sample](../../samples/vh-filter-bar))
- **Custom Actions Implementation** - Factory actions, bound actions, and functions ([Sample](../../samples/custom-actions))
- **Multiple Services with Cross-References** - Working with multiple OData services ([Sample](../../samples/multi-service))

**Complexity**: ⭐⭐ Intermediate  
**Time to Complete**: 30-60 minutes each

---

### [Advanced Examples](./advanced/README.md)

Complex S/4HANA scenarios and advanced features. ([See all advanced samples](../../samples/README.md#advanced-examples))

- **Three-Level Hierarchy** - Deep nested structures (Orders → Items → Schedule Lines) ([Sample](../../samples/three-level-hierarchy))
- **Recursive Hierarchy** - Self-referential entities and recursive expansion ([Sample](../../samples/recursive-hierarchy))
- **CDS Views with Parameters** - Parameter entities with value helps ([Sample](../../samples/cds-parameters))

**Complexity**: ⭐⭐⭐ Advanced  
**Time to Complete**: 1-2 hours each

---

## 🎯 Quick Navigation by Feature

| Feature | Example | Level |
|---------|---------|-------|
| CRUD Operations | [Simple Product Catalog](./basic/README.md#example-1-simple-product-catalog-with-crud) | Basic |
| Navigation Properties | [Sales Orders with Items](./basic/README.md#example-2-sales-orders-with-items-one-level-deep) | Basic |
| Draft Handling | [Draft-Enabled Entity with Tenant Isolation](./basic/README.md#example-3-draft-enabled-entity) | Basic |
| $expand Queries | [Sales Orders with Items](./basic/README.md#example-2-sales-orders-with-items-one-level-deep) | Basic |
| Value Helps | [Filter Bar with Value Helps](./intermediate/README.md#filter-bar-with-value-helps) | Intermediate |
| Custom Actions | [Custom Actions Implementation](./intermediate/README.md#custom-actions-implementation) | Intermediate |
| Multi-Service Scenario | [Multiple Services](./intermediate/README.md#multiple-services-with-cross-references) | Intermediate |
| Deep Hierarchies | [Three-Level Hierarchy](./advanced/README.md#three-level-hierarchy) | Advanced |
| Recursive Hierarchy | [Recursive Hierarchy](./advanced/README.md#recursive-hierarchy) | Advanced |
| CDS View Parameters | [CDS Views with Parameters](./advanced/README.md#cds-views-with-parameters) | Advanced |
| Error Handling | [412 Warnings](./advanced/README.md#412-warnings-in-strictnon-strict-mode) | Advanced |

---

## 📖 Example Structure

Each example includes:

✅ **Complete Project Structure** - All files and folders  
✅ **Configuration Files** - `ui5.yaml` or JavaScript config  
✅ **Metadata XML** - OData service definition  
✅ **Mock Data (JSON)** - Realistic test data  
✅ **Custom JavaScript** - Action handlers and logic (when applicable)  
✅ **Test Requests** - Example OData queries  
✅ **Expected Responses** - What you should see  
✅ **Key Concepts** - What you'll learn  

---

## 🚀 Getting Started

1. **Choose an example** based on your needs
2. **Copy the files** to your project
3. **Run the mockserver**: `ui5 serve` or `npm start`
4. **Test the endpoints** using the provided requests
5. **Modify and experiment** to learn

---

## 💡 Learning Path

### For Beginners

Start here if you're new to the FE Mockserver:

1. [Simple Product Catalog](./basic/README.md#example-1-simple-product-catalog-with-crud) - Understand basic CRUD
2. [Sales Orders with Items](./basic/README.md#example-2-sales-orders-with-items-one-level-deep) - Learn navigation properties
3. [Draft-Enabled Entity](./basic/README.md#example-3-draft-enabled-entity) - Work with drafts

### For Intermediate Users

Already familiar with basics? Try these:

1. [Filter Bar with Value Helps](./intermediate/README.md#filter-bar-with-value-helps) - Set up filter dependencies
2. [Custom Actions](./intermediate/README.md#custom-actions-implementation) - Implement business logic
3. [Multiple Services](./intermediate/README.md#multiple-services-with-cross-references) - Connect multiple OData services

### For Advanced Users

Ready for complex S/4HANA scenarios:

1. [Three-Level Hierarchy](./advanced/README.md#three-level-hierarchy) - Deep nested structures
2. [Recursive Hierarchy](./advanced/README.md#recursive-hierarchy) - Self-referential entities
3. [Complex Error Handling](./advanced/README.md#412-warnings-in-strictnon-strict-mode) - Validation and warnings

---

## 🔧 Common Use Cases

### Testing OPA5

Looking to set up automated tests? See:
- [OPA5 Testing Integration](../opa5-testing/README.md)
- Basic examples work great as starting points for OPA5 tests

### S/4HANA Development

Working with S/4HANA services? Check:
- [Advanced Examples](./advanced/README.md) for S/4HANA-specific patterns
- Examples include typical S/4HANA entity structures

### Offline Development

Need to work without backend access?
- All examples work 100% offline
- Use `generateMockData: true` for quick prototypes

---

## 📝 Notes

### TypeScript Support

All JavaScript examples can be converted to TypeScript:

```typescript
import { MockDataContributor } from '@sap-ux/fe-mockserver-core';

const ProductMock: MockDataContributor = {
  executeAction(actionDefinition, actionData, keys, odataRequest) {
    // Your implementation
  }
};

export = ProductMock;
```

### Data Correlation

**Important**: When working with navigation properties:
- Foreign keys in child entities must match parent keys
- Use referential constraints in metadata
- The mockserver handles filtering automatically

Example:
```json
// Parent: SalesOrders.json
{"OrderID": "5000001", ...}

// Child: SalesOrderItems.json
{"OrderID": "5000001", "ItemNo": "10", ...}  // OrderID must match!
```

---

## 🆘 Need Help?

- **Getting Started**: [Getting Started Guide](../getting-started/README.md)
- **Core Concepts**: [Core Concepts](../core-concepts/README.md)
- **Configuration**: [Configuration Reference](../configuration-reference/README.md)
- **API Reference**: [Mockserver API](../MockserverAPI.md)
- **Troubleshooting**: [Common Issues](../troubleshooting/README.md)
