const fs = require('fs');
const path = require('path');
module.exports = {
    getInitialDataSet(tenantId) {
        if (tenantId === 'tenant-003') {
            return require('./tenant-003/RootElement.json');
        }
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'RootElement.json')).toString('utf-8'));
    }
};
