# CDS Views with Parameters Sample

This sample demonstrates how to use the FE Mockserver with CDS views that have parameters and value help integration.

## Features

- ✅ CDS view with parametrized queries
- ✅ Value help integration with dependent dropdowns
- ✅ Cross-service data access
- ✅ Dynamic result generation based on parameters
- ✅ Multi-service configuration

## Project Structure

```
cds-parameters/
├── ui5.yaml                          # Mockserver configuration
├── package.json
├── webapp/
│   ├── manifest.json                 # App configuration
│   └── localService/
│       ├── analytics/                # CDS View Service
│       │   ├── metadata.xml
│       │   └── data/
│       │       └── P_SalesAnalyticsParameters.js
│       ├── valuehelp/                # Value Help Service
│       │   ├── metadata.xml
│       │   └── data/
│       │       ├── CompanyCodes.json
│       │       ├── SalesOrganizations.json
│       │       └── Currencies.json
│       └── source/                   # Source Data Service
│           ├── metadata.xml
│           └── data/
│               └── SalesOrders.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the mockserver:
```bash
npm start
```

3. Open in browser:
```
http://localhost:8080
```

## Testing the CDS View

### Test 1: Basic Parameter Query

Get analytics with default parameters:
```
GET http://localhost:8080/sap/opu/odata4/sap/sales_analytics/0001/P_SalesAnalyticsParameters(ParameterID='1')?$expand=Results
```

### Test 2: Filter by Company Code

Get orders for company code 1000:
```
GET http://localhost:8080/sap/opu/odata4/sap/sales_analytics/0001/P_SalesAnalyticsParameters(ParameterID='1',P_CompanyCode='1000')?$expand=Results
```

### Test 3: Filter by Date Range and Amount

Get high-value orders in Q1 2024:
```
GET http://localhost:8080/sap/opu/odata4/sap/sales_analytics/0001/P_SalesAnalyticsParameters(ParameterID='1',P_DateFrom='2024-01-01',P_DateTo='2024-03-31',P_MinAmount='3000.00')?$expand=Results
```

### Test 4: Multiple Filters

Get EUR orders from sales org 1010:
```
GET http://localhost:8080/sap/opu/odata4/sap/sales_analytics/0001/P_SalesAnalyticsParameters(ParameterID='1',P_SalesOrganization='1010',P_Currency='EUR')?$expand=Results
```

## Value Help Testing

### Get Company Codes
```
GET http://localhost:8080/sap/opu/odata/sap/VH_COMPANY/CompanyCodes
```

### Get Sales Organizations for Company 1000
```
GET http://localhost:8080/sap/opu/odata/sap/VH_COMPANY/SalesOrganizations?$filter=CompanyCode eq '1000'
```

### Get All Currencies
```
GET http://localhost:8080/sap/opu/odata/sap/VH_COMPANY/Currencies
```

## Key Features Demonstrated

### 1. Parameter Entity with Value Helps
The parameter entity defines the filter criteria with value help annotations linking to the value help service.

### 2. Dynamic Result Generation
The `P_SalesAnalyticsParameters.js` file implements:
- `getInitialDataSet()`: Returns default parameters
- `onAfterRead()`: Executes the analytics query when Results are expanded
- `executeAnalytics()`: Fetches data from source service and applies filters
- `applyFilters()`: Implements the parameter filtering logic

### 3. Cross-Service Communication
The implementation accesses the source service using:
```javascript
const orderService = await this.base.getEntityInterface('SalesOrders', 'source');
```

### 4. Dependent Value Helps
Sales Organizations are filtered by Company Code, demonstrating cascading value helps.

## Customization

### Adding More Parameters

Edit `analytics/metadata.xml` to add new parameter properties:
```xml
<Property Name="P_Status" Type="Edm.String" MaxLength="20"/>
```

Update `P_SalesAnalyticsParameters.js` to handle the new filter:
```javascript
if (params.P_Status && order.Status !== params.P_Status) {
  return false;
}
```

### Adding More Value Helps

1. Add entity type to `valuehelp/metadata.xml`
2. Create corresponding JSON file in `valuehelp/data/`
3. Add value list annotation in `analytics/metadata.xml`

## Troubleshooting

### No Results Returned

Check that:
- Parameters match data in SalesOrders.json
- Date format is correct (YYYY-MM-DD)
- $expand=Results is included in the request

### Value Helps Not Working

Verify:
- Value help service is configured in ui5.yaml
- Value list annotations target the correct entity set
- JSON data files exist and are properly formatted

## Learn More

- [Documentation: CDS Views with Parameters](../../docs/examples/advanced/README.md#cds-views-with-parameters)
- [Documentation: Value Help Configuration](../../docs/value-help/README.md)
- [Documentation: Cross-Service Communication](../../docs/advanced-features/README.md#multiple-services-and-cross-service-communication)
specVersion: "3.0"
metadata:
  name: cds-parameters-app
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

