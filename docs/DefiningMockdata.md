# Defining mockdata


## Influencing entity set behavior

By default the mockserver will load JSON files for your entity set and return them as is. If you use context based isolation the mockserver will also try to load a specific file for the tenant you are working on.
However if you want to influence the behavior of the mockserver you can do so by defining your own mockdata file

The mockserver allows you to define your mock data as javascript file and function that allow you to influence the behavior of the standard function to match your needs.

In order to define your mockdata, you need to create a file with the name of the entity set you want to mock and the extension `.js` in the folder identified by your `mockdataPath`.

You can then implement some functions defined in the [API](./MockserverAPI.md) to add your custom logic.

## Cross-Service Communication

Starting with the latest version, the mockserver supports cross-service communication, allowing your entity sets to interact with and modify data in other services. This is particularly useful for testing complex business scenarios that involve multiple OData services.

You can access entities from other services using the `base.getOtherServiceEntityInterface()` method. For detailed examples and best practices, see [Cross-Service Communication](./CrossServiceCommunication.md).

## Defining unbound actions

Unbound actions are by definition specific to your application so the mockserver can't do much to help you there beside allowing you to implement whatever logic you need.

In order to define your own unbound actions you can create an `EntityContainer.js` file that will implement the function defined in the [API](./EntityContainerAPI.md).

By doing this you can add your custom logic for your unbound actions and mock what you need.

When using v2 service if you declare a `FunctionImport` defining an `EntitySet` then the method needs to be implemented as an `executeAction` on the propert entitySet file as they are treated like bound actions / functions.
