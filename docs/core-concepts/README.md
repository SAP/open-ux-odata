# Core Concepts

This guide covers the fundamental concepts you need to understand to effectively use the FE Mockserver.

---

## Mock Data Fundamentals

### Auto-Generation of Mock Data

The mockserver can automatically generate sample data for your entity sets when `generateMockData: true` is configured:

```yaml
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    metadataPath: ./webapp/localService/metadata.xml
    mockdataPath: ./webapp/localService/data
    generateMockData: true  # Auto-generate data
```

**What gets generated:**
- Basic data types filled with sample values
- String fields: "Sample Text", "Item 1", "Item 2", etc.
- Numbers: Sequential integers or random decimals
- Dates: Current date or date ranges
- Booleans: Alternating true/false values

**Limitations:**
- Generated data is generic and may not reflect real business scenarios
- Navigation properties are not automatically populated
- No semantic relationships between entities

### JSON vs. JavaScript Mock Data Files

You have two options for providing mock data:

#### Option 1: Static JSON Files (Simple)

Create a JSON file matching your entity set name:

**File**: `webapp/localService/data/Products.json`

```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook Basic 15",
    "Description": "Notebook Basic 15 with 2,80 GHz quad core, 15\" LCD, 4 GB DDR3 RAM",
    "Price": "956.00",
    "CurrencyCode": "EUR",
    "Category": "Notebooks"
  },
  {
    "ProductID": "HT-1001",
    "Name": "Notebook Basic 17",
    "Description": "Notebook Basic 17 with 2,80 GHz quad core, 17\" LCD, 4 GB DDR3 RAM",
    "Price": "1249.00",
    "CurrencyCode": "EUR",
    "Category": "Notebooks"
  }
]
```

**When to use**: 
- Static, unchanging test data
- Simple scenarios without complex logic
- When you want to version control your test data exactly

#### Option 2: Dynamic JavaScript Files (Advanced)

Create a JavaScript file with the same entity set name:

**File**: `webapp/localService/data/Products.js`

```javascript
module.exports = {
  // Generate data dynamically
  getInitialDataSet: function(contextId) {
    const products = [];
    for (let i = 0; i < 10; i++) {
      products.push({
        ProductID: `HT-${1000 + i}`,
        Name: `Product ${i + 1}`,
        Price: `${(Math.random() * 1000).toFixed(2)}`,
        CurrencyCode: "EUR",
        Category: i % 2 === 0 ? "Notebooks" : "Accessories"
      });
    }
    return products;
  }
};
```

**When to use**:
- Dynamic data generation
- Tenant-specific data (using `contextId`)
- Complex data relationships
- Conditional logic

### File Naming Conventions

The mockserver follows strict naming conventions:

| Entity Type | File Name Pattern | Example |
|-------------|------------------|---------|
| Entity Set | `<EntitySetName>.json` or `.js` | `Products.json`, `SalesOrders.js` |
| Singleton | `<SingletonName>.json` or `.js` | `CompanyInfo.json` |
| Tenant-specific | `<EntitySetName>-<tenantId>.json` | `Products-100.json` |
| Entity Container | `EntityContainer.js` | For unbound actions |

**Important Rules:**
- Names are **case-sensitive** and must match exactly
- Use the **entity set name**, not the entity type name
- For OData v4: Use the entity set name from metadata
- For OData v2: Use the entity set name from metadata

**Example from metadata:**

```xml
<!-- OData v4 -->
<EntitySet Name="Products" EntityType="MyService.Product"/>
<!-- File should be: Products.json -->

<!-- OData v2 -->
<EntitySet Name="ProductSet" EntityType="MyService.Product"/>
<!-- File should be: ProductSet.json -->
```

### Data Consistency Across Related Entities

When working with related entities, maintaining data consistency is crucial:

#### Example: Products and Categories

**Metadata**:
```xml
<EntityType Name="Product">
  <Key>
    <PropertyRef Name="ProductID"/>
  </Key>
  <Property Name="ProductID" Type="Edm.String"/>
  <Property Name="CategoryID" Type="Edm.String"/>
  <NavigationProperty Name="Category" Type="MyService.Category"/>
</EntityType>

<EntityType Name="Category">
  <Key>
    <PropertyRef Name="CategoryID"/>
  </Key>
  <Property Name="CategoryID" Type="Edm.String"/>
  <Property Name="CategoryName" Type="Edm.String"/>
</EntityType>
```

**Categories.json**:
```json
[
  {
    "CategoryID": "NB",
    "CategoryName": "Notebooks"
  },
  {
    "CategoryID": "AC",
    "CategoryName": "Accessories"
  }
]
```

