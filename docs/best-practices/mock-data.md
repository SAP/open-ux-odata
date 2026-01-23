# Best Practices - Mock Data

Essential strategies and patterns for creating effective, maintainable mock data for the FE Mockserver.

---

## Table of Contents

- [Data Generation Strategies](#data-generation-strategies)
- [Data Consistency](#data-consistency)
- [Large Datasets](#large-datasets)
- [Separate Mock Data Files](#separate-mock-data-files)

---

## Data Generation Strategies

### Manual Creation vs. Extraction from Backend

#### Manual Creation

**When to use**:
- Small datasets (< 50 entities)
- Test-specific scenarios
- Edge cases and error conditions
- Controlled, predictable data

**Example**:
```json
[
  {
    "ProductID": "TEST-001",
    "Name": "Test Product",
    "Price": "99.99",
    "StockQuantity": 10
  },
  {
    "ProductID": "EDGE-ZERO-PRICE",
    "Name": "Edge Case - Zero Price",
    "Price": "0.00",
    "StockQuantity": 0
  }
]
```

**Advantages**:
- ✅ Full control over data
- ✅ Easy to understand
- ✅ Perfect for specific test scenarios

**Disadvantages**:
- ❌ Time-consuming for large datasets
- ❌ May not reflect real data patterns

#### Backend Extraction

**When to use**:
- Large datasets (> 50 entities)
- Need realistic data patterns
- Testing performance with real volumes
- Demonstration purposes

**Tools for Data Extraction**:

**1. Direct OData Query**:
```bash
# Extract products
curl "https://backend.com/sap/opu/odata/sap/PRODUCTS_SRV/Products?\$top=100" \
  -H "Accept: application/json" \
  > Products.json

# Extract with relationships
curl "https://backend.com/sap/opu/odata/sap/PRODUCTS_SRV/Products?\$expand=Category&\$top=100" \
  -H "Accept: application/json" \
  > ProductsWithCategories.json
```

**2. Script-based Extraction**:
```javascript
// extract-data.js
const fetch = require('node-fetch');
const fs = require('fs');

async function extractData(entitySet, options = {}) {
  const baseUrl = 'https://backend.com/sap/opu/odata/sap/SERVICE';
  const params = new URLSearchParams({
    $top: options.top || 100,
    $skip: options.skip || 0,
    $expand: options.expand || '',
    $filter: options.filter || ''
  });
  
  const response = await fetch(`${baseUrl}/${entitySet}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from('user:pass').toString('base64')}`
    }
  });
  
  const data = await response.json();
  const results = data.d?.results || data.value || [];
  
  // Clean up data
  const cleaned = results.map(item => {
    delete item.__metadata;
    delete item.__deferred;
    return item;
  });
  
  // Save to file
  fs.writeFileSync(
    `./webapp/localService/data/${entitySet}.json`,
    JSON.stringify(cleaned, null, 2)
  );
  
  console.log(`✅ Extracted ${cleaned.length} items from ${entitySet}`);
}

// Extract multiple entity sets
async function extractAll() {
  await extractData('Products', { top: 50, expand: 'Category' });
  await extractData('Categories');
  await extractData('Customers', { top: 100 });
  await extractData('SalesOrders', { top: 200, expand: 'Items' });
}

extractAll().catch(console.error);
```

**3. SAP Gateway Client**:
```javascript
// Using @sap/odata-client
const { ODataClient } = require('@sap/odata-client');
const fs = require('fs');

const client = new ODataClient({
  baseURL: 'https://backend.com',
  auth: {
    username: 'user',
    password: 'pass'
  }
});

async function extract() {
  const products = await client
    .get('/sap/opu/odata/sap/PRODUCTS_SRV/Products')
    .query({ $top: 100, $expand: 'Category' })
    .execute();
  
  fs.writeFileSync(
    './webapp/localService/data/Products.json',
    JSON.stringify(products.data.value, null, 2)
  );
}
```

### Data Anonymization

When extracting from real systems, anonymize sensitive data:

```javascript
// anonymize-data.js
const fs = require('fs');

function anonymizeCustomers(customers) {
  return customers.map((customer, index) => ({
    ...customer,
    CustomerName: `Customer ${index + 1}`,
    Email: `customer${index + 1}@example.com`,
    Phone: `+1-555-${String(index).padStart(4, '0')}`,
    Address: `${index + 1} Main Street`,
    TaxID: `TAX-${String(index).padStart(6, '0')}`
  }));
}

function anonymizeSalesOrders(orders) {
  return orders.map((order, index) => ({
    ...order,
    CustomerPO: `PO-${String(index).padStart(6, '0')}`,
    // Keep amounts but round them
    TotalAmount: (Math.round(parseFloat(order.TotalAmount) / 100) * 100).toFixed(2)
  }));
}

// Load, anonymize, and save
const customers = JSON.parse(fs.readFileSync('./extracted/Customers.json'));
const anonymized = anonymizeCustomers(customers);
fs.writeFileSync('./webapp/localService/data/Customers.json', JSON.stringify(anonymized, null, 2));

console.log('✅ Data anonymized');
```

### Maintaining Realistic Relationships

**Parent-Child Consistency**:
```javascript
// generate-orders-with-items.js
const fs = require('fs');

function generateRealisticOrders(count = 50) {
  const orders = [];
  const items = [];
  const products = JSON.parse(fs.readFileSync('./Products.json'));
  
  for (let i = 1; i <= count; i++) {
    const orderID = `SO-${String(i).padStart(6, '0')}`;
    const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per order
    let orderTotal = 0;
    
    // Create order items
    for (let j = 1; j <= itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const amount = parseFloat(product.Price) * quantity;
      
      items.push({
        OrderID: orderID,
        ItemNo: String(j * 10).padStart(3, '0'),
        ProductID: product.ProductID,
        Quantity: quantity,
        UnitPrice: product.Price,
        Amount: amount.toFixed(2),
        CurrencyCode: 'EUR'
      });
      
      orderTotal += amount;
    }
    
    // Create order header
    orders.push({
      OrderID: orderID,
      CustomerID: `CUST-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`,
      OrderDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      TotalAmount: orderTotal.toFixed(2),
      CurrencyCode: 'EUR',
      Status: ['NEW', 'PROCESSING', 'CONFIRMED', 'DELIVERED'][Math.floor(Math.random() * 4)]
    });
  }
  
  fs.writeFileSync('./SalesOrders.json', JSON.stringify(orders, null, 2));
  fs.writeFileSync('./SalesOrderItems.json', JSON.stringify(items, null, 2));
  
  console.log(`✅ Generated ${orders.length} orders with ${items.length} items`);
}

generateRealisticOrders(50);
```

---

## Data Consistency

### Foreign Key Relationships

**Rule**: Every foreign key must reference an existing entity.

**Validation Script**:
```javascript
// validate-relationships.js
const fs = require('fs');

function validateForeignKeys() {
  const products = JSON.parse(fs.readFileSync('./Products.json'));
  const categories = JSON.parse(fs.readFileSync('./Categories.json'));
  
  const categoryIDs = new Set(categories.map(c => c.CategoryID));
  const errors = [];
  
  products.forEach(product => {
    if (product.CategoryID && !categoryIDs.has(product.CategoryID)) {
      errors.push(`Product ${product.ProductID} references non-existent category ${product.CategoryID}`);
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ Foreign key violations:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  console.log('✅ All foreign keys are valid');
}

validateForeignKeys();
```

### Parent-Child Entity Data Filtering

**Problem**: Child entities showing data from all parents.

**Solution**: Ensure child entities include parent keys.

**Example - Three-Level Hierarchy**:
```json
// SalesOrders.json
[
  {
    "OrderID": "SO-001",
    "CustomerID": "CUST-001",
    "TotalAmount": "5000.00"
  }
]

// SalesOrderItems.json - Level 2
[
  {
    "OrderID": "SO-001",      // Parent key
    "ItemNo": "10",
    "ProductID": "P001",
    "Amount": "2500.00"
  }
]

// ScheduleLines.json - Level 3
[
  {
    "OrderID": "SO-001",      // Grandparent key
    "ItemNo": "10",           // Parent key
    "ScheduleLineNo": "001",  // Own key
    "Quantity": 50
  }
]
```

**Verification Function**:
```javascript
// In SalesOrderItems.js
module.exports = {
  async onAfterRead(data, odataRequest) {
    // Verify all items belong to valid orders
    const orderInterface = await this.base.getEntityInterface('SalesOrders');
    const validOrderIDs = new Set(orderInterface.getData().map(o => o.OrderID));
    
    const orphans = data.filter(item => !validOrderIDs.has(item.OrderID));
    
    if (orphans.length > 0) {
      console.warn('⚠️ Found orphaned items:', orphans.map(i => i.OrderID + '-' + i.ItemNo));
    }
    
    return data;
  }
};
```

### Navigation Property Data Correlation

**Best Practice**: Document navigation property relationships.

**Documentation Template**:
```javascript
/**
 * Products Entity
 * 
 * Navigation Properties:
 * - Category (1:1): Products.CategoryID -> Categories.CategoryID
 * - Supplier (1:1): Products.SupplierID -> Suppliers.SupplierID
 * - OrderItems (1:n): Products.ProductID <- SalesOrderItems.ProductID
 * 
 * Mock Data Correlation:
 * - Categories.json must contain all CategoryID values referenced
 * - Suppliers.json must contain all SupplierID values referenced
 * - SalesOrderItems.json may reference ProductID (optional)
 */
module.exports = {
  // Implementation
};
```

### Metadata XML and Mock Data Alignment

**Checklist**:

```javascript
// alignment-check.js
const fs = require('fs');
const xml2js = require('xml2js');

async function checkAlignment() {
  // Parse metadata
  const metadataXml = fs.readFileSync('./metadata.xml', 'utf-8');
  const parser = new xml2js.Parser();
  const metadata = await parser.parseStringPromise(metadataXml);
  
  // Extract entity sets
  const entitySets = extractEntitySets(metadata);
  
  // Check each entity set has mock data
  entitySets.forEach(entitySet => {
    const jsonPath = `./data/${entitySet}.json`;
    const jsPath = `./data/${entitySet}.js`;
    
    if (!fs.existsSync(jsonPath) && !fs.existsSync(jsPath)) {
      console.warn(`⚠️ No mock data for ${entitySet}`);
    } else {
      console.log(`✅ ${entitySet} has mock data`);
    }
  });
}

checkAlignment();
```

### Common Mistakes and Solutions

#### Mistake 1: Circular References in JSON

```json
// ❌ Wrong - Can't have circular references in JSON
[
  {
    "ProductID": "P001",
    "Category": {
      "CategoryID": "CAT-1",
      "Products": [/* reference back to P001 */]
    }
  }
]

// ✅ Correct - Separate files, let mockserver resolve
// Products.json
[
  {
    "ProductID": "P001",
    "CategoryID": "CAT-1"
  }
]

// Categories.json
[
  {
    "CategoryID": "CAT-1",
    "CategoryName": "Category 1"
  }
]
```

#### Mistake 2: Inconsistent Date Formats

```json
// ❌ Wrong - Mixed formats
[
  {"OrderDate": "2024-01-15"},
  {"OrderDate": "15/01/2024"},
  {"OrderDate": "Jan 15, 2024"}
]

// ✅ Correct - ISO 8601 format consistently
[
  {"OrderDate": "2024-01-15"},
  {"OrderDate": "2024-01-16"},
  {"OrderDate": "2024-01-17"}
]
```

#### Mistake 3: Missing Required Fields

```json
// ❌ Wrong - Missing key field
[
  {
    "Name": "Product 1",
    "Price": "99.99"
  }
]

// ✅ Correct - All key fields present
[
  {
    "ProductID": "P001",  // Key field
    "Name": "Product 1",
    "Price": "99.99"
  }
]
```

---

## Large Datasets

### Performance Considerations

**Optimize for Common Queries**:
```javascript
// Products.js
module.exports = {
  // Cache frequently accessed data
  _categoryCache: null,
  
  async onAfterRead(data, odataRequest) {
    // Only fetch categories once
    if (!this._categoryCache) {
      const catInterface = await this.base.getEntityInterface('Categories');
      this._categoryCache = new Map(
        catInterface.getData().map(c => [c.CategoryID, c])
      );
    }
    
    // Enrich products with category names
    return data.map(product => ({
      ...product,
      CategoryName: this._categoryCache.get(product.CategoryID)?.CategoryName
    }));
  }
};
```

### Pagination Strategies

**Server-Side Pagination**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const top = parseInt(odataRequest.queryOptions?.$top) || 20;
    const skip = parseInt(odataRequest.queryOptions?.$skip) || 0;
    
    // For large datasets, implement efficient pagination
    if (data.length > 1000) {
      console.log(`📄 Paginating: skip=${skip}, top=${top}`);
      return data.slice(skip, skip + top);
    }
    
    return data;
  }
};
```

### Lazy Loading Simulation

**Load Related Data On-Demand**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const expand = odataRequest.queryOptions?.$expand;
    
    // Only load items if explicitly expanded
    if (expand && expand.includes('Items')) {
      const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
      
      return data.map(order => {
        const items = itemInterface.getData()
          .filter(item => item.OrderID === order.OrderID);
        
        return { ...order, Items: items };
      });
    }
    
    // Return without items for better performance
    return data;
  }
};
```

### Memory Management

**Chunked Data Generation**:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    const chunkSize = 100;
    const totalRecords = 10000;
    
    // Generate in chunks to avoid memory issues
    const data = [];
    
    for (let i = 0; i < totalRecords; i += chunkSize) {
      const chunk = this.generateChunk(i, Math.min(chunkSize, totalRecords - i));
      data.push(...chunk);
      
      // Allow garbage collection between chunks
      if (i % 1000 === 0) {
        console.log(`Generated ${i} / ${totalRecords} records`);
      }
    }
    
    return data;
  },
  
  generateChunk: function(start, count) {
    return Array.from({ length: count }, (_, i) => ({
      ProductID: `P${String(start + i + 1).padStart(8, '0')}`,
      Name: `Product ${start + i + 1}`,
      Price: (Math.random() * 1000).toFixed(2)
    }));
  }
};
```

---

## Separate Mock Data Files

### Per-Service Organization

**Project Structure**:
```
webapp/
└── localService/
    ├── main/
    │   ├── metadata.xml
    │   └── data/
    │       ├── SalesOrders.json
    │       └── SalesOrderItems.json
    ├── products/
    │   ├── metadata.xml
    │   └── data/
    ��       ├── Products.json
    │       └── Categories.json
    └── valuehelp/
        ├── metadata.xml
        └── data/
            ├── Currencies.json
            └── Countries.json
