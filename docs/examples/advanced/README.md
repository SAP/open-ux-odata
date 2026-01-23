# Advanced Examples

Complex S/4HANA scenarios demonstrating advanced FE Mockserver features, including deep hierarchies, parametrized CDS views, and complex error handling.

> 🚀 **Quick Start**: You can find the complete runnable code for these examples in the [samples/](../../../samples/README.md#advanced-examples) directory.

---

## Table of Contents

- [Three-Level Hierarchy](#three-level-hierarchy)
- [Recursive Hierarchy](#recursive-hierarchy)
- [CDS Views with Parameters](#cds-views-with-parameters)
- [412 Warnings in Strict/Non-Strict Mode](#412-warnings-in-strictnon-strict-mode)

---

## Three-Level Hierarchy ([Sample](../../../samples/three-level-hierarchy))

**Scenario**: Sales Orders → Items → Schedule Lines with full navigation support.

### Complete File Structure

```
three-level-hierarchy/
├── ui5.yaml
└── webapp/
    ├── localService/
    │   ├── metadata.xml
    │   └── data/
    │       ├── SalesOrders.json
    │       ├── SalesOrderItems.json
    │       ├── ScheduleLines.json
    │       ├── Products.json
    │       └── Customers.json
    └── manifest.json
```

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: three-level-hierarchy
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          - urlPath: /sap/opu/odata4/sap/sales_order_hierarchy/0001
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
```

### Complete Metadata

**webapp/localService/metadata.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="SalesOrderHierarchy" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <!-- Sales Order (Level 1) -->
      <EntityType Name="SalesOrder">
        <Key>
          <PropertyRef Name="OrderID"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="CustomerID" Type="Edm.String" MaxLength="10"/>
        <Property Name="OrderDate" Type="Edm.Date"/>
        <Property Name="TotalAmount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        <Property Name="Status" Type="Edm.String" MaxLength="20"/>
        <Property Name="CreatedBy" Type="Edm.String"/>
        <Property Name="CreatedAt" Type="Edm.DateTimeOffset"/>
        
        <NavigationProperty Name="Customer" Type="SalesOrderHierarchy.Customer">
          <ReferentialConstraint Property="CustomerID" ReferencedProperty="CustomerID"/>
        </NavigationProperty>
        <NavigationProperty Name="Items" Type="Collection(SalesOrderHierarchy.SalesOrderItem)" Partner="SalesOrder"/>
      </EntityType>
      
      <!-- Sales Order Item (Level 2) -->
      <EntityType Name="SalesOrderItem">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ItemNo"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="ItemNo" Type="Edm.String" Nullable="false" MaxLength="6"/>
        <Property Name="ProductID" Type="Edm.String" MaxLength="18"/>
        <Property Name="Description" Type="Edm.String"/>
        <Property Name="Quantity" Type="Edm.Decimal" Scale="3" Precision="13"/>
        <Property Name="UnitOfMeasure" Type="Edm.String" MaxLength="3"/>
        <Property Name="UnitPrice" Type="Edm.Decimal" Scale="2" Precision="10"/>
        <Property Name="Amount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        <Property Name="DeliveryDate" Type="Edm.Date"/>
        
        <NavigationProperty Name="SalesOrder" Type="SalesOrderHierarchy.SalesOrder" Partner="Items">
          <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
        </NavigationProperty>
        <NavigationProperty Name="Product" Type="SalesOrderHierarchy.Product">
          <ReferentialConstraint Property="ProductID" ReferencedProperty="ProductID"/>
        </NavigationProperty>
        <NavigationProperty Name="ScheduleLines" Type="Collection(SalesOrderHierarchy.ScheduleLine)" Partner="Item"/>
      </EntityType>
      
      <!-- Schedule Line (Level 3) -->
      <EntityType Name="ScheduleLine">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ItemNo"/>
          <PropertyRef Name="ScheduleLineNo"/>
        </Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="ItemNo" Type="Edm.String" Nullable="false" MaxLength="6"/>
        <Property Name="ScheduleLineNo" Type="Edm.String" Nullable="false" MaxLength="4"/>
        <Property Name="DeliveryDate" Type="Edm.Date"/>
        <Property Name="Quantity" Type="Edm.Decimal" Scale="3" Precision="13"/>
        <Property Name="ConfirmedQuantity" Type="Edm.Decimal" Scale="3" Precision="13"/>
        <Property Name="Plant" Type="Edm.String" MaxLength="4"/>
        <Property Name="StorageLocation" Type="Edm.String" MaxLength="4"/>
        
        <NavigationProperty Name="Item" Type="SalesOrderHierarchy.SalesOrderItem" Partner="ScheduleLines">
          <ReferentialConstraint Property="OrderID" ReferencedProperty="OrderID"/>
          <ReferentialConstraint Property="ItemNo" ReferencedProperty="ItemNo"/>
        </NavigationProperty>
      </EntityType>
      
      <!-- Product -->
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="ProductID" Type="Edm.String" Nullable="false" MaxLength="18"/>
        <Property Name="ProductName" Type="Edm.String"/>
        <Property Name="Category" Type="Edm.String"/>
        <Property Name="Price" Type="Edm.Decimal" Scale="2" Precision="10"/>
      </EntityType>
      
      <!-- Customer -->
      <EntityType Name="Customer">
        <Key>
          <PropertyRef Name="CustomerID"/>
        </Key>
        <Property Name="CustomerID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="CustomerName" Type="Edm.String"/>
        <Property Name="City" Type="Edm.String"/>
        <Property Name="Country" Type="Edm.String" MaxLength="2"/>
      </EntityType>
      
      <!-- Entity Container -->
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="SalesOrders" EntityType="SalesOrderHierarchy.SalesOrder">
          <NavigationPropertyBinding Path="Customer" Target="Customers"/>
          <NavigationPropertyBinding Path="Items" Target="SalesOrderItems"/>
        </EntitySet>
        <EntitySet Name="SalesOrderItems" EntityType="SalesOrderHierarchy.SalesOrderItem">
          <NavigationPropertyBinding Path="SalesOrder" Target="SalesOrders"/>
          <NavigationPropertyBinding Path="Product" Target="Products"/>
          <NavigationPropertyBinding Path="ScheduleLines" Target="ScheduleLines"/>
        </EntitySet>
        <EntitySet Name="ScheduleLines" EntityType="SalesOrderHierarchy.ScheduleLine">
          <NavigationPropertyBinding Path="Item" Target="SalesOrderItems"/>
        </EntitySet>
        <EntitySet Name="Products" EntityType="SalesOrderHierarchy.Product"/>
        <EntitySet Name="Customers" EntityType="SalesOrderHierarchy.Customer"/>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

### Mock Data

**Customers.json**:
```json
[
  {
    "CustomerID": "CUST-001",
    "CustomerName": "ACME Corporation",
    "City": "San Francisco",
    "Country": "US"
  },
  {
    "CustomerID": "CUST-002",
    "CustomerName": "Global Tech Industries",
    "City": "New York",
    "Country": "US"
  },
  {
    "CustomerID": "CUST-003",
    "CustomerName": "European Enterprises GmbH",
    "City": "Berlin",
    "Country": "DE"
  }
]
```

**Products.json**:
```json
[
  {
    "ProductID": "MAT-001",
    "ProductName": "Laptop Professional 15\"",
    "Category": "Electronics",
    "Price": "1299.00"
  },
  {
    "ProductID": "MAT-002",
    "ProductName": "Wireless Mouse",
    "Category": "Accessories",
    "Price": "29.99"
  },
  {
    "ProductID": "MAT-003",
    "ProductName": "USB-C Docking Station",
    "Category": "Accessories",
    "Price": "199.00"
  },
  {
    "ProductID": "MAT-004",
    "ProductName": "27\" Monitor 4K",
    "Category": "Electronics",
    "Price": "599.00"
  }
]
```

**SalesOrders.json**:
```json
[
  {
    "OrderID": "SO-000001",
    "CustomerID": "CUST-001",
    "OrderDate": "2024-01-15",
    "TotalAmount": "3856.97",
    "CurrencyCode": "USD",
    "Status": "CONFIRMED",
    "CreatedBy": "USER001",
    "CreatedAt": "2024-01-15T10:30:00Z"
  },
  {
    "OrderID": "SO-000002",
    "CustomerID": "CUST-002",
    "OrderDate": "2024-01-18",
    "TotalAmount": "2598.00",
    "CurrencyCode": "USD",
    "Status": "IN_TRANSIT",
    "CreatedBy": "USER002",
    "CreatedAt": "2024-01-18T14:20:00Z"
  },
  {
    "OrderID": "SO-000003",
    "CustomerID": "CUST-003",
    "OrderDate": "2024-01-20",
    "TotalAmount": "1898.00",
    "CurrencyCode": "EUR",
    "Status": "PROCESSING",
    "CreatedBy": "USER001",
    "CreatedAt": "2024-01-20T09:15:00Z"
  }
]
```

**SalesOrderItems.json**:
```json
[
  {
    "OrderID": "SO-000001",
    "ItemNo": "000010",
    "ProductID": "MAT-001",
    "Description": "Laptop Professional 15\"",
    "Quantity": "2.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "1299.00",
    "Amount": "2598.00",
    "CurrencyCode": "USD",
    "DeliveryDate": "2024-02-01"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000020",
    "ProductID": "MAT-002",
    "Description": "Wireless Mouse",
    "Quantity": "3.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "29.99",
    "Amount": "89.97",
    "CurrencyCode": "USD",
    "DeliveryDate": "2024-02-01"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000030",
    "ProductID": "MAT-004",
    "Description": "27\" Monitor 4K",
    "Quantity": "2.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "599.00",
    "Amount": "1198.00",
    "CurrencyCode": "USD",
    "DeliveryDate": "2024-02-05"
  },
  {
    "OrderID": "SO-000002",
    "ItemNo": "000010",
    "ProductID": "MAT-001",
    "Description": "Laptop Professional 15\"",
    "Quantity": "2.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "1299.00",
    "Amount": "2598.00",
    "CurrencyCode": "USD",
    "DeliveryDate": "2024-02-10"
  },
  {
    "OrderID": "SO-000003",
    "ItemNo": "000010",
    "ProductID": "MAT-001",
    "Description": "Laptop Professional 15\"",
    "Quantity": "1.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "1299.00",
    "Amount": "1299.00",
    "CurrencyCode": "EUR",
    "DeliveryDate": "2024-02-15"
  },
  {
    "OrderID": "SO-000003",
    "ItemNo": "000020",
    "ProductID": "MAT-004",
    "Description": "27\" Monitor 4K",
    "Quantity": "1.000",
    "UnitOfMeasure": "EA",
    "UnitPrice": "599.00",
    "Amount": "599.00",
    "CurrencyCode": "EUR",
    "DeliveryDate": "2024-02-15"
  }
]
```

**ScheduleLines.json**:
```json
[
  {
    "OrderID": "SO-000001",
    "ItemNo": "000010",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-01",
    "Quantity": "1.000",
    "ConfirmedQuantity": "1.000",
    "Plant": "1000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000010",
    "ScheduleLineNo": "0002",
    "DeliveryDate": "2024-02-08",
    "Quantity": "1.000",
    "ConfirmedQuantity": "1.000",
    "Plant": "1000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000020",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-01",
    "Quantity": "3.000",
    "ConfirmedQuantity": "3.000",
    "Plant": "1000",
    "StorageLocation": "0002"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000030",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-05",
    "Quantity": "1.000",
    "ConfirmedQuantity": "1.000",
    "Plant": "2000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000001",
    "ItemNo": "000030",
    "ScheduleLineNo": "0002",
    "DeliveryDate": "2024-02-12",
    "Quantity": "1.000",
    "ConfirmedQuantity": "0.000",
    "Plant": "2000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000002",
    "ItemNo": "000010",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-10",
    "Quantity": "2.000",
    "ConfirmedQuantity": "2.000",
    "Plant": "1000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000003",
    "ItemNo": "000010",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-15",
    "Quantity": "1.000",
    "ConfirmedQuantity": "1.000",
    "Plant": "3000",
    "StorageLocation": "0001"
  },
  {
    "OrderID": "SO-000003",
    "ItemNo": "000020",
    "ScheduleLineNo": "0001",
    "DeliveryDate": "2024-02-15",
    "Quantity": "1.000",
    "ConfirmedQuantity": "1.000",
    "Plant": "3000",
    "StorageLocation": "0001"
  }
]
```

### Testing Deep Expansion

**Request 1: Full 3-Level Expansion**:
```
GET /SalesOrders('SO-000001')?$expand=Items($expand=ScheduleLines,Product),Customer
```

**Response** (excerpt):
```json
{
  "OrderID": "SO-000001",
  "CustomerID": "CUST-001",
  "TotalAmount": "3856.97",
  "Customer": {
    "CustomerID": "CUST-001",
    "CustomerName": "ACME Corporation"
  },
  "Items": [
    {
      "OrderID": "SO-000001",
      "ItemNo": "000010",
      "ProductID": "MAT-001",
      "Quantity": "2.000",
      "Product": {
        "ProductID": "MAT-001",
        "ProductName": "Laptop Professional 15\""
      },
      "ScheduleLines": [
        {
          "OrderID": "SO-000001",
          "ItemNo": "000010",
          "ScheduleLineNo": "0001",
          "Quantity": "1.000",
          "Plant": "1000"
        },
        {
          "OrderID": "SO-000001",
          "ItemNo": "000010",
          "ScheduleLineNo": "0002",
          "Quantity": "1.000",
          "Plant": "1000"
        }
      ]
    }
  ]
}
```

---

## Recursive Hierarchy ([Sample](../../../samples/recursive-hierarchy))

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

## CDS Views with Parameters ([Sample](../../../samples/cds-parameters))

**Scenario**: Analytical CDS view with parameters and value help integration.

### Complete File Structure

```
cds-parameters/
├── ui5.yaml
└── webapp/
    ├── localService/
    │   ├── analytics/
    │   │   ├── metadata.xml
    │   │   └── data/
    │   │       ├── P_SalesAnalyticsParameters.js
    │   │       └── P_SalesAnalytics.json
    │   ├── valuehelp/
    │   │   ├── metadata.xml
    │   │   └── data/
    │   │       ├── CompanyCodes.json
    │   │       ├── SalesOrganizations.json
    │   │       └── Currencies.json
    │   └── source/
    │   │   ├── metadata.xml
    │   │   └── data/
    │   │       └── SalesOrders.json
    └── manifest.json
```

### Configuration

**ui5.yaml**:
```yaml
specVersion: "3.0"
metadata:
  name: cds-parameters
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          # CDS View Service
          - urlPath: /sap/opu/odata4/sap/sales_analytics/0001
            metadataPath: ./webapp/localService/analytics/metadata.xml
            mockdataPath: ./webapp/localService/analytics/data
            alias: analytics
            
          # Value Help Services
          - urlPath: /sap/opu/odata/sap/VH_COMPANY
            metadataPath: ./webapp/localService/valuehelp/metadata.xml
            mockdataPath: ./webapp/localService/valuehelp/data
            alias: vh-company
            
          # Source Data Service
          - urlPath: /sap/opu/odata/sap/SALES_ORDERS
            metadataPath: ./webapp/localService/source/metadata.xml
            mockdataPath: ./webapp/localService/source/data
            alias: source
```

### CDS View Metadata

**analytics/metadata.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="AnalyticsService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <!-- Parameter Entity -->
      <EntityType Name="P_SalesAnalyticsParameters">
        <Key>
          <PropertyRef Name="ParameterID"/>
        </Key>
        <Property Name="ParameterID" Type="Edm.String" Nullable="false"/>
        <Property Name="P_CompanyCode" Type="Edm.String" MaxLength="4"/>
        <Property Name="P_SalesOrganization" Type="Edm.String" MaxLength="4"/>
        <Property Name="P_DateFrom" Type="Edm.Date"/>
        <Property Name="P_DateTo" Type="Edm.Date"/>
        <Property Name="P_Currency" Type="Edm.String" MaxLength="3"/>
        <Property Name="P_MinAmount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        
        <NavigationProperty Name="Results" Type="Collection(AnalyticsService.P_SalesAnalytics)"/>
      </EntityType>
      
      <!-- Result Entity -->
      <EntityType Name="P_SalesAnalytics">
        <Key>
          <PropertyRef Name="ID"/>
        </Key>
        <Property Name="ID" Type="Edm.String" Nullable="false"/>
        <Property Name="OrderID" Type="Edm.String"/>
        <Property Name="CustomerID" Type="Edm.String"/>
        <Property Name="CustomerName" Type="Edm.String"/>
        <Property Name="OrderDate" Type="Edm.Date"/>
        <Property Name="TotalAmount" Type="Edm.Decimal" Scale="2" Precision="15"/>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
        <Property Name="Status" Type="Edm.String"/>
        <Property Name="CompanyCode" Type="Edm.String" MaxLength="4"/>
        <Property Name="SalesOrganization" Type="Edm.String" MaxLength="4"/>
      </EntityType>
      
      <!-- Entity Container -->
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="P_SalesAnalyticsParameters" EntityType="AnalyticsService.P_SalesAnalyticsParameters">
          <NavigationPropertyBinding Path="Results" Target="P_SalesAnalytics"/>
        </EntitySet>
        <EntitySet Name="P_SalesAnalytics" EntityType="AnalyticsService.P_SalesAnalytics"/>
      </EntityContainer>
      
    </Schema>
    
    <!-- Annotations for Value Helps -->
    <Schema Namespace="Annotations" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <Annotations Target="AnalyticsService.P_SalesAnalyticsParameters/P_CompanyCode">
        <Annotation Term="Common.ValueList">
          <Record Type="Common.ValueListType">
            <PropertyValue Property="CollectionPath" String="CompanyCodes"/>
            <PropertyValue Property="Parameters">
              <Collection>
                <Record Type="Common.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="P_CompanyCode"/>
                  <PropertyValue Property="ValueListProperty" String="CompanyCode"/>
                </Record>
                <Record Type="Common.ValueListParameterDisplayOnly">
                  <PropertyValue Property="ValueListProperty" String="CompanyName"/>
                </Record>
              </Collection>
            </PropertyValue>
          </Record>
        </Annotation>
      </Annotations>
      
      <Annotations Target="AnalyticsService.P_SalesAnalyticsParameters/P_SalesOrganization">
        <Annotation Term="Common.ValueList">
          <Record Type="Common.ValueListType">
            <PropertyValue Property="CollectionPath" String="SalesOrganizations"/>
            <PropertyValue Property="Parameters">
              <Collection>
                <Record Type="Common.ValueListParameterIn">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="P_CompanyCode"/>
                  <PropertyValue Property="ValueListProperty" String="CompanyCode"/>
                </Record>
                <Record Type="Common.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="P_SalesOrganization"/>
                  <PropertyValue Property="ValueListProperty" String="SalesOrganization"/>
                </Record>
                <Record Type="Common.ValueListParameterDisplayOnly">
                  <PropertyValue Property="ValueListProperty" String="SalesOrgName"/>
                </Record>
              </Collection>
            </PropertyValue>
          </Record>
        </Annotation>
      </Annotations>
      
      <Annotations Target="AnalyticsService.P_SalesAnalyticsParameters/P_Currency">
        <Annotation Term="Common.ValueList">
          <Record Type="Common.ValueListType">
            <PropertyValue Property="CollectionPath" String="Currencies"/>
            <PropertyValue Property="Parameters">
              <Collection>
                <Record Type="Common.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="P_Currency"/>
                  <PropertyValue Property="ValueListProperty" String="CurrencyCode"/>
                </Record>
              </Collection>
            </PropertyValue>
          </Record>
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

### Parameter Implementation

**analytics/data/P_SalesAnalyticsParameters.js**:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    // Return default parameter set
    return [
      {
        ParameterID: "1",
        P_CompanyCode: "",
        P_SalesOrganization: "",
        P_DateFrom: "2024-01-01",
        P_DateTo: "2024-12-31",
        P_Currency: "",
        P_MinAmount: "0.00"
      }
    ];
  },
  
  async onAfterRead(data, odataRequest) {
    const expand = odataRequest.queryOptions?.$expand;
    
    // Check if expanding to Results
    if (expand && expand.includes('Results')) {
      console.log('📊 Executing parametrized CDS view...');
      
      return await Promise.all(data.map(async params => {
        const results = await this.executeAnalytics(params, odataRequest);
        return {
          ...params,
          Results: results
        };
      }));
    }
    
    return data;
  },
  
  async executeAnalytics(params, odataRequest) {
    // Get source data
    const orderService = await this.base.getEntityInterface('SalesOrders', 'source');
    if (!orderService) {
      console.warn('⚠️ Source service not available');
      return [];
    }
    
    let orders = orderService.getData();
    
    // Apply parameter filters
    orders = this.applyFilters(orders, params);
    
    // Transform to analytics format
    return orders.map((order, index) => ({
      ID: `${params.ParameterID}-${index}`,
      OrderID: order.OrderID,
      CustomerID: order.CustomerID,
      CustomerName: order.CustomerName || 'Unknown',
      OrderDate: order.OrderDate,
      TotalAmount: order.TotalAmount,
      CurrencyCode: order.CurrencyCode,
      Status: order.Status,
      CompanyCode: order.CompanyCode,
      SalesOrganization: order.SalesOrganization
    }));
  },
  
  applyFilters(orders, params) {
    return orders.filter(order => {
      // Filter by company code
      if (params.P_CompanyCode && order.CompanyCode !== params.P_CompanyCode) {
        return false;
      }
      
      // Filter by sales organization
      if (params.P_SalesOrganization && order.SalesOrganization !== params.P_SalesOrganization) {
        return false;
      }
      
      // Filter by date range
      if (params.P_DateFrom || params.P_DateTo) {
        const orderDate = new Date(order.OrderDate);
        const dateFrom = params.P_DateFrom ? new Date(params.P_DateFrom) : new Date('1900-01-01');
        const dateTo = params.P_DateTo ? new Date(params.P_DateTo) : new Date('2099-12-31');
        
        if (orderDate < dateFrom || orderDate > dateTo) {
          return false;
        }
      }
      
      // Filter by currency
      if (params.P_Currency && order.CurrencyCode !== params.P_Currency) {
        return false;
      }
      
      // Filter by minimum amount
      if (params.P_MinAmount && parseFloat(order.TotalAmount) < parseFloat(params.P_MinAmount)) {
        return false;
      }
      
      return true;
    });
  }
};
```

---

## 412 Warnings in Strict/Non-Strict Mode ([Sample](../../../samples/error-handling))

**Scenario**: Draft validation with different behavior based on strict mode.

### Implementation

**Products.js**:
```javascript
module.exports = {
  executeAction: function(actionDefinition, actionData, keys, odataRequest) {
    if (actionDefinition.name === 'draftPrepare') {
      console.log(`🔍 Validating draft in ${odataRequest.isStrictMode ? 'STRICT' : 'NON-STRICT'} mode`);
      
      const messages = [];
      
      // Critical validation errors
      if (!actionData.Name || actionData.Name.trim().length < 3) {
        messages.push({
          code: 'NAME_TOO_SHORT',
          message: 'Product name must be at least 3 characters long',
          severity: 'error',
          target: 'Name',
          transition: false,
          '@Common.numericSeverity': 4
        });
      }
      
      // Warning messages
      if (parseFloat(actionData.Price) > 10000) {
        messages.push({
          code: 'HIGH_PRICE',
          message: 'Price exceeds normal range (>10,000)',
          severity: 'warning',
          target: 'Price',
          transition: true,
          '@Common.numericSeverity': 3
        });
      }
      
      // Check for blocking errors
      const hasErrors = messages.some(m => m.severity === 'error');
      
      // In STRICT mode, throw 412 if there are errors
      if (hasErrors && odataRequest.isStrictMode) {
        this.throwError('Draft validation failed', 412, {
          error: {
            code: 'DRAFT_VALIDATION_FAILED',
            message: 'Cannot activate draft due to validation errors',
            details: messages,
            '@Common.numericSeverity': 4
          }
        });
      }
      
      // Return entity with messages
      return {
        ...actionData,
        SAP__Messages: messages.length > 0 ? messages : undefined
      };
    }
  }
};
```

---

## What's Next?

- 🧪 **[OPA5 Testing](../../opa5-testing/README.md)** - Test these advanced scenarios
- 📖 **[Best Practices](../../best-practices/mock-data.md)** - Learn optimization techniques
- 🔍 **[Troubleshooting](../../troubleshooting/README.md)** - Debug complex issues