**Products.json**:
```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook Basic 15",
    "CategoryID": "NB"  // Must match a valid CategoryID
  },
  {
    "ProductID": "HT-2000",
    "Name": "USB Cable",
    "CategoryID": "AC"  // Must match a valid CategoryID
  }
]
```

**Key Principles:**
- Foreign keys must reference existing entities
- Use consistent ID formats (strings, GUIDs, etc.)
- Maintain referential integrity

### Best Practices for Creating Realistic Test Data

#### 1. Use Real-World Values

```json
// ❌ Bad - Generic values
{
  "CustomerName": "Customer 1",
  "City": "City 1",
  "PostalCode": "12345"
}

// ✅ Good - Realistic values
{
  "CustomerName": "ACME Corporation",
  "City": "San Francisco",
  "PostalCode": "94105"
}
```

#### 2. Include Edge Cases

```json
[
  // Normal case
  {"ProductID": "P001", "Price": "99.99"},
  
  // Edge cases
  {"ProductID": "P002", "Price": "0.00"},      // Zero price
  {"ProductID": "P003", "Price": "999999.99"}, // Very high price
  {"ProductID": "P004", "Name": "Product with very long name that might cause UI issues"},
  {"ProductID": "P005", "Description": ""}     // Empty optional field
]
```

#### 3. Create Meaningful Relationships

```json
// SalesOrders.json
[
  {
    "OrderID": "5000001",
    "CustomerID": "CUST001",
    "OrderDate": "2024-01-15",
    "TotalAmount": "1205.99"
  }
]

// SalesOrderItems.json
[
  {
    "OrderID": "5000001",  // Matches parent order
    "ItemNo": "10",
    "ProductID": "HT-1000",
    "Quantity": 1,
    "Amount": "956.00"
  },
  {
    "OrderID": "5000001",  // Same parent
    "ItemNo": "20",
    "ProductID": "HT-2000",
    "Quantity": 1,
    "Amount": "249.99"
  }
]
```

#### 4. Maintain Calculated Fields

```json
{
  "OrderID": "5000001",
  "NetAmount": "1000.00",
  "TaxAmount": "190.00",
  "TotalAmount": "1190.00"  // = NetAmount + TaxAmount
}
```

---

## Entity Sets and Singletons

### Defining Entity Sets

An **entity set** is a collection of entities of the same type. It's the most common structure in OData services.

**Metadata Definition** (OData v4):
```xml
<EntitySet Name="Products" EntityType="MyService.Product">
  <NavigationPropertyBinding Path="Category" Target="Categories"/>
</EntitySet>
```

**Mock Data** (`Products.json`):
```json
[
  {"ProductID": "001", "Name": "Product 1"},
  {"ProductID": "002", "Name": "Product 2"}
]
```

**Access via OData**:
- Collection: `GET /Products`
- Single entity: `GET /Products('001')`
- Create: `POST /Products`
- Update: `PATCH /Products('001')`
- Delete: `DELETE /Products('001')`

### Working with Singletons

A **singleton** is a single instance of an entity type (not a collection).

**Metadata Definition** (OData v4):
```xml
<Singleton Name="Company" Type="MyService.CompanyInfo"/>
```

**Mock Data** (`Company.json`):
```json
{
  "CompanyID": "SAP",
  "CompanyName": "SAP SE",
  "Address": "Dietmar-Hopp-Allee 16",
  "City": "Walldorf",
  "Country": "Germany"
}
```

**Important**: Singleton data is a **single object**, not an array!

**Access via OData**:
- Read: `GET /Company`
- Update: `PATCH /Company`

### Navigation Properties

Navigation properties define relationships between entities. They're essential for modeling real-world business data.

#### Single-Valued Navigation Property

When an entity has a reference to **one** related entity:

**TypeScript Type Definition**:
```typescript
interface Product {
  ProductID: string;
  Name: string;
  CategoryID: string;
  
  // Navigation to single Category
  Category?: NavPropTo<Category>;
}
```

**Metadata**:
```xml
<EntityType Name="Product">
  <Property Name="ProductID" Type="Edm.String"/>
  <Property Name="CategoryID" Type="Edm.String"/>
  <NavigationProperty Name="Category" Type="MyService.Category"/>
</EntityType>
```

**Mock Data** (`Products.json`):
```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook",
    "CategoryID": "NB"
    // Navigation property data comes from Categories.json
  }
]
```

**OData Request**:
```
GET /Products('HT-1000')?$expand=Category
```

**Response**:
```json
{
  "ProductID": "HT-1000",
  "Name": "Notebook",
  "CategoryID": "NB",
  "Category": {
    "CategoryID": "NB",
    "CategoryName": "Notebooks"
  }
}
```

