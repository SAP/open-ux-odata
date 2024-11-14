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
            case 'bound412Action':
                if (odataRequest.requestContent.headers.prefer) {
                    if (keys['ID'] == '1' || keys['ID'] == '2') {
                        odataRequest.addResponseHeader('Preference-Applied', 'handling=strict');
                        this.throwError('Unable to execute the action due to a warning.', 412, {
                            error: {
                                code: 412,
                                message: 'Unable to execute the action due to a warning.',
                                details: [{ code: 'null', message: 'Unable to execute the action due to a warning.' }],
                                '@Common.numericSeverity': 4
                            }
                        });
                    } else if (keys['ID'] == '3' || keys['ID'] == '4') {
                        this.throwError('unbound transition error', 500, {
                            error: {
                                code: 500,
                                message: 'unbound transition error',
                                transition: true,
                                '@Common.numericSeverity': 4
                            }
                        });
                    } else {
                        this.throwError(
                            '412 executed',
                            000,
                            [{ code: '412', message: '412 executed', numericSeverity: 1 }],
                            true
                        );
                    }
                } else {
                    this.throwError(
                        '412 executed',
                        000,
                        [{ code: '412', message: '412 executed', numericSeverity: 1 }],
                        true
                    );
                }
                break;
            case 'bound503Action':
                this.throwError(
                    'Server not available',
                    503,
                    {},
                    false,
                    { 'Retry-After': 'some date' },
                    actionData.globalError
                );
                break;
            case 'boundActionChangeSet':
                if (keys['ID'] == '3') {
                    this.throwError('Bound transition error', 500, {
                        error: {
                            code: 500,
                            message: 'Bound transition error',
                            transition: true,
                            '@Common.numericSeverity': 4,
                            target: 'self',
                            details: [
                                {
                                    code: '500',
                                    message: `Unable to execute the action due to a error. ID: ${keys['ID']}`,
                                    '@Common.numericSeverity': 4,
                                    transition: true,
                                    target: 'self/Prop1'
                                }
                            ]
                        }
                    });
                } else {
                    this.throwError(
                        'Bound action executed',
                        200,
                        [{ code: '200', message: 'Bound action executed', numericSeverity: 1 }],
                        true
                    );
                }
                break;

            default:
                this.throwError('Not implemented', 501, {
                    error: {
                        message: `FunctionImport or Action "${actionDefinition.name}" not mocked`
                    }
                });
        }
    }
};
