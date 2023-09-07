const fs = require('fs');
const path = require('path');
module.exports = {
    getInitialDataSet(tenantId) {
        if (tenantId === 'tenant-003') {
            return require('./tenant-003/RootElement.json');
        }
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'RootElement.json')).toString('utf-8'));
    },

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
};
