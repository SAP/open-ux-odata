module.exports = {
    getInitialDataSet(tenantId) {
        if (tenantId === 'tenant-003') {
            return require('./tenant-003/RootElement.json');
        }
        return require('./RootElement.json');
    }
};
