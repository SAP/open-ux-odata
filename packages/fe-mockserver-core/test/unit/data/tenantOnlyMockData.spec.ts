import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import Router from 'router';
import type { ServiceConfig } from '../../../src';
import type { EntitySetInterface } from '../../../src/data/common';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import { ServiceRegistry } from '../../../src/data/serviceRegistry';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';

describe('Tenant-Only Mock Data', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'mockdata');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    let tenantOnlyEntitySet: EntitySetInterface;

    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        const app = new Router();
        const serviceRegistry = new ServiceRegistry(fileLoader, metadataProvider, app);
        dataAccess = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        tenantOnlyEntitySet = await dataAccess.getMockEntitySet('TenantOnlyEntity');
    });

    it('can load tenant-specific data when no base file exists', async () => {
        // Test tenant-100 (has TenantOnlyEntity-100.json)
        const request100 = new ODataRequest(
            {
                method: 'GET',
                url: '/TenantOnlyEntity',
                tenantId: 'tenant-100'
            },
            dataAccess
        );

        const mockData100 = (await tenantOnlyEntitySet.getMockData('tenant-100').getAllEntries(request100)) as any[];
        expect(mockData100).toHaveLength(2);
        expect(mockData100[0].name).toBe('Tenant 100 Entity 1');
        expect(mockData100[1].name).toBe('Tenant 100 Entity 2');
    });

    it('can load different tenant-specific data', async () => {
        // Test tenant-200 (has TenantOnlyEntity-200.json)
        const request200 = new ODataRequest(
            {
                method: 'GET',
                url: '/TenantOnlyEntity',
                tenantId: 'tenant-200'
            },
            dataAccess
        );

        const mockData200 = (await tenantOnlyEntitySet.getMockData('tenant-200').getAllEntries(request200)) as any[];
        expect(mockData200).toHaveLength(1);
        expect(mockData200[0].name).toBe('Tenant 200 Entity 3');
    });

    it('returns empty array for tenant without specific file', async () => {
        // Test tenant-999 (no TenantOnlyEntity-999.json file exists)
        const request999 = new ODataRequest(
            {
                method: 'GET',
                url: '/TenantOnlyEntity',
                tenantId: 'tenant-999'
            },
            dataAccess
        );

        const mockData999 = (await tenantOnlyEntitySet.getMockData('tenant-999').getAllEntries(request999)) as any[];
        expect(mockData999).toHaveLength(0);
    });

    it('returns empty array for default tenant when no base file exists', async () => {
        // Test default tenant (no TenantOnlyEntity.json base file exists)
        const requestDefault = new ODataRequest(
            {
                method: 'GET',
                url: '/TenantOnlyEntity',
                tenantId: 'tenant-default'
            },
            dataAccess
        );

        const mockDataDefault = (await tenantOnlyEntitySet
            .getMockData('tenant-default')
            .getAllEntries(requestDefault)) as any[];
        expect(mockDataDefault).toHaveLength(0);
    });
});
