module.exports = {
    executeAction: function (actionDefinition, actionData, keys, odataRequest) {
        switch (actionDefinition.name) {
            case 'unboundAction': {
                return 'This is my action response';
            }
            default: {
                this.throwError('Unsupported Action', 501, {
                    error: {
                        message: `FunctionImport or Action "${actionDefinition.name}" not mocked`
                    }
                });
            }
        }
    }
};
