# EntityContainer contributor API

When defining your own unbound actions, you can provide a javascript (or Typescript) file with the name `EntityContainer` that will implement various actions.

The available function are more limited but cover the most common use cases.

## Available functions

### executeAction

Provide a hook to handle the action calls, it's called whenever an action is executed.
It contains the action definition from the metadata alongside the current set of data from the action and the key of the object it's applying to

- `executeAction(actionDefinition: Action, actionData: any, keys: Record<string, any>): object;`


### throwError

This method allows to throw an error, it's useful to provide a custom error message.

- `throwError(message: string, statusCode?: number, messageData?: object, isSAPMessage?: boolean, headers?: Record<string, string>): void;`
    - `message` contains the message you're sending
    - `statusCode` contains the status code you want to see on the request
    - `messageData` contains the data you want to send along with the message
    - `isSAPMessage` if set to true, the message will be sent as a SAP message
    - `headers` contains the headers you want to send along with the message

### base API

On top of providing ways to override default behavior, you also have access to a `base` API that comprises of the basic functionality offered by the mockdata API.

#### getEntityInterface

Retrieve the mockdata entity interface for a given entity set.

`getEntityInterface: (entityName: string) => Promise<FileBasedMockData | undefined>;`

The entity interface allow you then to access the standard function (`addEntry`, `fetchEntries`, ...) to manipulate the mockdata of the application.