# Value Help and Filter Bar

This guide covers value help configuration, filter bar integration, and complex filter scenarios with the FE Mockserver.

---

## Table of Contents

- [Value Help Configuration](#value-help-configuration)
- [Complex Filter Scenarios](#complex-filter-scenarios)
- [CDS View Parameters](#cds-view-parameters)

---

## Value Help Configuration

### Setting Up Value Help Entities

Value help entities provide lookup data for dropdowns, filters, and input fields.

#### Basic Value Help Configuration

**ui5.yaml**:
```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          # Main service
          - urlPath: /sap/opu/odata/sap/SALES_ORDER_SRV
            metadataPath: ./webapp/localService/main/metadata.xml
            mockdataPath: ./webapp/localService/main/data
            alias: main-service
            
          # Value help service for currencies
          - urlPath: /sap/opu/odata/sap/VH_CURRENCIES
            metadataPath: ./webapp/localService/vh/currencies/metadata.xml
            mockdataPath: ./webapp/localService/vh/currencies/data
            alias: vh-currencies
            
          # Value help service for countries
          - urlPath: /sap/opu/odata/sap/VH_COUNTRIES
            metadataPath: ./webapp/localService/vh/countries/metadata.xml
            mockdataPath: ./webapp/localService/vh/countries/data
            alias: vh-countries
```

#### Value Help Metadata

**currencies/metadata.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="ValueHelp" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      
      <EntityType Name="Currency">
        <Key>
          <PropertyRef Name="CurrencyCode"/>
        </Key>
        <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3" Nullable="false"/>
        <Property Name="CurrencyName" Type="Edm.String"/>
        <Property Name="Symbol" Type="Edm.String" MaxLength="5"/>
        <Property Name="DecimalPlaces" Type="Edm.Int32"/>
      </EntityType>
      
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Currencies" EntityType="ValueHelp.Currency"/>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

#### Value Help Mock Data

**currencies/data/Currencies.json**:
```json
[
  {
    "CurrencyCode": "EUR",
    "CurrencyName": "Euro",
    "Symbol": "€",
    "DecimalPlaces": 2
  },
  {
    "CurrencyCode": "USD",
    "CurrencyName": "US Dollar",
    "Symbol": "$",
    "DecimalPlaces": 2
  },
  {
    "CurrencyCode": "GBP",
    "CurrencyName": "British Pound Sterling",
    "Symbol": "£",
    "DecimalPlaces": 2
  },
  {
    "CurrencyCode": "JPY",
    "CurrencyName": "Japanese Yen",
    "Symbol": "¥",
    "DecimalPlaces": 0
  },
  {
    "CurrencyCode": "CHF",
    "CurrencyName": "Swiss Franc",
    "Symbol": "CHF",
    "DecimalPlaces": 2
  },
  {
    "CurrencyCode": "CNY",
    "CurrencyName": "Chinese Yuan",
    "Symbol": "¥",
    "DecimalPlaces": 2
  }
]
```

### Filter Bar Value Help Resolution

When a filter bar field references a value help, the mockserver resolves it automatically.

#### Main Service Metadata with Value Help Annotation

**main/metadata.xml**:
```xml
<EntityType Name="SalesOrder">
  <Key>
    <PropertyRef Name="OrderID"/>
  </Key>
  <Property Name="OrderID" Type="Edm.String" Nullable="false"/>
  <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3"/>
  <Property Name="Country" Type="Edm.String" MaxLength="2"/>
</EntityType>

<Annotations Target="SalesService.SalesOrder/CurrencyCode">
  <Annotation Term="Common.ValueList">
    <Record Type="Common.ValueListType">
      <PropertyValue Property="CollectionPath" String="Currencies"/>
      <PropertyValue Property="Parameters">
        <Collection>
          <Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="CurrencyCode"/>
            <PropertyValue Property="ValueListProperty" String="CurrencyCode"/>
          </Record>
          <Record Type="Common.ValueListParameterDisplayOnly">
            <PropertyValue Property="ValueListProperty" String="CurrencyName"/>
          </Record>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>
```

### CDS View Parameters with Value Helps

CDS views often use parameters that need value help.

#### Parameter Entity Definition

**Metadata**:
```xml
<EntityType Name="SalesOrderParameters">
  <Key>
    <PropertyRef Name="ParameterID"/>
  </Key>
  <Property Name="ParameterID" Type="Edm.String"/>
  <Property Name="CompanyCode" Type="Edm.String" MaxLength="4"/>
  <Property Name="SalesOrganization" Type="Edm.String" MaxLength="4"/>
  <Property Name="DateFrom" Type="Edm.Date"/>
  <Property Name="DateTo" Type="Edm.Date"/>
</EntityType>

<Annotations Target="CDS.SalesOrderParameters/CompanyCode">
  <Annotation Term="Common.ValueList">
    <Record Type="Common.ValueListType">
      <PropertyValue Property="CollectionPath" String="CompanyCodes"/>
      <PropertyValue Property="Parameters">
        <Collection>
          <Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="CompanyCode"/>
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
```

#### Value Help for Parameters

**CompanyCodes.json**:
```json
[
  {
    "CompanyCode": "1000",
    "CompanyName": "SAP AG",
    "Country": "DE",
    "Currency": "EUR"
  },
  {
    "CompanyCode": "2000",
    "CompanyName": "SAP America",
    "Country": "US",
    "Currency": "USD"
  },
  {
    "CompanyCode": "3000",
    "CompanyName": "SAP UK",
    "Country": "GB",
    "Currency": "GBP"
  }
]
```

### Separate Service Configuration for Value Helps

**Complete Example**:

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        services:
          # Main CDS view service
          - urlPath: /sap/opu/odata4/sap/sales_analytics/0001
            metadataPath: ./webapp/localService/analytics/metadata.xml
            mockdataPath: ./webapp/localService/analytics/data
            alias: analytics
            
          # Company code value help
          - urlPath: /sap/opu/odata/sap/VH_COMPANY_CODE
            metadataPath: ./webapp/localService/vh/companycode/metadata.xml
            mockdataPath: ./webapp/localService/vh/companycode/data
            generateMockData: false
            alias: vh-company
            
          # Sales organization value help
          - urlPath: /sap/opu/odata/sap/VH_SALES_ORG
            metadataPath: ./webapp/localService/vh/salesorg/metadata.xml
            mockdataPath: ./webapp/localService/vh/salesorg/data
            generateMockData: false
            alias: vh-salesorg
```

### Mock Data for Value Help Scenarios

#### Hierarchical Value Helps

**SalesOrganizations.json**:
```json
[
  {
    "SalesOrganization": "1000",
    "SalesOrgName": "Germany Sales",
    "CompanyCode": "1000",
    "Country": "DE"
  },
  {
    "SalesOrganization": "1010",
    "SalesOrgName": "Germany Direct",
    "CompanyCode": "1000",
    "Country": "DE"
  },
  {
    "SalesOrganization": "2000",
    "SalesOrgName": "US East",
    "CompanyCode": "2000",
    "Country": "US"
  },
  {
    "SalesOrganization": "2010",
    "SalesOrgName": "US West",
    "CompanyCode": "2000",
    "Country": "US"
  }
]
```

#### Dynamic Value Help Filtering

**SalesOrganizations.js**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    // Filter by company code if provided in query
    const filters = odataRequest.queryOptions?.$filter;
    
    if (filters && filters.includes('CompanyCode')) {
      // Filtering handled automatically by mockserver
      return data;
    }
    
    // Add additional computed fields
    return data.map(org => ({
      ...org,
      DisplayText: `${org.SalesOrganization} - ${org.SalesOrgName}`
    }));
  }
};
```

---

## Complex Filter Scenarios

### Multi-Service Filter Dependencies

**Scenario**: Filter sales orders by product category, where products are in a separate service.

**Implementation** (`SalesOrders.js`):
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const filters = odataRequest.queryOptions?.$filter;
    
    // Check if filtering by category
    if (filters && filters.includes('ProductCategory')) {
      const productService = await this.base.getEntityInterface('Products', 'product-service');
      const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
      
      // Extract category from filter (simplified)
      const categoryMatch = filters.match(/ProductCategory eq '([^']+)'/);
      const targetCategory = categoryMatch ? categoryMatch[1] : null;
      
      if (targetCategory) {
        // Get products in category
        const productsInCategory = productService.getData()
          .filter(p => p.Category === targetCategory)
          .map(p => p.ProductID);
        
        // Get orders containing these products
        const validOrderIDs = new Set(
          itemInterface.getData()
            .filter(item => productsInCategory.includes(item.ProductID))
            .map(item => item.OrderID)
        );
        
        // Filter orders
        return data.filter(order => validOrderIDs.has(order.OrderID));
      }
    }
    
    return data;
  }
};
```

### Dynamic Value Help

**Scenario**: Available currencies depend on selected company code.

**Implementation** (`Currencies.js`):
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const filters = odataRequest.queryOptions?.$filter;
    
    // Check for company code filter
    if (filters && filters.includes('CompanyCode')) {
      const companyMatch = filters.match(/CompanyCode eq '([^']+)'/);
      const companyCode = companyMatch ? companyMatch[1] : null;
      
      if (companyCode) {
        // Get company's default currency
        const companyService = await this.base.getEntityInterface('CompanyCodes', 'vh-company');
        const company = companyService.fetchEntries({ CompanyCode: companyCode });
        
        if (company) {
          // Return only currencies valid for this company
          const validCurrencies = [company.Currency, 'EUR', 'USD']; // Example logic
          return data.filter(curr => validCurrencies.includes(curr.CurrencyCode));
        }
      }
    }
    
    return data;
  }
};
```

