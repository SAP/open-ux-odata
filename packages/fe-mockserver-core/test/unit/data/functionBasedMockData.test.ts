import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import type { EntitySetInterface } from '../../../src/data/common';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import { ServiceRegistry } from '../../../src/data/serviceRegistry';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';
describe('Function Based Mock Data', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'mockdata');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    let dataAccess2: DataAccess;
    let myEntitySet: EntitySetInterface;
    let myOtherEntitySet: EntitySetInterface;
    let myOtherServiceEntitySet: EntitySetInterface;
    const serviceRegistry: ServiceRegistry = new ServiceRegistry();
    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        dataAccess2 = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        serviceRegistry.registerService('/firstService', dataAccess, 'service1');
        serviceRegistry.registerService('/secondService', dataAccess2, 'service2');
        myEntitySet = await dataAccess.getMockEntitySet('MyRootEntity');
        myOtherEntitySet = await dataAccess.getMockEntitySet('MySecondEntity');
        myOtherServiceEntitySet = await dataAccess2.getMockEntitySet('MySecondEntity');
    });
    it('can GET All Entries', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/MyRootEntity'
            },
            dataAccess
        );
        let mockData = (await myEntitySet.getMockData('default').getAllEntries(fakeRequest)) as any;
        expect(mockData.length).toBe(3);
        expect(mockData[0].complexComputedProperty).toBeDefined();
        expect(mockData[0].complexProperty).toBeDefined();
        expect(mockData[0].complexComputedNotNullProperty).toBeDefined();
        expect(mockData[0].complexNotNullProperty).toBeDefined();
        // Fake that in tenant 001 we only return one data
        fakeRequest.tenantId = 'tenant-001';
        mockData = (await myEntitySet.getMockData('tenant-001').getAllEntries(fakeRequest)) as any;
        expect(mockData.length).toBe(1);
        // Fake that in tenant 002 we throw an error
        fakeRequest.tenantId = 'tenant-002';
        expect(() => {
            return myEntitySet.getMockData('tenant-002').getAllEntries(fakeRequest) as any;
        }).rejects.toThrow('This tenant is not allowed for you');
        await fakeRequest.handleRequest();
        let responseData = fakeRequest.getResponseData();
        expect(responseData).toMatchSnapshot();
        expect(fakeRequest.responseHeaders).toMatchSnapshot();

        // Fake that in tenant 003 we throw an error
        const fakeRequest2 = new ODataRequest(
            {
                method: 'GET',
                url: '/MyRootEntity'
            },
            dataAccess
        );
        fakeRequest2.tenantId = 'tenant-002b';
        await fakeRequest2.handleRequest();
        responseData = fakeRequest2.getResponseData();
        expect(responseData).toMatchSnapshot();
        expect(fakeRequest2.responseHeaders).toMatchSnapshot();
    });
    it('will not leak from one tenant to the other', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'MyRootEntity'
            },
            dataAccess
        );
        const mockData = myEntitySet.getMockData('default');
        let allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await mockData.addEntry(
            {
                ID: 4,
                Name: 'My Name4',
                Value: 'My Value4'
            },
            fakeRequest
        );
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(4);
        const mockData2 = myEntitySet.getMockData('notdefault');
        const allData2 = (await mockData2.getAllEntries(fakeRequest)) as any;
        expect(allData2.length).toBe(3);
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(4);
        await mockData.removeEntry({ ID: 4 }, fakeRequest);
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
    });
    it('can Update Entries', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'MyRootEntity'
            },
            dataAccess
        );
        let mockData = myEntitySet.getMockData('default');
        let allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        expect(allData[0].Name).toBe('My Updated Name');

        // Fake that in tenant 003 we change the value
        fakeRequest.tenantId = 'tenant-003';
        mockData = myEntitySet.getMockData('tenant-003');
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        expect(allData[0].Name).toBe('My Updated Name');
        expect(allData[0].Value).toBe('My ValueFor Special Tenant');
        // Fake that in tenant 004 we add an extra value
        fakeRequest.tenantId = 'tenant-004';
        mockData = myEntitySet.getMockData('tenant-004');
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(4);
        expect(allData[0].Name).toBe('My Updated Name');
        expect(allData[0].Value).toBe('My Value');
        expect(allData[3].ID).toBe(4);
        expect(allData[3].Name).toBe('Fourth Name Value');
        expect(allData[3].Value).toBe('Fourth Value');

        // Fake that in tenant 005 we add a sap message to the output
        fakeRequest.tenantId = 'tenant-005';
        mockData = myEntitySet.getMockData('tenant-005');
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        fakeRequest.getResponseData();
        expect(JSON.parse(fakeRequest.responseHeaders['sap-messages'])).toStrictEqual([
            { code: 8008, message: 'Warning Message', numericSeverity: 3, target: '/' }
        ]);
        // Fake that in tenant 006 we can also update another entity
        fakeRequest.tenantId = 'tenant-006';
        mockData = myEntitySet.getMockData('tenant-006');
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        const secondMock = myOtherEntitySet.getMockData('tenant-006') as any;
        let allSecondData = (await secondMock.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        expect(allSecondData.length).toBe(1);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        fakeRequest.getResponseData();
        allSecondData = (await secondMock.getAllEntries(fakeRequest)) as any;
        expect(allSecondData.length).toBe(2);
        expect(allSecondData[1]).toStrictEqual({ Name: 'MySecondEntityName' });

        // Fake that in tenant 007 we can also update another entity in another service
        fakeRequest.tenantId = 'tenant-007';
        mockData = myEntitySet.getMockData('tenant-007');
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        const secondServiceMock = myOtherServiceEntitySet.getMockData('tenant-007') as any;
        let allSecondServiceData = (await secondServiceMock.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        expect(allSecondServiceData.length).toBe(1);
        await mockData.updateEntry(
            { ID: 1 },
            {
                ID: 1,
                Name: 'My Updated Name',
                Value: 'My Value'
            },
            {
                Name: 'My Updated Name'
            },
            fakeRequest
        );
        fakeRequest.getResponseData();
        allSecondServiceData = (await secondMock.getAllEntries(fakeRequest)) as any;
        expect(allSecondServiceData.length).toBe(2);
        expect(allSecondServiceData[1]).toStrictEqual({ Name: 'MySecondEntityName' });
    });

    it('can get entries based on filters', async () => {
        // Fake that in tenant 007 we can influence filtering
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'MyRootEntity'
            },
            dataAccess
        );
        fakeRequest.tenantId = 'tenant-006';
        const mockData = myEntitySet.getMockData('tenant-006');
        const allData = await mockData.getAllEntries(fakeRequest);
        let filterResult = mockData.checkFilterValue('Edm.String', allData[0]?.Name, 'Name', 'eq', fakeRequest);
        expect(filterResult).toBe(false);
        fakeRequest.tenantId = 'tenant-007';
        filterResult = mockData.checkFilterValue('Edm.String', allData[0]?.Name, 'Name', 'eq', fakeRequest);
        expect(filterResult).toBe(true);
    });
    it('can Delete Entries', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'DELETE',
                url: '/MyRootEntity(ID=1)'
            },
            dataAccess
        );
        fakeRequest.tenantId = 'tenant-008';
        const mockData = myEntitySet.getMockData('tenant-008');
        let allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(3);
        await fakeRequest.handleRequest();
        const responseData = fakeRequest.getResponseData();
        allData = (await mockData.getAllEntries(fakeRequest)) as any;
        expect(allData.length).toBe(2);
        expect(responseData).toMatchSnapshot();
    });
});
