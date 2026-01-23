# TypeScript Support

The mockserver supports TypeScript for defining your custom mockdata logic. This provides better developer experience with autocompletion and type checking.

## Mock Data Contributors in TypeScript

To use TypeScript for your mockdata, you can create a `.ts` file with the name of the entity set you want to mock in your `mockdataPath` folder.

### Base Class

The recommended way to implement a TypeScript mockdata contributor is to extend the `MockDataContributorClass<T>` provided by `@sap-ux/ui5-middleware-fe-mockserver`.

```typescript
import type { Action, ODataRequest } from '@sap-ux/ui5-middleware-fe-mockserver';
import { MockDataContributorClass } from '@sap-ux/ui5-middleware-fe-mockserver';

export type MyEntityType = {
    ID: number;
    name: string;
};

export default class MyEntity extends MockDataContributorClass<MyEntityType> {
    async executeAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object | undefined> {
        // Your custom logic here
        return {};
    }
}
```

### Accessing the Base Interface

When extending `MockDataContributorClass`, you have access to `this.base`, which provides methods to interact with the standard mockserver behavior, such as `this.base.getEmptyObject()`, `this.base.fetchEntries()`, or `this.base.getEntityInterface()`.

## Unbound Actions in TypeScript

Similarly, you can define unbound actions in TypeScript by creating an `EntityContainer.ts` file that extends `MockEntityContainerContributorClass`.

```typescript
import { MockEntityContainerContributorClass } from '@sap-ux/ui5-middleware-fe-mockserver';
import type { Action, ODataRequest } from '@sap-ux/ui5-middleware-fe-mockserver';

export default class MyEntityContainer extends MockEntityContainerContributorClass {
    async executeAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object | undefined> {
        // Logic for unbound actions
        return {};
    }
}
```

## Configuration

To use TypeScript files, you need to ensure that your project is set up to compile them or that your runtime environment can handle TypeScript (e.g., using `ts-node`).

In a typical UI5 project using `ui5-middleware-fe-mockserver`, the middleware will handle the loading of these files.

## Example Project

A complete example of using TypeScript with the mockserver can be found in the [samples/function-import-ts](../../samples/function-import-ts) directory.