### Custom Filter Implementations

**Complex Date Range Filtering**:
```javascript
module.exports = {
  async onAfterRead(data, odataRequest) {
    const filters = odataRequest.queryOptions?.$filter;
    
    if (filters) {
      // Handle fiscal year filter
      if (filters.includes('FiscalYear')) {
        const yearMatch = filters.match(/FiscalYear eq '([^']+)'/);
        const fiscalYear = yearMatch ? yearMatch[1] : null;
        
        if (fiscalYear) {
          // Convert fiscal year to date range
          const startDate = new Date(`${fiscalYear}-04-01`); // Fiscal year starts April 1
          const endDate = new Date(`${parseInt(fiscalYear) + 1}-03-31`);
          
          return data.filter(order => {
            const orderDate = new Date(order.OrderDate);
            return orderDate >= startDate && orderDate <= endDate;
          });
        }
      }
      
      // Handle quarter filter
      if (filters.includes('FiscalQuarter')) {
        const quarterMatch = filters.match(/FiscalQuarter eq '([^']+)'/);
        const quarter = quarterMatch ? quarterMatch[1] : null;
        
        if (quarter) {
          const [year, q] = quarter.split('-Q');
          const quarterStartMonth = (parseInt(q) - 1) * 3 + 3; // Fiscal quarters
          const startDate = new Date(year, quarterStartMonth, 1);
          const endDate = new Date(year, quarterStartMonth + 3, 0);
          
          return data.filter(order => {
            const orderDate = new Date(order.OrderDate);
            return orderDate >= startDate && orderDate <= endDate;
          });
        }
      }
    }
    
    return data;
  }
};
```

