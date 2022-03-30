# @sap-ux/annotation-converter

Provides a way to convert a raw metadata document object into a convenient structure where path are resolved already for you.

The goal of this module is to provide an object that is ready to use and should cover most of the needs one can have when it comes to manipulating an odata service and its annotation.

All the object defined by this will be compatible with the @sap-ux/vocabularies-types providing an easy way to evaluate annotations.

## Installation
npm
`npm install --save-dev @sap-ux/annotation-converter`

yarn
`yarn add @sap-ux/annotation-converter --dev`

pnpm
`pnpm add @sap-ux/annotation-converter --dev`

## Usage

Import the `convert` method from the module

`import { convert } from '@sap-ux/annotation-converter';`

Use it on a raw metadata generated from `@sap-ux/edmx-parser` or complying to the same structure

```typescript
const myRawMetadata = ... 

const myConvertedMetadata = convert(myRawMetadata);
const isDraftEnabled = myConvertedMetadata.entityTypes[0].annotations.Common?.DraftRoot || myConvertedMetadata.entityTypes[0].annotations.Common?.DraftNode;
const myLabel = myConvertedMetadata.entityTypes[0].properties[0].annotations?.Common?.Text?.$target?.name // Property name of the text annotation if it exists
```

## Keywords
Annotation Converter