#### Collection-Valued Navigation Property

When an entity has a reference to **many** related entities:

**TypeScript Type Definition**:
```typescript
interface SalesOrder {
  OrderID: string;
  CustomerID: string;
  
  // Navigation to multiple Items
  Items?: NavPropTo<SalesOrderItem[]>;
}
```

**Metadata**:
```xml
<EntityType Name="SalesOrder">
  <Property Name="OrderID" Type="Edm.String"/>
  <NavigationProperty Name="Items" Type="Collection(MyService.SalesOrderItem)"/>
</EntityType>
```

**Mock Data Setup**:

`SalesOrders.json`:
```json
[
  {
    "OrderID": "5000001",
    "CustomerID": "CUST001",
    "OrderDate": "2024-01-15"
  }
]
```

`SalesOrderItems.json`:
```json
[
  {
    "OrderID": "5000001",
    "ItemNo": "10",
    "ProductID": "HT-1000",
    "Quantity": 2
  },
  {
    "OrderID": "5000001",
    "ItemNo": "20",
    "ProductID": "HT-1001",
    "Quantity": 1
  }
]
```

**OData Request**:
```
GET /SalesOrders('5000001')?$expand=Items
```

**Response**:
```json
{
  "OrderID": "5000001",
  "CustomerID": "CUST001",
  "OrderDate": "2024-01-15",
  "Items": [
    {
      "OrderID": "5000001",
      "ItemNo": "10",
      "ProductID": "HT-1000",
      "Quantity": 2
    },
    {
      "OrderID": "5000001",
      "ItemNo": "20",
      "ProductID": "HT-1001",
      "Quantity": 1
    }
  ]
}
```

**How it works**: The mockserver automatically filters `SalesOrderItems` where `OrderID` matches the parent order's `OrderID`.

### Associations and Referential Constraints

**Referential constraints** define the relationship between parent and child entities explicitly in metadata.

**Metadata with Referential Constraint**:
```xml
<EntityType Name="SalesOrderItem">
  <Key>
    <PropertyRef Name="OrderID"/>
    <PropertyRef Name="ItemNo"/>
  </Key>
  <Property Name="OrderID" Type="Edm.String"/>
  <Property Name="ItemNo" Type="Edm.String"/>
  <Property Name="ProductID" Type="Edm.String"/>
  
  <NavigationProperty Name="SalesOrder" Type="MyService.SalesOrder">
    <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
  </NavigationProperty>
</EntityType>
```

The `<ReferentialConstraint>` tells the mockserver:
- `Property="OrderID"` - The foreign key in the child entity
- `ReferencedProperty="OrderID"` - The primary key in the parent entity

**Benefits**:
- Automatic filtering of child entities
- Maintains data integrity
- Enables proper $expand operations

---

## Draft vs. Active Data

SAP Fiori applications often use **draft** functionality to allow users to work on changes without immediately committing them.

### Understanding Draft Mechanisms

In a draft-enabled application:
- **Active entities**: Published, committed data visible to all users
- **Draft entities**: Work-in-progress data visible only to the editing user
- **IsActiveEntity**: Boolean flag indicating if the entity is active or draft

**Typical workflow**:
1. User creates new entity → Creates draft
2. User edits → Updates draft
3. User clicks "Save" → Draft becomes active
4. User clicks "Cancel" → Draft is deleted

### Differentiating Between Draft and Active Entities

**Metadata** (OData v4 with Draft):
```xml
<EntityType Name="Product">
  <Key>
    <PropertyRef Name="ProductID"/>
    <PropertyRef Name="IsActiveEntity"/>
  </Key>
  <Property Name="ProductID" Type="Edm.String"/>
  <Property Name="Name" Type="Edm.String"/>
  <Property Name="IsActiveEntity" Type="Edm.Boolean"/>
  <Property Name="HasActiveEntity" Type="Edm.Boolean"/>
  <Property Name="HasDraftEntity" Type="Edm.Boolean"/>
</EntityType>
```

**Key Properties**:
- `IsActiveEntity`: true = active, false = draft
- `HasActiveEntity`: Indicates if an active version exists
- `HasDraftEntity`: Indicates if a draft version exists

### Mock Data Structure for Draft Scenarios

`Products.json`:
```json
[
  {
    "ProductID": "HT-1000",
    "IsActiveEntity": true,
    "HasActiveEntity": true,
    "HasDraftEntity": false,
    "Name": "Notebook Basic 15",
    "Price": "956.00"
  },
  {
    "ProductID": "HT-1001",
    "IsActiveEntity": true,
    "HasActiveEntity": true,
    "HasDraftEntity": true,
    "Name": "Notebook Basic 17",
    "Price": "1249.00"
  },
  {
    "ProductID": "HT-1001",
    "IsActiveEntity": false,
    "HasActiveEntity": true,
    "HasDraftEntity": false,
    "Name": "Notebook Professional 17",
    "Price": "1349.00"
  }
]
```