---

## CDS View Parameters

### Parameter Entity with Value Helps

**Complete Example**:

#### CDS Metadata with Parameters

```xml
<EntityType Name="P_SalesOrderAnalytics">
  <Key>
    <PropertyRef Name="ID"/>
  </Key>
  <Property Name="ID" Type="Edm.String"/>
  <!-- Result fields -->
  <Property Name="OrderID" Type="Edm.String"/>
  <Property Name="CustomerName" Type="Edm.String"/>
  <Property Name="TotalAmount" Type="Edm.Decimal"/>
</EntityType>

<EntityType Name="P_SalesOrderAnalyticsParameters">
  <Key>
    <PropertyRef Name="ParameterID"/>
  </Key>
  <Property Name="ParameterID" Type="Edm.String"/>
  <!-- Parameters with value helps -->
  <Property Name="P_CompanyCode" Type="Edm.String"/>
  <Property Name="P_SalesOrganization" Type="Edm.String"/>
  <Property Name="P_DateFrom" Type="Edm.Date"/>
  <Property Name="P_DateTo" Type="Edm.Date"/>
  <Property Name="P_Currency" Type="Edm.String"/>
  
  <!-- Navigation to results -->
  <NavigationProperty Name="Results" Type="Collection(CDS.P_SalesOrderAnalytics)"/>
</EntityType>

<EntityContainer Name="EntityContainer">
  <EntitySet Name="P_SalesOrderAnalytics" EntityType="CDS.P_SalesOrderAnalytics"/>
  <EntitySet Name="P_SalesOrderAnalyticsParameters" EntityType="CDS.P_SalesOrderAnalyticsParameters"/>
</EntityContainer>

<!-- Value help annotations -->
<Annotations Target="CDS.P_SalesOrderAnalyticsParameters/P_CompanyCode">
  <Annotation Term="Common.ValueList">
    <Record Type="Common.ValueListType">
      <PropertyValue Property="CollectionPath" String="CompanyCodes"/>
      <PropertyValue Property="Parameters">
        <Collection>
          <Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="P_CompanyCode"/>
            <PropertyValue Property="ValueListProperty" String="CompanyCode"/>
          </Record>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>

<Annotations Target="CDS.P_SalesOrderAnalyticsParameters/P_Currency">
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
```

