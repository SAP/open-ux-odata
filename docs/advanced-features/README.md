pm# Advanced Features

This guide covers advanced mockserver capabilities for complex scenarios, deep hierarchies, and sophisticated business logic.

---

## Table of Contents

- [Deep Structures and Hierarchies](#deep-structures-and-hierarchies)
- [Recursive Hierarchy](#recursive-hierarchy)

---

## Deep Structures and Hierarchies

### Modeling Hierarchical Data

Real-world business applications often involve multiple levels of related entities. The mockserver fully supports deep hierarchical structures.

#### Sales Orders → Items → Sub-items (3 Levels)

**Business Scenario**: 
- Sales Order contains multiple Items
- Each Item can have multiple Schedule Lines (sub-items)
- Each level has navigation properties to parent and children

**Metadata Structure**:

```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="DeepHierarchy" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <!-- Level 1: Sales Order -->
      <EntityType Name="SalesOrder">
        <Key>
          <PropertyRef Name="OrderID"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
        <Property Name="CustomerID" Type="Edm.String"/>
        <Property Name="OrderDate" Type="Edm.Date"/>
        <Property Name="TotalAmount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        <Property Name="Status" Type="Edm.String"/>
        
        <!-- Navigation to Items -->
        <NavigationProperty Name="Items" Type="Collection(DeepHierarchy.SalesOrderItem)" Partner="SalesOrder"/>
      </EntityType>
      
      <!-- Level 2: Sales Order Item -->
      <EntityType Name="SalesOrderItem">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ItemNo"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
        <Property Name="ItemNo" Type="Edm.String" Nullable="false"/>
        <Property Name="ProductID" Type="Edm.String"/>
        <Property Name="Quantity" Type="Edm.Int32"/>
        <Property Name="Amount" Type="Edm.Decimal" Scale="2" Precision="10"/>
        
        <!-- Navigation to parent -->
        <NavigationProperty Name="SalesOrder" Type="DeepHierarchy.SalesOrder" Partner="Items">
          <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
        </NavigationProperty>
        
        <!-- Navigation to children -->
        <NavigationProperty Name="ScheduleLines" Type="Collection(DeepHierarchy.ScheduleLine)" Partner="Item"/>
      </EntityType>
      
      <!-- Level 3: Schedule Line -->
      <EntityType Name="ScheduleLine">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ItemNo"/>
          <PropertyRef Name="ScheduleLineNo"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
        <Property Name="ItemNo" Type="Edm.String" Nullable="false"/>
        <Property Name="ScheduleLineNo" Type="Edm.String" Nullable="false"/>
        <Property Name="DeliveryDate" Type="Edm.Date"/>
        <Property Name="Quantity" Type="Edm.Int32"/>
        
        <!-- Navigation to parent -->
        <NavigationProperty Name="Item" Type="DeepHierarchy.SalesOrderItem" Partner="ScheduleLines">
          <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
          <ReferentialConstraint Property="ItemNo" ReferencedProperty="ItemNo"/>
        </NavigationProperty>
      </EntityType>
      
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="SalesOrders" EntityType="DeepHierarchy.SalesOrder">
          <NavigationPropertyBinding Path="Items" Target="SalesOrderItems"/>
        </EntitySet>
        <EntitySet Name="SalesOrderItems" EntityType="DeepHierarchy.SalesOrderItem">
          <NavigationPropertyBinding Path="SalesOrder" Target="SalesOrders"/>
          <NavigationPropertyBinding Path="ScheduleLines" Target="ScheduleLines"/>
        </EntitySet>
        <EntitySet Name="ScheduleLines" EntityType="DeepHierarchy.ScheduleLine">
          <NavigationPropertyBinding Path="Item" Target="SalesOrderItems"/>
        </EntitySet>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

**Mock Data Files**:

`SalesOrders.json`:
```json
[
  {
    "OrderID": "5000001",
    "CustomerID": "CUST001",
    "OrderDate": "2024-01-15",
    "TotalAmount": "5000.00",
    "Status": "CONFIRMED"
  }
]
```

`SalesOrderItems.json`:
```json
[
  {
    "OrderID": "5000001",
    "ItemNo": "10",
    "ProductID": "P001",
    "Quantity": 100,
    "Amount": "2500.00"
  },
  {
    "OrderID": "5000001",
    "ItemNo": "20",
    "ProductID": "P002",
    "Quantity": 50,
    "Amount": "2500.00"
  }
]
```

`ScheduleLines.json`:
```json
[
  {
    "OrderID": "5000001",
    "ItemNo": "10",
    "ScheduleLineNo": "001",
    "DeliveryDate": "2024-02-01",
    "Quantity": 60
  },
  {
    "OrderID": "5000001",
    "ItemNo": "10",
    "ScheduleLineNo": "002",
    "DeliveryDate": "2024-02-15",
    "Quantity": 40
  },
  {
    "OrderID": "5000001",
    "ItemNo": "20",
    "ScheduleLineNo": "001",
    "DeliveryDate": "2024-02-10",
    "Quantity": 50
  }
]
```

**Deep Expansion Request**:
```
GET /SalesOrders('5000001')?$expand=Items($expand=ScheduleLines)
```

**Response**:
```json
{
  "OrderID": "5000001",
  "CustomerID": "CUST001",
  "OrderDate": "2024-01-15",
  "TotalAmount": "5000.00",
  "Status": "CONFIRMED",
  "Items": [
    {
      "OrderID": "5000001",
      "ItemNo": "10",
      "ProductID": "P001",
      "Quantity": 100,
      "Amount": "2500.00",
      "ScheduleLines": [
        {
          "OrderID": "5000001",
          "ItemNo": "10",
          "ScheduleLineNo": "001",
          "DeliveryDate": "2024-02-01",
          "Quantity": 60
        },
        {
          "OrderID": "5000001",
          "ItemNo": "10",
          "ScheduleLineNo": "002",
          "DeliveryDate": "2024-02-15",
          "Quantity": 40
        }
      ]
    },
    {
      "OrderID": "5000001",
      "ItemNo": "20",
      "ProductID": "P002",
      "Quantity": 50,
      "Amount": "2500.00",
      "ScheduleLines": [
        {
          "OrderID": "5000001",
          "ItemNo": "20",
          "ScheduleLineNo": "001",
          "DeliveryDate": "2024-02-10",
          "Quantity": 50
        }
      ]
    }
  ]
}
```

### Navigation Property Configuration

**TypeScript Type Definitions**:

```typescript
import { NavPropTo } from '@sap-ux/fe-mockserver-core';

// Level 1
interface SalesOrder {
  OrderID: string;
  CustomerID: string;
  OrderDate: string;
  TotalAmount: string;
  Status: string;
  
  // One-to-many navigation
  Items?: NavPropTo<SalesOrderItem[]>;
}

// Level 2
interface SalesOrderItem {
  OrderID: string;
  ItemNo: string;
  ProductID: string;
  Quantity: number;
  Amount: string;
  
  // Many-to-one navigation (parent)
  SalesOrder?: NavPropTo<SalesOrder>;
  
  // One-to-many navigation (children)
  ScheduleLines?: NavPropTo<ScheduleLine[]>;
}

// Level 3
interface ScheduleLine {
  OrderID: string;
  ItemNo: string;
  ScheduleLineNo: string;
  DeliveryDate: string;
  Quantity: number;
  
  // Many-to-one navigation (parent)
  Item?: NavPropTo<SalesOrderItem>;
}
```

### Hierarchical Data Best Practices

#### 1. Consistent Key Propagation

**Rule**: Child entities must include all parent keys in their key structure.

```json
// ✅ Correct - Schedule Line includes both OrderID and ItemNo
{
  "OrderID": "5000001",      // From grandparent
  "ItemNo": "10",            // From parent
  "ScheduleLineNo": "001"    // Own key
}

// ❌ Wrong - Missing parent keys
{
  "ScheduleLineNo": "001"    // Not enough to identify uniquely
}
```

#### 2. Referential Integrity

**Rule**: All foreign keys must reference existing entities.

```javascript
// Validation in custom logic
module.exports = {
  async onBeforeAddEntry(keys, data, odataRequest) {
    const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
    const parentItem = itemInterface.fetchEntries({
      OrderID: data.OrderID,
      ItemNo: data.ItemNo
    });
    
    if (!parentItem) {
      this.throwError('Parent item does not exist', 400);
    }
  }
};
```

#### 3. Calculated Aggregations

When parent totals depend on children:

```javascript
// SalesOrderItems.js
module.exports = {
  async onAfterUpdateEntry(keys, updatedData) {
    // Recalculate order total when item changes
    const orderInterface = await this.base.getEntityInterface('SalesOrders');
    const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
    
    const allItems = itemInterface.getData()
      .filter(item => item.OrderID === keys.OrderID);
    
    const newTotal = allItems.reduce((sum, item) => 
      sum + parseFloat(item.Amount), 0
    );
    
    await orderInterface.updateEntry(
      { OrderID: keys.OrderID },
      { TotalAmount: newTotal.toFixed(2) }
    );
  }
};
```

### Editable Hierarchy Support

For scenarios where hierarchy relationships can change dynamically.

#### Dynamic Referential Constraints

```javascript
// SalesOrderItems.js
module.exports = {
  getReferentialConstraints(navigationProperty) {
    if (navigationProperty.name === 'ScheduleLines') {
      // Dynamic constraint based on runtime logic
      return [
        { sourceProperty: 'OrderID', targetProperty: 'OrderID' },
        { sourceProperty: 'ItemNo', targetProperty: 'ItemNo' }
      ];
    }
    
    // Use default for other navigation properties
    return undefined;
  }
};
```

#### Handling Hierarchy Changes

```javascript
module.exports = {
  executeAction: async function(actionDefinition, actionData, keys, odataRequest) {
    if (actionDefinition.name === 'MoveItemToAnotherOrder') {
      const newOrderID = actionData.NewOrderID;
      const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
      const scheduleInterface = await this.base.getEntityInterface('ScheduleLines');
      
      // Move the item
      await itemInterface.updateEntry(keys, { OrderID: newOrderID });
      
      // Move all associated schedule lines
      const scheduleLines = scheduleInterface.getData()
        .filter(sl => sl.OrderID === keys.OrderID && sl.ItemNo === keys.ItemNo);
      
      for (const scheduleLine of scheduleLines) {
        await scheduleInterface.updateEntry(
          {
            OrderID: scheduleLine.OrderID,
            ItemNo: scheduleLine.ItemNo,
            ScheduleLineNo: scheduleLine.ScheduleLineNo
          },
          { OrderID: newOrderID }
        );
      }
      
      return { ...actionData, OrderID: newOrderID };
    }
  }
};
```

---

## Recursive Hierarchy

**Scenario**: Managing hierarchical data within a single entity set using parent references and recursive expansion.

### Metadata Definition

```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
    <edmx:Include Alias="Common" Namespace="com.sap.vocabularies.Common.v1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
    <edmx:Include Alias="UI" Namespace="com.sap.vocabularies.UI.v1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.xml">
    <edmx:Include Alias="Aggregation" Namespace="Org.OData.Aggregation.V1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.xml">
    <edmx:Include Alias="Hierarchy" Namespace="com.sap.vocabularies.Hierarchy.v1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.xml">
    <edmx:Include Alias="Capabilities" Namespace="Org.OData.Capabilities.V1"/>
  </edmx:Reference>
  <edmx:DataServices>
    <Schema Namespace="EmployeeService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Employee">
        <Key>
          <PropertyRef Name="EmployeeID"/>
        </Key>
        <Property Name="EmployeeID" Type="Edm.String" Nullable="false"/>
        <Property Name="ManagerID" Type="Edm.String"/>
        <Property Name="FullName" Type="Edm.String"/>
        <Property Name="JobTitle" Type="Edm.String"/>
        
        <NavigationProperty Name="Manager" Type="EmployeeService.Employee">
          <ReferentialConstraint Property="ManagerID" ReferencedProperty="EmployeeID"/>
        </NavigationProperty>
        <NavigationProperty Name="Subordinates" Type="Collection(EmployeeService.Employee)" Partner="Manager"/>
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

### Hierarchy Annotations

```xml
<Annotations Target="EmployeeService.Employee">
  <Annotation Term="Aggregation.RecursiveHierarchy" Qualifier="EmployeeHierarchy">
    <Record>
      <PropertyValue Property="NodeProperty" PropertyPath="EmployeeID"/>
      <PropertyValue Property="ParentNodeProperty" PropertyPath="ManagerID"/>
    </Record>
  </Annotation>
  <Annotation Term="Hierarchy.RecursiveHierarchy" Qualifier="EmployeeHierarchy">
    <Record>
      <PropertyValue Property="ExternalKeyProperty" PropertyPath="EmployeeID"/>
    </Record>
  </Annotation>
  <Annotation Term="UI.LineItem">
    <Collection>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="FullName"/>
      </Record>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="JobTitle"/>
      </Record>
    </Collection>
  </Annotation>
</Annotations>
```

### Mock Data (Employees.json)

```json
[
  {
    "EmployeeID": "1",
    "FullName": "CEO",
    "ManagerID": null,
    "JobTitle": "Chief Executive Officer"
  },
  {
    "EmployeeID": "2",
    "FullName": "Manager A",
    "ManagerID": "1",
    "JobTitle": "Department Manager"
  },
  {
    "EmployeeID": "3",
    "FullName": "Employee A1",
    "ManagerID": "2",
    "JobTitle": "Senior Developer"
  }
]
```

### Testing Recursive Expansion

The mockserver handles the hierarchy property and allows for deep navigation:

```
GET /Employees('1')?$expand=Subordinates($expand=Subordinates)
```

---

## What's Next?

- 📚 **[Value Help & Filter Bar](../value-help/README.md)** - Detailed value help configuration
- 🧪 **[OPA5 Testing](../opa5-testing/README.md)** - Integration testing with mockserver
- 📖 **[Advanced Examples](../examples/advanced/README.md)** - Complete working examples
- 🔍 **[Best Practices](../best-practices/mock-data.md)** - Tips for effective mock data

