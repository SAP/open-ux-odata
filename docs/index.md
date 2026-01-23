# SAP Fiori Elements Mockserver Documentation

Welcome to the comprehensive documentation for the SAP Fiori Elements (FE) Mockserver. This tool enables you to develop and test SAP Fiori applications locally without requiring a backend connection.

---

## 🚀 Quick Links

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">

### 📖 [Getting Started](./getting-started/README.md)
New to the mockserver? Start here for installation, setup, and your first configuration.

### 🧠 [Core Concepts](./core-concepts/README.md)
Understand mock data, entity sets, navigation properties, and request handling.

### ⚙️ [Configuration Reference](./configuration-reference/README.md)
Complete guide to YAML and JavaScript configuration options.

### 📚 [Examples](./examples/README.md)
Working examples from basic CRUD to advanced S/4HANA scenarios.

### 🔧 [API Reference](./MockserverAPI.md)
Detailed API documentation for customizing mockserver behavior.

### 🐛 [Troubleshooting](./troubleshooting/README.md)
Common issues, debugging techniques, and solutions.

</div>

---

## ✨ Key Features

### 🎯 Full OData Support
- **OData v2 and v4** protocol support
- Complete CRUD operations out of the box
- Advanced query options: `$filter`, `$expand`, `$select`, `$orderby`
- Navigation property resolution
- Function and action handling

### 📝 Draft Functionality
- Full draft/active entity support
- Draft actions: `draftEdit`, `draftPrepare`, `draftActivate`
- Validation and error handling
- Strict and non-strict modes

### 🔗 Multi-Service Support
- Configure multiple OData services simultaneously
- Cross-service communication
- Service aliases for cleaner code
- Value help services

### 🛠️ Highly Customizable
- JavaScript/TypeScript extensibility
- Custom action implementations
- Dynamic data generation
- Tenant-based isolation
- Custom error responses

### 🧪 Perfect for Testing
- OPA5 test integration
- Deterministic, consistent data
- Isolated test environments
- Mock complex scenarios


## 🎓 Learning Paths

### For Beginners

**Goal**: Understand basics and get a simple app running

