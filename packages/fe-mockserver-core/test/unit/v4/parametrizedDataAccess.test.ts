import { join } from 'path';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';

describe('Parametrized Data Access', () => {
    let dataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    const baseUrl = '/sap/fe/preview/Parametrized';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);

    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'parametrizedSample');
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'metadata.xml'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    test('v4metadata - it can GET data for an entity', async () => {
        let customerData;
        try {
            customerData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Customer' }, dataAccess));
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined;
        }

        try {
            customerData = await dataAccess.getData(
                new ODataRequest({ method: 'GET', url: "/Customer(P_CompanyCode='0001')" }, dataAccess)
            );
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined;
        }

        customerData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Customer(P_CompanyCode='0001')/Set" }, dataAccess)
        );
        expect(customerData.length).toEqual(10);

        customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set(Customer='1',CompanyCode='0001',SalesOrganization='',DistributionChannel='',Division='',PartnerCounter='',IBAN='',CardNumber='2922870',PaymentCardType='')"
                },
                dataAccess
            )
        );
        expect(customerData.Customer).toEqual('1');
        expect(customerData.CardNumber).toEqual('2922870');
        customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set(Customer='1',CompanyCode='0001',SalesOrganization='',DistributionChannel='',Division='',PartnerCounter='',IBAN='',CardNumber='2922870',PaymentCardType='')/_CreditLimitDetails"
                },
                dataAccess
            )
        );
        expect(customerData.CardNumber).toEqual('2922870');
    });

    test('can expand data', async () => {
        const customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set?$count=true&$select=BusinessPartnerName,CardNumber,CityName,CompanyCode,CreditScore,Customer,DistributionChannel,Division,IBAN,OverallStatus,PartnerCounter,PaymentCardType,Progress,Rating,SalesOrganization,StatusCriticality&$expand=_CreditLimitDetails($select=CardNumber,CustomerCreditExposureAmount)&$skip=0&$top=30"
                },
                dataAccess
            )
        );
        expect(customerData.length).toBe(10);
        expect(customerData[0]._CreditLimitDetails).toBeDefined();
        expect(customerData[0]._CreditLimitDetails.CardNumber).toBeDefined();
        expect(customerData[0]._CreditLimitDetails.DeviationRangeLow).toBeUndefined();
    });
    test('can filter data', async () => {
        const customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set?$filter=CityName%20eq%20'Waldorf'&$count=true&$select=BusinessPartnerName,CardNumber,CityName,CompanyCode,CreditScore,Customer,DistributionChannel,Division,IBAN,OverallStatus,PartnerCounter,PaymentCardType,Progress,Rating,SalesOrganization,StatusCriticality&$expand=_CreditLimitDetails($select=CardNumber,CustomerCreditExposureAmount)&$skip=0&$top=30"
                },
                dataAccess
            )
        );
        expect(customerData.length).toBe(4);
    });
    test('can aggregate data with a custom aggregate', async () => {
        const customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set?$apply=groupby((Customer),aggregate(CreditScore))"
                },
                dataAccess
            )
        );
        expect(customerData.length).toBe(7);
        expect(customerData[0].Customer).toBe('1');
        expect(customerData[0].CreditScore).toBe(1500);
        expect(customerData[1].Customer).toBe('2');
        expect(customerData[1].CreditScore).toBe(2750);
    });
    test('can aggregate data with a custom aggregate and a filter', async () => {
        const customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set?$apply=filter(CityName%20eq%20'Waldorf')/groupby((Customer),aggregate(CreditScore))"
                },
                dataAccess
            )
        );
        expect(customerData.length).toBe(3);
        expect(customerData[0].Customer).toBe('1');
        expect(customerData[0].CreditScore).toBe(500);
        expect(customerData[1].Customer).toBe('2');
        expect(customerData[1].CreditScore).toBe(2750);
        expect(customerData[2].Customer).toBe('6');
        expect(customerData[2].CreditScore).toBe(250);
    });
    test('can aggregate data without a custom aggregate', async () => {
        const customerData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Customer(P_CompanyCode='0001')/Set?$apply=groupby((Customer),aggregate(CreditScore2))"
                },
                dataAccess
            )
        );
        expect(customerData.length).toBe(7);
        expect(customerData[0].Customer).toBe('1');
        expect(customerData[0].CreditScore2).toBe(200);
        expect(customerData[1].Customer).toBe('2');
        expect(customerData[1].CreditScore2).toBe(550);
    });
});
