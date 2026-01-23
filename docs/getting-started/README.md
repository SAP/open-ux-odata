# Getting Started with FE Mockserver

## Introduction

### What is the FE Mockserver?

The SAP Fiori Elements (FE) Mockserver is a powerful development tool that simulates OData services locally, allowing you to develop and test SAP Fiori applications without requiring a backend connection. It's particularly valuable for:

- **Frontend development** when the backend isn't ready yet
- **OPA5 automated testing** with consistent, controlled data
- **Rapid prototyping** and demonstration scenarios
- **Offline development** when backend access is unavailable

### Why Use It for OPA5 Tests?

OPA5 (One Page Acceptance) tests require stable, predictable data to validate application behavior. The mockserver provides:

- **Deterministic data**: Same data every test run
- **Isolation**: Tests don't interfere with each other
- **Speed**: No network latency or backend processing
- **Control**: Simulate error conditions and edge cases
- **Flexibility**: Test complex scenarios without backend changes

### Key Benefits and Capabilities

✅ **Full OData v2 and v4 support** - Works with both protocol versions  
✅ **CRUD operations** - Create, Read, Update, Delete out of the box  
✅ **Draft handling** - Full draft/active entity support  
✅ **Custom actions/functions** - Implement bound and unbound operations  
✅ **Multi-service support** - Mock multiple OData services simultaneously  
✅ **Cross-service communication** - Services can interact with each other  
✅ **Extensible API** - Customize behavior with JavaScript/TypeScript  
✅ **Hierarchical data** - Support for deep parent-child relationships  
✅ **Query operations** - Full $filter, $expand, $select, $orderby support  

### Prerequisites and Requirements

Before you begin, ensure you have:

- **UI5 CLI** (optional but recommended): `npm install -g @ui5/cli`
- **Basic knowledge of**:
  - OData protocol (v2 or v4)
  - SAP Fiori Elements applications
  - JSON and JavaScript basics

---

## Quick Start Guide

### Step 1: Install the Mockserver

For a UI5 application, install the middleware:

```bash
npm install --save-dev @sap-ux/ui5-middleware-fe-mockserver
```


### Step 2: Configure Your Project

Create or update your `ui5.yaml` file in the project root:

```yaml
specVersion: "3.0"
metadata:
  name: my-app
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        mountPath: /
        services:
          - urlPath: /sap/opu/odata/sap/SEPMRA_PROD_MAN
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
            generateMockData: true
```

### Step 3: Prepare Your Metadata

Place your OData service metadata XML file in the specified location:

```
my-app/
├── webapp/
│   └── localService/
│       ├── metadata.xml          # Your OData service metadata
│       └── data/                 # Mock data folder (will be created)
└── ui5.yaml
```

**Tip**: You can download metadata from your backend service:
```bash
curl "https://your-backend.com/sap/opu/odata/sap/YOUR_SERVICE/$metadata" > webapp/localService/metadata.xml
```

### Step 4: Run Your Application

Start the development server:

```bash
ui5 serve
```

Or with npm script:

```bash
npm start
```

The mockserver will automatically:
- Parse your metadata
- Generate sample data (if `generateMockData: true`)
- Serve OData requests at the configured path

### Step 5: Test It Works

Open your browser to `http://localhost:8080` and check:

1. **Service Document**: Navigate to your service path (e.g., `/sap/opu/odata/sap/SEPMRA_PROD_MAN/`)
2. **Entity Set**: Try fetching data (e.g., `/sap/opu/odata/sap/SEPMRA_PROD_MAN/Products`)
3. **Metadata**: Verify metadata loads (e.g., `/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata`)

You should see JSON responses with mock data!

---

## Common Pitfalls for Beginners

### ❌ Pitfall 1: Wrong Path Configuration

**Problem**: Service returns 404

```yaml
# ❌ Wrong - paths don't match
services:
  - urlPath: /sap/opu/odata/MYSERVICE
    metadataPath: ./webapp/localService/OTHERSERVICE/metadata.xml
```

**Solution**: Ensure urlPath matches your application's data source

```yaml
# ✅ Correct
services:
  - urlPath: /sap/opu/odata/MYSERVICE
    metadataPath: ./webapp/localService/metadata.xml
```

### ❌ Pitfall 2: Missing Middleware Registration

**Problem**: Mockserver doesn't start

**Solution**: Check that middleware is in the correct location in `ui5.yaml`:

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression  # Important!
      configuration:
        # ... your config
