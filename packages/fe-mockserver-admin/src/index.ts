import type { IMockserverPlugin } from '@sap-ux/fe-mockserver-core';
import * as path from 'node:path';

const mockServerAdminConfig: IMockserverPlugin = {
    name: 'mockserver-admin',
    services: [
        {
            alias: 'AdminService',
            urlPath: '/admin',
            metadataPath: path.join(__dirname, 'metadata.xml'),
            mockdataPath: path.join(__dirname, 'mockdata'),
            generateMockData: false
        }
    ]
};

export = mockServerAdminConfig;