```

### Per-Entity-Set Files

**Organize by Domain**:
```
data/
├── master-data/
│   ├── Products.json
│   ├── Categories.json
│   ├── Suppliers.json
│   └── Customers.json
├── transactional/
│   ├── SalesOrders.json
│   ├── SalesOrderItems.json
│   └── Invoices.json
└── configuration/
    ├── Currencies.json
    ├── Countries.json
    └── Units.json
```

### Tenant-Specific Data Files

**Multi-Tenancy Support**:
```
data/
├── Products.json              # Base/default data
├── Products-100.json          # Tenant 100 specific
├── Products-200.json          # Tenant 200 specific
└── Products-300.json          # Tenant 300 specific
```

**Tenant-Aware Loading**:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    // contextId contains tenant ID
    const fs = require('fs');
    const path = require('path');
    
    // Try tenant-specific file first
    if (contextId) {
      const tenantFile = path.join(__dirname, `Products-${contextId}.json`);
      if (fs.existsSync(tenantFile)) {
        console.log(`Loading tenant-specific data for ${contextId}`);
        return JSON.parse(fs.readFileSync(tenantFile, 'utf-8'));
      }
    }
    
    // Fall back to default
    const defaultFile = path.join(__dirname, 'Products.json');
    return JSON.parse(fs.readFileSync(defaultFile, 'utf-8'));
  }
};
```