1. **[Introduction](./getting-started/README.md#introduction)** - What is the mockserver?
2. **[Quick Start](./getting-started/README.md#quick-start-guide)** - Set up in 5 minutes
3. **[Simple CRUD Example](./examples/basic/README.md#example-1-simple-product-catalog-with-crud)** - Your first entity set
4. **[Navigation Properties](./core-concepts/README.md#navigation-properties)** - Understanding relationships

**Time Investment**: ~1 hour  
**What You'll Build**: A working product catalog

### For Intermediate Users

**Goal**: Handle complex scenarios and multiple services

1. **[Draft Entities](./core-concepts/README.md#draft-vs-active-data)** - Working with drafts
2. **[Custom Actions](./configuration-reference/README.md#executeaction---actionfunction-handling)** - Implement business logic
3. **[Multiple Services](./configuration-reference/README.md#multiple-services)** - Configure multiple OData services
4. **[Sales Order Example](./examples/basic/README.md#example-2-sales-orders-with-items-one-level-deep-samplesales-orders-app)** - Two levels of data

**Time Investment**: ~3 hours  
**What You'll Build**: Multi-service application with custom logic

### For Advanced Users

**Goal**: Master S/4HANA scenarios and OPA5 testing

1. **[Recursive Hierarchy](./advanced-features/README.md#recursive-hierarchy)** - Self-referential entities
2. **[Advanced Features](./advanced-features/README.md)** - Deep hierarchies and cross-service
3. **[Error Handling](./MockserverAPI.md#throwerror)** - Complex validation scenarios
4. **[Advanced Examples](./examples/advanced/README.md)** - S/4HANA patterns

**Time Investment**: ~8 hours  
**What You'll Build**: Production-ready test infrastructure

---

## 🔍 Find What You Need

### By Task

| I want to... | Go to... |
|--------------|----------|
| Install and configure the mockserver | [Getting Started](./getting-started/README.md) |
| Understand navigation properties | [Core Concepts - Navigation Properties](./core-concepts/README.md#navigation-properties) |
| Set up multiple OData services | [Configuration - Multiple Services](./configuration-reference/README.md#multiple-services) |
| Implement custom actions | [API Reference - executeAction](./MockserverAPI.md#executeaction) |
| Work with draft entities | [Core Concepts - Draft vs Active](./core-concepts/README.md#draft-vs-active-data) |
| Generate mock data dynamically | [API Reference - getInitialDataSet](./MockserverAPI.md#getinitialdataset) |
| Handle errors and validation | [API Reference - throwError](./MockserverAPI.md#throwerror) |
| Model recursive hierarchies | [Advanced Features - Recursive Hierarchy](./advanced-features/README.md#recursive-hierarchy) |
| Debug issues | [Troubleshooting](./troubleshooting/README.md) |

### By Concept

| Concept | Documentation |
|---------|---------------|
| Entity Sets | [Core Concepts - Entity Sets](./core-concepts/README.md#defining-entity-sets) |
| Singletons | [Core Concepts - Singletons](./core-concepts/README.md#working-with-singletons) |
| $expand Queries | [Core Concepts - $expand](./core-concepts/README.md#expand---deep-data-retrieval) |
| Recursive Hierarchy | [Advanced Features - Recursive Hierarchy](./advanced-features/README.md#recursive-hierarchy) |
| Mock Data Files | [Core Concepts - Mock Data Fundamentals](./core-concepts/README.md#mock-data-fundamentals) |
| Referential Constraints | [Core Concepts - Associations](./core-concepts/README.md#associations-and-referential-constraints) |
| Context-Based Isolation | [Configuration Reference](./configuration-reference/README.md#context-and-tenant-support) |
| TypeScript Support | [TypeScript Support Documentation](./TypeScriptSupport.md) |
| TypeScript Types | [Quick Start Guide](./getting-started/README.md#quick-start-guide) |

---

## 💡 Common Scenarios

### Scenario 1: Frontend Development Without Backend

**Use Case**: Your team is building a Fiori app, but the backend isn't ready yet.

**Solution**:
1. Get metadata from backend team (or create your own)
2. Configure mockserver with `generateMockData: true`
3. Start developing immediately
4. Switch to real backend when ready

**Resources**: [Quick Start Guide](./getting-started/README.md#quick-start-guide)

### Scenario 2: Demonstrating Features

**Use Case**: You need to demo a feature without backend access or with controlled data.

**Solution**:
1. Create realistic mock data
2. Implement custom actions for interactive demos
3. Use draft mode to show workflows
4. Run completely offline

**Resources**: [Examples](./examples/README.md)

---

## 🛠️ Installation

### Prerequisites

- **Node.js**: Version >= 18.0.0 < 19.0.0 || >= 20.0.0 < 21.0.0
- **npm** or **pnpm**: Package manager

### Install

```bash
# Using npm
npm install --save-dev @sap-ux/ui5-middleware-fe-mockserver

# Using pnpm
pnpm add -D @sap-ux/ui5-middleware-fe-mockserver
```

## 🎯 TypeScript Support

The mockserver provides full TypeScript support, allowing you to define your mockdata logic with type safety and autocompletion.

For more details, see the [TypeScript Support Documentation](./TypeScriptSupport.md).

### Example

```typescript
import { 
  MockDataContributor, 
  NavPropTo 
} from '@sap-ux/fe-mockserver-core';

interface Product {
  ProductID: string;
  Name: string;
  Category?: NavPropTo<Category>;  // Single navigation
  Items?: NavPropTo<Item[]>;        // Collection navigation
}

const ProductMock: MockDataContributor = {
  getInitialDataSet(contextId: string): object[] {
    return [/* ... */];
  }
};

export = ProductMock;
```

---

## 🤝 Community & Support

### Getting Help

- **Documentation**: You're reading it! Start with [Getting Started](./getting-started/README.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/SAP/open-ux-odata/issues)

### Contributing

We welcome contributions! See:
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

### Resources

- **SAP Community**: [SAP Fiori Tools](https://community.sap.com/topics/fiori-tools)
- **Video**: [Mockserver Overview](https://www.youtube.com/watch?v=er6Mx93shJI)
- **Blog**: [Marian Zeis' Tutorial](https://marianfoo.github.io/ui5-fe-mockserver-tutorial/)


## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](../LICENSE) file for details.

---


<div align="center">

**Ready to get started?**

[Get Started](./getting-started/README.md) | [View Examples](./examples/README.md) | [API Reference](./MockserverAPI.md)

---

Made with ❤️ by the SAP Open UX team

</div>

