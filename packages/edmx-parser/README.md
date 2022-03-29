# @sap-ux/edmx-parser

Provides a way to parse OData metadata document and annotations files into an object structure.

This structure can be used as is or can be then passed onto the `@sap-ux/annotation-converter` module that will provide an even more flexible and user friendly interface.

The parser also exposes a `merge` method to merge multiple metadata document together if required.


## Installation
npm
`npm install --save-dev @sap-ux/edmx-parser`

yarn
`yarn add @sap-ux/edmx-parser --dev`

pnpm
`pnpm add @sap-ux/edmx-parser --dev`

## Usage

Import the `parse` or `merge` method from the module

`import { parse, merge } from '@sap-ux/edmx-parser';`

Use it on an edmx / annotation file

```typescript
const myEdmxFile = await fs.readFile(...)
const myAnnotationFile = await fs.readFile(...)
const myParsedEdmx = parse(myEdmxFile);
const myParsedAnnotation = parse(myAnnotationFile);

const myMergedContent = merge(myParsedEdmx, myParsedAnnotation)
```

## Keywords
Metadata Parser


