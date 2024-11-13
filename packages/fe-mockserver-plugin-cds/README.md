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

## i18n

If you use i18n reference in your project the plugin will automatically replace the i18n reference with the actual value from the i18n file. 
The i18n file should be in the same folder as the metadata file and should be named `i18n.properties` 
 - or in an i18n folder in the same directory as the metadata file.
 - or in an _i18n folder in the same directory as the metadata file.
 - or in an _i18n folder one level above the metadata file.
 - or you can define i18nPath property in the configuration to add more location relativeto the cds file

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
         i18nPath: ../otherlocation/i18n // relative to the metadata file
```

## Keywords
CDS Plugin Mockserver


