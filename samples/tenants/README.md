# Error Handling Sample

In this sample we just load a simple metadata file that the mockserver will leverage alongside with static mock data defined in json files

The mock data file must be named with the same name as the EntitySet you're mocking.



- [metadata file](./webapp/localService/metadata.xml)
- [RootEntity file](./webapp/localService/mockdata/RootEntity.js)

The RootEntity file implements the executeAction method now, meaning that it will be called when you define a custom action.
It also throw an error for a specific object with key ID === 1

## Used / Implemented API function

- [getInitialDataset](../../docs/MockserverAPI.md#getInitialDataset)
- [executeAction](../../docs/MockserverAPI.md#executeAction)
- [throwError](../../docs/MockserverAPI.md#throwError)