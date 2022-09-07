# Defining mockdata


## Influencing entity set behavior

The mockserver allows you to define your mock data as javascript file and function that allow you to influence the behavior of the standard function to match your needs.

In order to define your mockdata, you need to create a file with the name of the entity set you want to mock and the extension `.js` in the folder identified by your `mockdataPath`.

You can then implement some functions defined in the [API](./MockserverAPI.md) to add your custom logic.

## Defining unbound actions

Unbound actions are by definition specific to your application so the mockserver can't do much to help you there beside allowing you to implement whatever logic you need.

In order to define your own unbound actions you can create an `EntityContainer.js` file that will implement the function defined in the [API](./EntityContainerAPI.md).

By doing this you can add your custom logic for your unbound actions and mock what you need.