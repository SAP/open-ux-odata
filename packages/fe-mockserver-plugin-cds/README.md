# @sap-ux/fe-mockserver-plugin-cds

`MetadataProcessor` plugin for the fe-mockserver that allows to use `cds` file as source for the metadataPath.



## Installation
npm
`npm install --save-dev @sap-ux/fe-mockserver-plugin-cds`

yarn
`yarn add @sap-ux/fe-mockserver-plugin-cds --dev`

pnpm
`pnpm add @sap-ux/fe-mockserver-plugin-cds --dev`

*Note*: You will also need to install and provide a @sap/cds-compiler version.

## Usage

In the mockserver configuration, specify that you want to use this plugin for the metadata processing as follows :

```yaml
 - name: sap-fe-mockserver
     beforeMiddleware: compression
     configuration:
       metadataProcessor: 
         name: "@sap-ux/fe-mockserver-plugin-cds"
       service:
         urlPath: /here/goes/your/serviceurl
         metadataPath: ./webapp/localService/metadata.cds
         mockDataPath: ./webapp/localService/mockdata
```

You can also specify that you want this to generate a v2 service by using the following syntax

```yaml
 - name: sap-fe-mockserver
     beforeMiddleware: compression
     configuration:
       metadataProcessor: 
        name: "@sap-ux/fe-mockserver-plugin-cds"
        options: 
          odataVersion: v2
       service:
         urlPath: /here/goes/your/serviceurl
         metadataPath: ./webapp/localService/metadata.cds
         mockDataPath: ./webapp/localService/mockdata
```

## Keywords
CDS Plugin Mockserver


