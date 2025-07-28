# Mockserver contributor API

While the mockserver provides out of the box support for most of the OData operation you are looking for, it is possible that you have certain scenario where you'd like to have a more granular control over what happens.

To that end, the mockdata API used internally is fully extensible and you can implement your own custom behavior for each entity set that may require it.

The starting point is that you can provide a javascript (or Typescript) file with the same name as your EntitySet or Singleton that will implement various feature.

This also goes hand to hand with providing the mockdata as JSON files, so for one entity file you can have one JSON file providing the initial dataset and one JS file providing the custom logic you want to define.

## Available functions

### getInitialDataSet

This method allow to provide the initial dataset for the entity set dynamically
You just have to return an array of objects that will be used as the initial dataset.

- `getInitialDataSet?: (contextId: string) => object[];`
  - `contextId` represents the tenant id for the current request

### executeAction

Provide a hook to handle the action calls, it's called whenever an action / function is executed.
It contains the action definition from the metadata alongside the current set of data from the action and the key of the object it's applying to

- `executeAction(actionDefinition: Action, actionData: any, keys: Record<string, any>, odataRequest: ODataRequest): object;`

If the action is a bound action or an unbound one with a clear binding parameter, the method will be called in the `<yourEntitySetName>.js` file, if it is an unbound action or function it will be called on `EntityContainer.js`

All the actions go through the same initial call and it's up to you to determine how you want to respond to each of them.

Following is an example implementation just returning different response based on the action that is called in the end.

```
 executeAction: function (actionDefinition, actionData, keys, odataRequest) {
    switch (actionDefinition.name) {
        case 'boundActionReturnsVoid':
            return undefined;
        case 'baseFunction':
            if (odataRequest.isStrictMode) {
                return `STRICT :: ${actionData.data}`;
            }
            return actionData.data;
        default:
            this.throwError('Not implemented', 501, {
                error: {
                    message: `FunctionImport or Action "${actionDefinition.name}" not mocked`
                }
            });
    }
}
```

### onBeforeAction / onAfterAction

Provides hook before and after an action is executed, this is mostly used to provide additional handling on top of the standard draft workflow.

- `onBeforeAction(actionDefinition: Action, actionData: any, keys: Record<string, any>): object;`
- `onAfterAction(actionDefinition: Action, actionData: any, keys: Record<string, any>, responseData: any): any;`

In most case you will end up implementing the action directly in the `executeAction` hook, but there are also a few prebuilt actions around Draft handling where you might want to interrupt or tweak the data coming in. Those hooks are there for that purpose

```
async onAfterAction(actionDefinition, actionData, keys, responseData, odataRequest) {
  if (actionDefinition.name === "draftPrepare") {
    responseData["SAP_Message"] = [
      {
        code: "xxxx",
        longtextUrl: "",
        message: "PrepareAction on RootEntity has been triggered",
        numericSeverity: 2,
        target: "/RootEntity(ID=1,IsActiveEntity=false)/TitleProperty",
        transition: true
      }
    ];
  }
  return responseData;
}
```

### onAfterRead

Provides hooks after an entity is read, this is mostly used to provide additional handling on top of the standard mechanism in order to modify the returned data.

- `onAfterRead(data: object[], odataRequest:ODataRequest): Promise<object[]>;`

### onBeforeUpdateEntry / onAfterUpdateEntry

Provides hook before and after an entry is updated, this is mostly used to provide additional handling on top of the standard mechanism.

- `onBeforeUpdateEntry(keyValues: KeyDefinitions, updatedData: object): void;`
- `onAfterUpdateEntry(keyValues: KeyDefinitions, updatedData: object): void;`

### throwError

This method allows to throw an error, it's useful to provide a custom error message.

- `throwError(message: string, statusCode?: number, messageData?: object, isSAPMessage?: boolean, headers?: Record<string, string>): void;`
    - `message` contains the message you're sending
    - `statusCode` contains the status code you want to see on the request
    - `messageData` contains the data you want to send along with the message
    - `isSAPMessage` if set to true, the message will be sent as a SAP message
    - `headers` contains the headers you want to send along with the message

### getReferentialConstraints

This method allows you to specify, for a given navigation property, the referential constraints that should be applied when fetching the related entities.
- `getReferentialConstraints(navigationProperty: NavigationProperty): { sourceProperty: string, targetProperty: string}[];`
  - `navigationProperty` contains the navigation property definition
  - For the response
    - `sourceProperty` should contains the property name on the source entity
    - `targetProperty` shouldcontains the property name on the target entity

This is useful in case your backend metadata don't include detail on how navigation property needs to be resolved.

```
getReferentialConstraints(navigationDetail) {
        if (navigationDetail.name === '_toComposition') {
            return [
                {
                    sourceProperty: '_toComposition_ID',
                    targetProperty: 'othervalue'
                }
            ];
        }
    }
```

### base API

On top of providing ways to override default behavior, you also have access to a `base` API that comprises of the basic functionality offered by the mockdata API.

This base API is accessible by calling `this.base.xxx` in any of the mockserver JS file, this object will allow you to manipulate the current or other entities 

#### generateMockData

Generate mock data entries for the entity set.

`generateMockData: () => void;`

#### generateKey

Generate a key value for a specific property, useful when creating new entries.