```

### ❌ Pitfall 3: Invalid Metadata XML

**Problem**: Mockserver fails to start with parsing errors

**Solution**: Validate your metadata XML:
- Ensure it's valid XML (no missing tags)
- Check namespace declarations
- Test it loads directly from the backend first

### ❌ Pitfall 4: Mock Data Format Mismatch

**Problem**: Data shows up empty or causes errors

```json
// ❌ Wrong - array instead of objects
[
  "Product1",
  "Product2"
]
```

**Solution**: Each entity must be an object with properties matching metadata:

```json
// ✅ Correct
[
  {
    "ProductID": "001",
    "ProductName": "Product 1",
    "Price": "99.99"
  },
  {
    "ProductID": "002",
    "ProductName": "Product 2",
    "Price": "149.99"
  }
]
```

### ❌ Pitfall 5: Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::8080`

**Solution**: Either kill the process using port 8080, or use a different port:

```bash
ui5 serve --port 8081
```

---

## Basic Configuration

### Understanding Configuration Files

The mockserver uses two main configuration approaches:

#### 1. YAML Configuration (Recommended for UI5 Apps)

File: `ui5.yaml` or `ui5-mock.yaml`

```yaml
specVersion: "3.0"
metadata:
  name: my-app
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        mountPath: /
        services:
          - urlPath: /sap/opu/odata/sap/MY_SERVICE
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/data
            generateMockData: true
```

#### 2. JavaScript Configuration (Advanced)

File: `ui5.yaml` or `ui5-mock.yaml`

```yaml
specVersion: "3.0"
metadata:
  name: my-app
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        mountPath: /
        mockFolder: ./webapp/localService
```

File: `webapp/localService/config.js`
```javascript
module.exports = {
  services: [
    {
      urlPath: '/sap/opu/odata/sap/MY_SERVICE',
      metadataPath: './localService/metadata.xml',
      mockdataPath: './localService/data',
      generateMockData: true
    }
  ]
};
```

**Note**: The `module.exports = {}` wrapper is essential - it exports your configuration as a Node.js module.

### Complete Configuration Example

Here's a full example with all common options:

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      afterMiddleware: compression
      configuration:
        # Base path for all services
        mountPath: /
        
        # Enable debug logging
        debug: true
        
        # Services array
        services:
          - # Service endpoint URL
            urlPath: /sap/opu/odata/sap/SEPMRA_PROD_MAN
            
            # Path to metadata file
            metadataPath: ./webapp/localService/metadata.xml
            
            # Path to mock data folder
            mockdataPath: ./webapp/localService/data
            
            # Auto-generate sample data
            generateMockData: true
            
            # Annotations (optional)
            annotations:
              - localPath: ./webapp/localService/annotations.xml
                urlPath: /annotations
            
            # Watch mode - reload on file changes
            watch: true
```

### Configuring Single vs. Multiple Services

#### Single Service (Simple)

```yaml
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
    metadataPath: ./webapp/localService/metadata.xml
    mockdataPath: ./webapp/localService/data
```

#### Multiple Services (Advanced)

```yaml
services:
  # Main service
  - urlPath: /sap/opu/odata/sap/MAIN_SERVICE
    metadataPath: ./webapp/localService/main/metadata.xml
    mockdataPath: ./webapp/localService/main/data
    
  # Value help service
  - urlPath: /sap/opu/odata/sap/VALUE_HELP_SERVICE
    metadataPath: ./webapp/localService/valuehelp/metadata.xml
    mockdataPath: ./webapp/localService/valuehelp/data
    
  # Cross-reference service
  - urlPath: /sap/opu/odata/sap/REFERENCE_SERVICE
    metadataPath: ./webapp/localService/reference/metadata.xml
    mockdataPath: ./webapp/localService/reference/data
```

### Service URL Mappings

The `urlPath` should match your application's data source configuration.

**In manifest.json**:
```json
{
  "sap.app": {
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/MY_SERVICE/",
        "type": "OData",
        "settings": {
          "odataVersion": "4.0"
        }
      }
    }
  }
}
```

**In ui5.yaml**:
```yaml
services:
  - urlPath: /sap/opu/odata/sap/MY_SERVICE
```

**Important**: The paths must match! The trailing slash in manifest is optional but be consistent.

---

## What's Next?

Now that you have the basics:

1. 📚 **[Core Concepts](../core-concepts/README.md)** - Learn about mock data fundamentals, entity sets, and request handling
2. 🔧 **[Configuration Reference](../configuration-reference/README.md)** - Detailed configuration options
3. 📝 **[Examples](../examples/README.md)** - See complete working examples

---

## Need Help?

- 📖 **API Reference**: [MockserverAPI.md](../MockserverAPI.md)
- 🐛 **Troubleshooting**: [Common issues and solutions](../troubleshooting/README.md)
- 💡 **Examples**: [Real-world scenarios](../examples/README.md)
- 🔗 **GitHub Issues**: [Report bugs or request features](https://github.com/SAP/open-ux-odata/issues)