#### Parameter Handling in Mock Data

**P_SalesOrderAnalyticsParameters.js**:
```javascript
module.exports = {
  getInitialDataSet: function(contextId) {
    // Return default parameter set
    return [
      {
        ParameterID: "1",
        P_CompanyCode: "1000",
        P_SalesOrganization: "",
        P_DateFrom: "2024-01-01",
        P_DateTo: "2024-12-31",
        P_Currency: "EUR"
      }
    ];
  },
  
  // Handle navigation to results
  async onAfterRead(data, odataRequest) {
    // Check if expanding to Results
    if (odataRequest.queryOptions?.$expand?.includes('Results')) {
      const resultsInterface = await this.base.getEntityInterface('P_SalesOrderAnalytics');
      const ordersInterface = await this.base.getEntityInterface('SalesOrders', 'main-service');
      
      return data.map(params => {
        // Filter orders based on parameters
        const filteredOrders = this.filterOrdersByParameters(
          ordersInterface.getData(),
          params
        );
        
        // Convert to analytics format
        const results = filteredOrders.map((order, index) => ({
          ID: `${params.ParameterID}-${index}`,
          OrderID: order.OrderID,
          CustomerName: order.CustomerName,
          TotalAmount: order.TotalAmount
        }));
        
        return {
          ...params,
          Results: results
        };
      });
    }
    
    return data;
  },
  
  filterOrdersByParameters: function(orders, params) {
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
      const orderDate = new Date(order.OrderDate);
      const dateFrom = new Date(params.P_DateFrom);
      const dateTo = new Date(params.P_DateTo);
      
      if (orderDate < dateFrom || orderDate > dateTo) {
        return false;
      }
      
      // Filter by currency
      if (params.P_Currency && order.CurrencyCode !== params.P_Currency) {
        return false;
      }
      
      return true;
    });
  }
};
```

### Testing Parametrized Views

**Request**:
```
GET /P_SalesOrderAnalyticsParameters(ParameterID='1')?$expand=Results
```

**Response**:
```json
{
  "ParameterID": "1",
  "P_CompanyCode": "1000",
  "P_SalesOrganization": "",
  "P_DateFrom": "2024-01-01",
  "P_DateTo": "2024-12-31",
  "P_Currency": "EUR",
  "Results": [
    {
      "ID": "1-0",
      "OrderID": "5000001",
      "CustomerName": "ACME Corp",
      "TotalAmount": "5000.00"
    },
    {
      "ID": "1-1",
      "OrderID": "5000002",
      "CustomerName": "Global Tech",
      "TotalAmount": "3500.00"
    }
  ]
}
```

---

## What's Next?

- 🧪 **[OPA5 Testing Integration](../opa5-testing/README.md)** - Automated testing with value helps
- 📖 **[Advanced Examples](../examples/advanced/README.md)** - Complete CDS view examples
- 🔍 **[Configuration Reference](../configuration-reference/README.md)** - All configuration options
- 📚 **[Advanced Features](../advanced-features/README.md)** - Cross-service communication