### Version Control Strategies

**Git Structure**:
```
.gitignore:
# Ignore generated/extracted data
/webapp/localService/data/extracted/
/webapp/localService/data/*.backup.json

# Keep test data
!/webapp/test/mockdata/**/*.json
```

**Separate Repositories for Large Datasets**:
```bash
# Main app repo
my-app/
├── .git/
└── webapp/
    └── localService/
        └── data/ -> ../../../mock-data-repo/data  # Symlink

# Separate mock data repo
mock-data-repo/
├── .git/
└── data/
    ├── Products.json (10MB)
    └── SalesOrders.json (50MB)
```

**NPM Package for Shared Mock Data**:
```json
{
  "name": "@mycompany/sap-mock-data",
  "version": "1.0.0",
  "files": ["data/"],
  "dependencies": {}
}
```

```yaml
# In ui5.yaml
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    metadataPath: ./webapp/localService/metadata.xml
    mockdataPath: ./node_modules/@mycompany/sap-mock-data/data
```

---

## What's Next?

- 📚 **[Advanced Examples](../examples/advanced/README.md)** - See best practices in action
- 🔍 **[Troubleshooting](../troubleshooting/README.md)** - Solve data-related issues
- 📖 **[Configuration Reference](../configuration-reference/README.md)** - All configuration options
- 🧪 **[OPA5 Testing](../opa5-testing/README.md)** - Best practices for test data

