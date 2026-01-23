# Custom Actions Sample

In this sample we just load a simple metadata file that the mockserver will leverage alongside with static mock data defined in json files

The mock data file must be named with the same name as the EntitySet you're mocking.


- [metadata file](./webapp/localService/metadata.xml)
- [EntityContainer file](./webapp/localService/data/EntityContainer.js)
- [SalesOrders file](./webapp/localService/data/SalesOrders.js)

The SalesOrders and EntityContainer files implement the executeAction method now, meaning that it will be called when you define a bound or unbound custom action.

## Used / Implemented API function

- [getInitialDataset](../../docs/MockserverAPI.md#getInitialDataset)
- [executeAction](../../docs/MockserverAPI.md#executeAction)
