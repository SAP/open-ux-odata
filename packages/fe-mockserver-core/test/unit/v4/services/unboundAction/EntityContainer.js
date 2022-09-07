module.exports = {
    executeAction: async function (actionDefinition, actionData, keys, odataRequest) {
        switch (actionDefinition.name) {
            case 'unboundAction': {
                return 'This is my action response';
            }
            case 'unboundActionThatFetchData': {
                const entitySet = await this.base.getEntityInterface('RootEntity');
                return entitySet.fetchEntries({ ID: 2 });
            }
            case 'unboundActionThatFetchDataOnUnknownEntity': {
                const entitySet = await this.base.getEntityInterface('UnkownEntity');
                if (entitySet) {
                    return entitySet.fetchEntries({ ID: 2 });
                } else {
                    this.throwError('Unsupported EntitySet', 501, {
                        error: {
                            message: `Trying to reach unknown entityset`
                        }
                    });
                }
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
