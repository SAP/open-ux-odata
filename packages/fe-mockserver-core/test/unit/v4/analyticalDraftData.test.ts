import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import { ODataRequest, type ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';

jest.setTimeout(3600000);

describe('Analytical Access', () => {
    let dataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    const baseUrl = '/AnalyticalData';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'analyticalDraft');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        const serviceRegistry = {
            getService: jest.fn(),
            registerService: jest.fn(),
            getServicesWithAliases: jest.fn()
        } as any;
        dataAccess = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
    });

    beforeEach(async () => {
        // Create the draft instance
        await dataAccess.performAction(
            new ODataRequest(
                {
                    method: 'POST',
                    url: '/Products(ID=1,IsActiveEntity=true)/v4analyticaldraft.draftEdit?$select=ID,IsActiveEntity'
                },
                dataAccess
            )
        );
    });

    afterEach(async () => {
        // Delete the draft instance
        await dataAccess.deleteData(
            new ODataRequest(
                {
                    method: 'DELETE',
                    url: '/Products(ID=1,IsActiveEntity=false)'
                },
                dataAccess
            )
        );
    });

    test('1- Request data on draft instance', async () => {
        // Request the analytical data on Sales
        const odataGetRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Products(ID=1,IsActiveEntity=false)/_Sales?$apply=concat(groupby((Country,CurrencyCode,HasActiveEntity,ID,IsActiveEntity))/aggregate($count%20as%20UI5__leaves),aggregate(Amount,CurrencyCode),groupby((Country),aggregate(Amount,CurrencyCode))/concat(aggregate($count%20as%20UI5__count),top(109)))'
            },
            dataAccess
        );

        const data = await dataAccess.getData(odataGetRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "UI5__leaves": 10,
              },
              {
                "Amount": 1235000,
                "CurrencyCode": null,
              },
              {
                "UI5__count": 4,
              },
              {
                "Amount": 425000,
                "Country": "USA",
                "CurrencyCode": "USD",
              },
              {
                "Amount": 375000,
                "Country": "France",
                "CurrencyCode": "EUR",
              },
              {
                "Amount": 220000,
                "Country": "Germany",
                "CurrencyCode": "EUR",
              },
              {
                "Amount": 215000,
                "Country": "UK",
                "CurrencyCode": "GBP",
              },
            ]
        `);
    });

    test('2- Update and request data on draft instance', async () => {
        // Update some data
        await dataAccess.updateData(
            new ODataRequest({ method: 'PATCH', url: '/Sales(ID=9,IsActiveEntity=false)' }, dataAccess),
            { Amount: '140000', CurrencyCode: 'USD' }
        );

        // Check new values for aggregations
        const odataGetRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Products(ID=1,IsActiveEntity=false)/_Sales?$apply=concat(groupby((Country,CurrencyCode,HasActiveEntity,ID,IsActiveEntity))/aggregate($count%20as%20UI5__leaves),aggregate(Amount,CurrencyCode),groupby((Country),aggregate(Amount,CurrencyCode))/concat(aggregate($count%20as%20UI5__count),top(109)))'
            },
            dataAccess
        );
        const updatedData = await dataAccess.getData(odataGetRequest);
        expect(updatedData).toMatchInlineSnapshot(`
            [
              {
                "UI5__leaves": 10,
              },
              {
                "Amount": 1230000,
                "CurrencyCode": null,
              },
              {
                "UI5__count": 4,
              },
              {
                "Amount": 420000,
                "Country": "USA",
                "CurrencyCode": "USD",
              },
              {
                "Amount": 375000,
                "Country": "France",
                "CurrencyCode": "EUR",
              },
              {
                "Amount": 220000,
                "Country": "Germany",
                "CurrencyCode": "EUR",
              },
              {
                "Amount": 215000,
                "Country": "UK",
                "CurrencyCode": "GBP",
              },
            ]
        `);
    });
});