**Explanation**:
- First product: Active, no draft exists
- Second product: Active version, has a draft
- Third product: Draft version of second product (being edited)

---

## Request Handling

The mockserver supports standard OData query operations out of the box.

### Query Parameter Support

#### $filter - Filter Results

Filter entities based on conditions:

```
GET /Products?$filter=Price gt 1000
GET /Products?$filter=Category eq 'Notebooks'
GET /Products?$filter=contains(Name, 'Basic')
GET /Products?$filter=Price gt 500 and Price lt 1500
```

**Supported operators**:
- Comparison: `eq`, `ne`, `gt`, `ge`, `lt`, `le`
- Logical: `and`, `or`, `not`
- String: `contains`, `startswith`, `endswith`
- Arithmetic: `add`, `sub`, `mul`, `div`, `mod`

#### $select - Choose Fields

Return only specific properties:

```
GET /Products?$select=ProductID,Name,Price
```

**Response**:
```json
{
  "value": [
    {"ProductID": "HT-1000", "Name": "Notebook Basic 15", "Price": "956.00"},
    {"ProductID": "HT-1001", "Name": "Notebook Basic 17", "Price": "1249.00"}
  ]
}
```

#### $orderby - Sort Results

Sort by one or more properties:

```
GET /Products?$orderby=Price desc
GET /Products?$orderby=Category,Name asc
```

### $expand - Deep Data Retrieval

The `$expand` query option is crucial for retrieving related entities in a single request.

#### Basic $expand

**Request**:
```
GET /Products('HT-1000')?$expand=Category
```

**Response**:
```json
{
  "ProductID": "HT-1000",
  "Name": "Notebook Basic 15",
  "CategoryID": "NB",
  "Category": {
    "CategoryID": "NB",
    "CategoryName": "Notebooks",
    "Description": "Portable computers"
  }
}
```

#### Multi-level $expand

Expand multiple navigation properties:

```
GET /SalesOrders('5000001')?$expand=Customer,Items
```

**Response**:
```json
{
  "OrderID": "5000001",
  "CustomerID": "CUST001",
  "Customer": {
    "CustomerID": "CUST001",
    "CustomerName": "ACME Corp"
  },
  "Items": [
    {"ItemNo": "10", "ProductID": "HT-1000"},
    {"ItemNo": "20", "ProductID": "HT-1001"}
  ]
}
```

#### Nested $expand

Expand navigation properties within expanded entities:

```
GET /SalesOrders('5000001')?$expand=Items($expand=Product)
```

**Response**:
```json
{
  "OrderID": "5000001",
  "Items": [
    {
      "ItemNo": "10",
      "ProductID": "HT-1000",
      "Product": {
        "ProductID": "HT-1000",
        "Name": "Notebook Basic 15",
        "Price": "956.00"
      }
    }
  ]
}
```

#### $expand with Additional Query Options

Combine $expand with filters, sorting, and selection:

```
GET /SalesOrders('5000001')?$expand=Items($filter=Quantity gt 1;$orderby=ItemNo;$select=ItemNo,ProductID,Quantity)
```

**How the mockserver handles $expand**:
1. Identifies the navigation property
2. Reads the referential constraint from metadata
3. Filters related entities based on key matching
4. Nests the results in the response

### Pagination and $top/$skip

Implement paging for large datasets:

```
GET /Products?$top=10&$skip=0   // First page
GET /Products?$top=10&$skip=10  // Second page
```

**Response includes count** (with `$count=true`):
```json
{
  "@odata.count": 156,
  "value": [
    {"ProductID": "HT-1000", "Name": "Notebook Basic 15"},
    // ... 9 more items
  ]
}
```

### Search Functionality

Full-text search across all searchable properties:

```
GET /Products?$search=notebook
```

**Mock Data**: Ensure your data includes searchable content:
```json
[
  {
    "ProductID": "HT-1000",
    "Name": "Notebook Basic 15",
    "Description": "Basic notebook computer for everyday use",
    "Category": "Notebooks"
  }
]
```

The search will match against all string properties.

---

## What's Next?

- 🚀 **[Advanced Features](../advanced-features/README.md)** - Deep structures, actions, error handling
- 📝 **[Configuration Reference](../configuration-reference/README.md)** - Complete configuration guide
- 🔧 **[API Reference](../MockserverAPI.md)** - Customize mockserver behavior
- 📚 **[Examples](../examples/README.md)** - See complete working examples