`generateKey: (property: Property, lineIndex?: number, mockData?: any) => any;`

- `property` - The property definition from the entity type
- `lineIndex` - Optional line index for generating unique values
- `mockData` - Optional existing mock data context

#### addEntry

Add a new entry to the data set.

`addEntry: (mockEntry: object, odataRequest: ODataRequest) => void;`

#### updateEntry

Update an existing entry, identified by it's keyValues into the data set.

`updateEntry: (keyValues: KeyDefinitions, newData: object, odataRequest: ODataRequest) => void;`

#### removeEntry

Remove an entry from the data set

`removeEntry: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => void;`

#### fetchEntries

Retrieve specific entries from the data set by their key values.

`fetchEntries: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => Promise<object[]>;`

- `keyValues` - The key values to identify the entries to fetch
- Returns array of matching entries

#### hasEntry

Check if an entry with the specified key values exists in the data set.

`hasEntry: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => boolean;`

#### hasEntries

Check if the entity set has any entries.

`hasEntries: (odataRequest: ODataRequest) => boolean;`

#### getAllEntries

Retrieve all entries from the data set.

`getAllEntries: (odataRequest: ODataRequest) => Promise<object[]>;`

#### getEmptyObject

Get an empty object template for the entity type with all properties initialized to default values.

`getEmptyObject: (odataRequest: ODataRequest) => object;`

#### getDefaultElement

Get a default element with generated values for the entity type.

`getDefaultElement: (odataRequest: ODataRequest) => object;`

#### getParentEntityInterface

Retrieve the mockdata entity interface for the parent entity set (useful for draft scenarios).

`getParentEntityInterface: () => Promise<FileBasedMockData | undefined>;`

#### getEntityInterface

Retrieve the mockdata entity interface for a given entity set within the current service, or optionally from another service for cross-service communication.

`getEntityInterface: (entityName: string, serviceNameOrAlias?: string) => Promise<FileBasedMockData | undefined>;`

- `entityName` - The name of the entity set
- `serviceNameOrAlias` - Optional alias or URL path of the target service for cross-service communication

The entity interface allows you to access the standard functions (`addEntry`, `fetchEntries`, `updateEntry`, etc.) to manipulate the mockdata of the application.

When using the optional second parameter for cross-service access, the returned entity interface includes enhanced behavior:
- `updateEntry` automatically preserves existing fields (same smart behavior as `this.base.updateEntry`)
- All standard mockdata operations are available
- Service aliases can be used for cleaner, more maintainable code

See [Cross-Service Communication](./CrossServiceCommunication.md) for detailed usage examples and best practices.

#### checkSearchQuery

Check if a mock data entry matches the given search query.

`checkSearchQuery: (mockData: any, searchQuery: string, odataRequest: ODataRequest) => boolean;`

- `mockData` - The mock data entry to check
- `searchQuery` - The search string to match against
- Returns true if the entry matches the search criteria

#### checkFilterValue

Check if a mock data value matches a filter expression.

`checkFilterValue: (comparisonType: string, mockValue: any, literal: any, operator: string, odataRequest: ODataRequest) => boolean;`

- `comparisonType` - The type of comparison to perform
- `mockValue` - The value from the mock data
- `literal` - The literal value to compare against
- `operator` - The comparison operator
- Returns true if the comparison matches

#### example

```
// This is an updateEntry for one entity, it will replace the default implementation and based on the current tenant (a.k.a sap-client) will react differently
 async updateEntry(keyValues, newData, patchData, odataRequest) {
    if (odataRequest.tenantId === 'tenant-003') {
        // For tenant-003 the value will get enhanced before calling the original method through this.base.updateEntry
        newData.Value += 'For Special Tenant';
        return this.base.updateEntry(keyValues, newData);
    } else if (odataRequest.tenantId === 'tenant-004') {
        // For tenant-004 on top of updating the value we will also add an extra one using this.base.addEntry
        this.base.addEntry({ Name: 'Fourth Name Value', Value: 'Fourth Value' });
        return this.base.updateEntry(keyValues, newData);
    } else if (odataRequest.tenantId === 'tenant-005') {
        // For tenant-005 we will do the basic update operation but also include a message on the response 
        odataRequest.addMessage(8008, 'Warning Message', 3, '/');
        return this.base.updateEntry(keyValues, newData);
    } else if (odataRequest.tenantId === 'tenant-006') {
        // For tenant-006 we will retrive the EntityInterface for a different entity and add a new entry there using addEntry
        const mySecondEntityInterface = await this.base.getEntityInterface('MySecondEntity');
        mySecondEntityInterface.addEntry({ Name: 'MySecondEntityName' });
        return this.base.updateEntry(keyValues, newData);
    } else if (odataRequest.tenantId === 'tenant-007') {
        // For tenant-007 we will update an entity in a different service using cross-service communication
        const otherServiceEntity = await this.base.getEntityInterface('RelatedEntity', '/other/service');
        if (otherServiceEntity) {
            // Cross-service updateEntry works just like this.base.updateEntry - automatic data merging
            await otherServiceEntity.updateEntry(keyValues, { status: 'updated_from_main_service' });
        }
        return this.base.updateEntry(keyValues, newData);
    } else {
        return this.base.updateEntry(keyValues, newData);
    }
}
```
