import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';
import type { EntitySetInterface } from '../../../src/data/common';

let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';
describe('Function Based Mock Data', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'mockdata');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    let myEntitySet: EntitySetInterface;
    let myOtherEntitySet: EntitySetInterface;
    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        myEntitySet = await dataAccess.getMockEntitySet('MyRootEntity');
        myOtherEntitySet = await dataAccess.getMockEntitySet('MySecondEntity');
    });
    it('can GET All Entries', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/MyRootEntity'
            },
            dataAccess
        );
        let mockData = myEntitySet.getMockData('default').getAllEntries(fakeRequest) as any;
        expect(mockData.length).toBe(3);
        // Fake that in tenant 001 we only return one data
        fakeRequest.tenantId = 'tenant-001';
        mockData = myEntitySet.getMockData('tenant-001').getAllEntries(fakeRequest) as any;
        expect(mockData.length).toBe(1);
        // Fake that in tenant 002 we throw an error
        fakeRequest.tenantId = 'tenant-002';
        expect(() => {
            mockData = myEntitySet.getMockData('tenant-002').getAllEntries(fakeRequest) as any;
        }).toThrow('This tenant is not allowed for you');
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
    it('can Update Entries', async () => {
        const fakeRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'MyRootEntity'
            },
            dataAccess
        );
        let mockData = myEntitySet.getMockData('default');
        let allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        mockData.updateEntry(
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
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        expect(allData[0].Name).toBe('My Updated Name');

        // Fake that in tenant 003 we change the value
        fakeRequest.tenantId = 'tenant-003';
        mockData = myEntitySet.getMockData('tenant-003');
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        const updatedData = mockData.updateEntry(
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
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        expect(allData[0].Name).toBe('My Updated Name');
        expect(allData[0].Value).toBe('My ValueFor Special Tenant');
        // Fake that in tenant 004 we add an extra value
        fakeRequest.tenantId = 'tenant-004';
        mockData = myEntitySet.getMockData('tenant-004');
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        mockData.updateEntry(
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
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(4);
        expect(allData[0].Name).toBe('My Updated Name');
        expect(allData[0].Value).toBe('My Value');
        expect(allData[3].ID).toBe(4);
        expect(allData[3].Name).toBe('Fourth Name Value');
        expect(allData[3].Value).toBe('Fourth Value');

        // Fake that in tenant 005 we add a sap message to the output
        fakeRequest.tenantId = 'tenant-005';
        mockData = myEntitySet.getMockData('tenant-005');
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        mockData.updateEntry(
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
        allData = mockData.getAllEntries(fakeRequest) as any;
        const secondMock = myOtherEntitySet.getMockData('tenant-006') as any;
        let allSecondData = secondMock.getAllEntries(fakeRequest) as any;
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
        allSecondData = secondMock.getAllEntries(fakeRequest) as any;
        expect(allSecondData.length).toBe(2);
        expect(allSecondData[1]).toStrictEqual({ Name: 'MySecondEntityName' });
    });

    it('can get entries based on filters', () => {
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
        const allData = mockData.getAllEntries(fakeRequest);
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
        let allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(3);
        await fakeRequest.handleRequest();
        const responseData = fakeRequest.getResponseData();
        allData = mockData.getAllEntries(fakeRequest) as any;
        expect(allData.length).toBe(2);
        expect(responseData).toMatchSnapshot();
    });
});
