# @sap-ux/ui5-middleware-fe-mockserver

## Features

The **SAP Fiori - UI5 middleware for the Fiori elements mock server** is a middleware extension for the [UI5 Tooling](https://github.com/SAP/ui5-tooling). As an alternative to proxying OData requests to a live backend, it supports loading mock data for OData v2/v4 requests for supported Fiori elements templates. As the mock server runs locally without requiring a network connection to a backend system, it is useful for development and test scenarios.

## Installation
npm
`npm install --save-dev @sap-ux/ui5-middleware-fe-mockserver`

yarn
`yarn add @sap-ux/ui5-middleware-fe-mockserver --dev`

pnpm
`pnpm add @sap-ux/ui5-middleware-fe-mockserver --dev`

## Usage

In order to use the mock server, the npm module `@sap/ux-ui5-fe-mockserver-middleware` needs to be added as devDependency and ui5.dependencies to `package.json`, and a valid `ui5.yaml` configuration needs to be provided.
**Entries in package.json**

```
[..]

"devDependencies": {
    "@sap-ux/ui5-middleware-fe-mockserver": "^1"
},
"ui5": {
    "dependencies": [
        "@sap-ux/ui5-middleware-fe-mockserver"
    ]
}

[..]
```

**Example for a yaml configuration file**

```

specVersion: '2.0'
metadata:
  name: <NAME>
type: application
server:
  customMiddleware:
    - name: sap-fe-mockserver
      mountPath: /
      afterMiddleware: compression
      configuration:
        annotations:
          - localPath: './webapp/localService/myServiceAnnotation.xml'
            urlPath: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*'
        services:
          - urlPath: '/sap/opu/odata/sap/<SERVICE_NAME>'
            metadataPath: './webapp/localService/metadata.xml'
            mockdataPath: './webapp/localService/data'
          - urlPath: '/sap/opu/odata/sap/<OTHER_SERVICE_NAME>'
            metadataPath: './webapp/localService/other_metadata.xml'
            mockdataPath: './webapp/localService/data'

```


## Service Configuration

Each service must provide at least two things

- urlPath : where will your service be accessible from
- metadataPath : local path to your metadata file

On top of that you can specify one of the following option

- mockdataPath : the path to the folder containing the mockdata files
- generateMockData : whether or not you want to use automatically generated mockdata

Additional option are available either per service of for all services if defined globally

- debug : toggle the debug mode
- watch : toggle the watch mode, the mockserver will restart the service where data or metadata have changed
- noETag : disable ETag support on metadata
- strictKeyMode : disable the default "loose" mode for the key matching, you can try this if the mockserver returns too much data
- contextBasedIsolation : enable the support of "tenants", by adding /tenant-xxx at the very start of your service call you will be able to work on tenant isolated data.

You can also define static annotation file using the `annotations` entry, each annotation must provide

- urlPath : where will your annotation be accessible from
- localPath : local path to your annotation file

**Sample application**

See the usage in demo apps [SAP Fiori sample apps](https://github.com/SAP-samples/fiori-tools-samples)

## Support

Join the [SAP Fiori tools Community](https://community.sap.com/search/?by=updated&ct=blog&mt=73555000100800002345). Ask Questions, Read the Latest Blogs, Explore Content.
Please assign tag: _SAP Fiori tools_

To log an issue with SAP Fiori tools, please see [Contact SAP Support](https://help.sap.com/viewer/1bb01966b27a429ebf62fa2e45354fea/Latest/en-US).

## Keywords
Mockserver, Middleware
