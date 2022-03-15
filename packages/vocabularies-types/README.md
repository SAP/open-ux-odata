# @sap-ux/vocabularies-types

Defines Typescript types based on the OData vocabularies.

The types are meant to be used in conjuction with the annotation-converter in order to get an object structure that provide those them.



## Installation
npm
`npm install --save-dev @sap-ux/vocabularies-types`

yarn
`yarn add @sap-ux/vocabularies-types --dev`

pnpm
`pnpm add @sap-ux/vocabularies-types --dev`

## Usage


```Typescript
import { generate } from '@sap-ux/fe-fpm-writer';
import { join } from 'path';

const projectDir = join(__dirname, 'test/test-input/basic-lrop');
const fs = await generateCustomPage(
    targetPath,
    {
        name: 'MyCustomPage',
        entity: 'Booking',
        navigation: {
            sourceEntity: 'Travel',
            sourcePage: 'TravelObjectPage',
            navEntity: '_Booking'
        }
});

fs.commit();

```

## Keywords
OData Vocabularies
