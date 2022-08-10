const ODataRequest = require('../../../../src/request/odataRequest');
module.exports = {
    getAllEntries(odataRequest) {
        const allEntries = this.base.getAllEntries(); // Retrieve them from the base
        if (odataRequest.tenantId === 'tenant-001') {
            return [allEntries[0]];
        } else if (odataRequest.tenantId === 'tenant-002') {
            this.throwError('This tenant is not allowed for you');
        } else if (odataRequest.tenantId === 'tenant-003') {
            this.throwError('Error', 400, {
                error: {
                    code: 400,
                    message: "Field 'Field1' is required.",
                    target: 'in/field1'
                }
            });
        }
        return allEntries;
    },
    async updateEntry(keyValues, newData, patchData, odataRequest) {
        if (odataRequest.tenantId === 'tenant-003') {
            newData.Value += 'For Special Tenant';
            return this.base.updateEntry(keyValues, newData);
        } else if (odataRequest.tenantId === 'tenant-004') {
            this.base.addEntry({ Name: 'Fourth Name Value', Value: 'Fourth Value' });
            return this.base.updateEntry(keyValues, newData);
        } else if (odataRequest.tenantId === 'tenant-005') {
            odataRequest.addMessage(8008, 'Warning Message', 3, '/');
            return this.base.updateEntry(keyValues, newData);
        } else if (odataRequest.tenantId === 'tenant-006') {
            const mySecondEntityInterface = await this.base.getEntityInterface('MySecondEntity');
            mySecondEntityInterface.addEntry({ Name: 'MySecondEntityName' });
            return this.base.updateEntry(keyValues, newData);
        } else {
            return this.base.updateEntry(keyValues, newData);
        }
    },
    checkFilterValue(comparisonType, mockValue, literal, operator, _odataRequest) {
        if (_odataRequest.tenantId === 'tenant-007') {
            return true;
        } else {
            return this.base.checkFilterValue(comparisonType, mockValue, literal, operator);
        }
    }
};
