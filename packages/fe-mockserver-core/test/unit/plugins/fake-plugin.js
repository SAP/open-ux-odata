const path = require('path');

module.exports = {
    services: [
        {
            metadataPath: path.join(__dirname, '..', '__testData', 'service.cds'),
            mockdataPath: path.join(__dirname, '..', '__testData'),
            urlPath: '/sap/fe/core/mock/plugin',
            watch: true,
            validateETag: true
        }
    ]
};
