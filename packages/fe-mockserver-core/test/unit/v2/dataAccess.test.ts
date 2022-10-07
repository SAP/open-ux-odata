import { join } from 'path';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import type { ServiceConfig } from '../../../src';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import ODataRequest from '../../../src/request/odataRequest';

describe('Data Access', () => {
    let dataAccess!: DataAccess;
    let dataAccessNoMock!: DataAccess;
    let metadataNoMock!: ODataMetadata;
    let metadata!: ODataMetadata;
    const baseUrl = '/sap/fe/preview/Form';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'productSample');
        const baseDirNoMock = join(__dirname, 'services', 'productSampleNoMock');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'metadata.xml'));
        const edmxNoMock = await metadataProvider.loadMetadata(join(baseDirNoMock, 'metadata.xml'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        metadataNoMock = await ODataMetadata.parse(edmxNoMock, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        dataAccessNoMock = new DataAccess(
            { mockdataPath: baseDirNoMock, generateMockData: true } as ServiceConfig,
            metadata,
            fileLoader
        );
    });
    test('v2metadata - it can GET data for an entity', async () => {
        let odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/SEPMRA_C_PD_Product?$skip=0&$top=20&$orderby=to_ProductTextInOriginalLang/Name%20asc&$filter=IsActiveEntity%20eq%20false%20or%20SiblingEntity/IsActiveEntity%20eq%20null&$select=ProductCategory%2cProductPictureURL%2cProductForEdit%2cto_ProductTextInOriginalLang%2fName%2cProduct%2cDraftUUID%2cIsActiveEntity%2cHasDraftEntity%2cHasActiveEntity%2cCopy_ac%2cDraftAdministrativeData&$expand=to_ProductTextInOriginalLang%2cDraftAdministrativeData&$inlinecount=allpages'
            },
            dataAccess
        );
        let productData = await dataAccess.getData(odataRequest);
        expect(productData.length).toEqual(4);
        expect(odataRequest.dataCount).toEqual(4);
        odataRequest = new ODataRequest({ method: 'GET', url: '/SEPMRA_C_PD_Product?$skip=0&$top=3' }, dataAccess);
        productData = await dataAccess.getData(odataRequest);
        expect(productData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(4);
        expect(productData[0].Supplier).toEqual('Acme DE');
        expect(productData[0].Price).toEqual(3);

        productData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SEPMRA_C_PD_Product?$skip=1&$top=3' }, dataAccess)
        );
        expect(productData.length).toEqual(3);
        expect(productData[0].Supplier).toEqual('Acme DE');
        expect(productData[0].Price).toEqual(1);
        productData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SEPMRA_C_PD_Product?$select=Supplier' }, dataAccess)
        );
        expect(productData[0].Supplier).toEqual('Acme DE');
        expect(productData[0].Name).toBeUndefined();
        productData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SEPMRA_C_PD_Product?$filter=Supplier eq 'Acme DE'" }, dataAccess)
        );
        expect(productData.length).toEqual(2);
        expect(productData[0].Supplier).toEqual('Acme DE');
        expect(productData[0].Name).toEqual('Acme Boomerang');
        productData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/SEPMRA_C_PD_Product?$filter=StartingSaleDate gt datetime'2022-10-07T06:52:24.189'"
                },
                dataAccess
            )
        );
        expect(productData.length).toEqual(2);
        expect(productData[0].Supplier).toEqual('Acme DE');
        expect(productData[0].Name).toEqual('Acme TNT');
        expect(productData[1].Name).toEqual('Acme Extra Comfy Safe');
        productData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SEPMRA_C_PD_Product?$orderby=Price,Supplier' }, dataAccess)
        );
        expect(productData.length).toEqual(4);
        expect(productData[0].Name).toEqual('Acme TNT');
        expect(productData[1].Name).toEqual('Acme Trap v2');
        expect(productData[2].Name).toEqual('Acme Boomerang');
        expect(productData[3].Name).toEqual('Acme Extra Comfy Safe');
    });
    test('v2dataAccess - it can GET data for an entity when there is no mock data', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/SEPMRA_C_PD_Product?$skip=0&$top=20&$orderby=to_ProductTextInOriginalLang/Name%20asc&$filter=IsActiveEntity%20eq%20false%20or%20SiblingEntity/IsActiveEntity%20eq%20null&$select=ProductPictureURL%2cProductForEdit%2cProductForEdit_fc%2cto_ProductTextInOriginalLang%2fName%2cto_ProductCategory%2fMainProductCategory%2cProductCategory%2cto_Supplier%2fCompanyName%2cto_Supplier%2cto_ProductStock%2fStockAvailability%2cto_ProductStock%2fto_StockAvailability%2fStockAvailability_Text%2cto_CollaborativeReview%2fAverageRatingValue%2cPrice%2cCurrency%2cProduct%2cDraftUUID%2cIsActiveEntity%2cHasDraftEntity%2cHasActiveEntity%2cCopy_ac%2cDraftAdministrativeData&$expand=to_ProductCategory%2cto_Supplier%2cto_ProductStock%2cto_ProductStock%2fto_StockAvailability%2cto_ProductTextInOriginalLang%2cto_CollaborativeReview%2cDraftAdministrativeData&$inlinecount=allpages'
            },
            dataAccess
        );
        const productData = await dataAccessNoMock.getData(odataRequest);
        expect(productData.length).toEqual(20);
        expect(odataRequest.dataCount).toEqual(150);
    });
    test('v2metadata - it can GET data for an entity', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/SEPMRA_C_PD_Product?$skip=0&$top=20&$orderby=to_ProductTextInOriginalLang/Name%20asc&$filter=IsActiveEntity%20eq%20false%20or%20SiblingEntity/IsActiveEntity%20eq%20null&$select=ProductCategory%2cProductPictureURL%2cProductForEdit%2cto_ProductTextInOriginalLang%2fName%2cProduct%2cDraftUUID%2cIsActiveEntity%2cHasDraftEntity%2cHasActiveEntity%2cCopy_ac%2cDraftAdministrativeData&$expand=to_ProductTextInOriginalLang%2cDraftAdministrativeData&$inlinecount=allpages'
            },
            dataAccess
        );
        await odataRequest.handleRequest();
        let responseData = odataRequest.getResponseData() || '';
        // remove data
        responseData = responseData.replace(/\/Date\([^)]+\)/g, '/Date()');
        expect(responseData).toMatchSnapshot();
        expect(odataRequest.responseHeaders).toMatchSnapshot();
        const odataRequestSolo = new ODataRequest(
            {
                method: 'GET',
                url: "/SEPMRA_C_PD_Product(Product='Acme_Boomerang',DraftUUID='',IsActiveEntity=true)"
            },
            dataAccess
        );
        await odataRequestSolo.handleRequest();
        let responseDataSolo = odataRequestSolo.getResponseData() || '';
        responseDataSolo = responseDataSolo.replace(/\/Date\([^)]+\)/g, '/Date()');
        expect(responseDataSolo).toMatchSnapshot();
        expect(odataRequestSolo.responseHeaders).toMatchSnapshot();
    });
    test('v2metadata - it can DELETE data for an entity', async () => {
        const odataRequestDelete = new ODataRequest(
            {
                method: 'DELETE',
                url: "/SEPMRA_C_PD_Product(Product='Acme_Boomerang',DraftUUID='',IsActiveEntity=true)"
            },
            dataAccess
        );
        await odataRequestDelete.handleRequest();
        const responseDataDelete = odataRequestDelete.getResponseData();
        expect(responseDataDelete).toMatchSnapshot();
        expect(odataRequestDelete.responseHeaders).toMatchSnapshot();
    });
});
