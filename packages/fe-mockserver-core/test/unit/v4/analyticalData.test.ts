import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

jest.setTimeout(3600000);
describe('Analytical Access', () => {
    let dataAccess!: DataAccess;
    let dataAccess2!: DataAccess;
    let metadata!: ODataMetadata;
    let metadata2!: ODataMetadata;
    const baseUrl = '/AnalyticalData';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'analytical');
        const baseDir2 = join(__dirname, 'services', 'analyticalWithNav');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'metadata.xml'));
        const edmx2 = await metadataProvider.loadMetadata(join(baseDir2, 'metadata.xml'));
        const serviceRegistry = {
            getService: jest.fn(),
            registerService: jest.fn(),
            getServicesWithAliases: jest.fn()
        } as any;
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        metadata2 = await ODataMetadata.parse(edmx2, baseUrl + '/$metadata');
        dataAccess = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        dataAccess2 = new DataAccess(
            { mockdataPath: baseDir2 } as ServiceConfig,
            metadata2,
            fileLoader,
            undefined,
            serviceRegistry
        );
    });
    test('1- Request first page of LineItems tree with groupings', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/LineItems?$apply=concat(groupby((Account,CompanyCode,CostCenter,EmissionTotalUnit,GHGCategory,ID,JournalEntryID,ProfitCenter,Segment))/aggregate($count%20as%20UI5__leaves),aggregate(Credit,Debit),groupby((Account),aggregate(Credit,Debit))/concat(aggregate($count%20as%20UI5__count),top(82)))'
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "concatExpr": [
                  [
                    {
                      "groupBy": [
                        "Account",
                        "CompanyCode",
                        "CostCenter",
                        "EmissionTotalUnit",
                        "GHGCategory",
                        "ID",
                        "JournalEntryID",
                        "ProfitCenter",
                        "Segment",
                      ],
                      "subTransformations": [],
                      "type": "groupBy",
                    },
                    {
                      "aggregateDef": [
                        {
                          "name": "UI5__leaves",
                          "operator": undefined,
                          "sourceProperty": "count",
                        },
                      ],
                      "type": "aggregates",
                    },
                  ],
                  [
                    {
                      "aggregateDef": [
                        {
                          "name": "Credit",
                          "operator": undefined,
                          "sourceProperty": "Credit",
                        },
                        {
                          "name": "Debit",
                          "operator": undefined,
                          "sourceProperty": "Debit",
                        },
                      ],
                      "type": "aggregates",
                    },
                  ],
                  [
                    {
                      "groupBy": [
                        "Account",
                      ],
                      "subTransformations": [
                        {
                          "aggregateDef": [
                            {
                              "name": "Credit",
                              "operator": undefined,
                              "sourceProperty": "Credit",
                            },
                            {
                              "name": "Debit",
                              "operator": undefined,
                              "sourceProperty": "Debit",
                            },
                          ],
                          "type": "aggregates",
                        },
                      ],
                      "type": "groupBy",
                    },
                    {
                      "concatExpr": [
                        [
                          {
                            "aggregateDef": [
                              {
                                "name": "UI5__count",
                                "operator": undefined,
                                "sourceProperty": "count",
                              },
                            ],
                            "type": "aggregates",
                          },
                        ],
                        [
                          {
                            "topCount": 82,
                            "type": "top",
                          },
                        ],
                      ],
                      "type": "concat",
                    },
                  ],
                ],
                "type": "concat",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "UI5__leaves": 25,
              },
              {
                "Credit": 264009.601,
                "Debit": 321709.59900000005,
              },
              {
                "UI5__count": 3,
              },
              {
                "Account": "895000 (Fact.output pro.ord)",
                "Credit": 192607.201,
                "Debit": 98502.39899999999,
              },
              {
                "Account": "792000 (Finished Goods)",
                "Credit": 71402.4,
                "Debit": 149804.8,
              },
              {
                "Account": "792000 (Fact.output pro.ord)",
                "Credit": 0,
                "Debit": 73402.4,
              },
            ]
        `);
    });
    test('2- Can get groupBy data even from navProps', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/LineItems?$apply=filter(account_ID%20eq%201407618a-ab4d-36f8-cdc2-55d0f2bfbca9%20and%20(ledger%20eq%20'0L'))/groupby((ID,company/code,costCenter/name,debitCreditIndicator,ghgCategory/code,journalEntryID,profitCenter/name,segment/code),aggregate(amount))"
            },
            dataAccess2
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "filterExpr": {
                  "expressions": [
                    {
                      "identifier": "account_ID",
                      "literal": "1407618a-ab4d-36f8-cdc2-55d0f2bfbca9",
                      "operator": "eq",
                    },
                    {
                      "identifier": "ledger",
                      "literal": "'0L'",
                      "operator": "eq",
                    },
                  ],
                  "operator": "AND",
                },
                "type": "filter",
              },
              {
                "groupBy": [
                  "ID",
                  "company/code",
                  "costCenter/name",
                  "debitCreditIndicator",
                  "ghgCategory/code",
                  "journalEntryID",
                  "profitCenter/name",
                  "segment/code",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "amount",
                        "operator": undefined,
                        "sourceProperty": "amount",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);
        const data = await dataAccess2.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "ID": "01501ff5-9700-4a37-91b4-9ed4643cb367",
                "amount": -46802.401,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "000008456789876",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "0cea72e5-ceca-4e7a-a6bf-36ea9b57c44a",
                "amount": -45802.401,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "100000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "188c41f5-1b09-484f-a840-a3a52180e2d3",
                "amount": -500,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "500000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "4395e238-fe39-4bfd-a93f-636facfe3d37",
                "amount": -1000,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "000008456789878",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "51b0c649-f103-4c59-9685-e84c6f47a7c1",
                "amount": -500,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "000008456789878",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "5adc6d31-1b61-49c9-8e1b-d6146c4094ca",
                "amount": -1000,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "400000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "5ecce7d2-4f3c-49d1-8958-8c42e6020cfc",
                "amount": -26599.999,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "200000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "6e996bbc-0c50-40e1-bab8-39db42309440",
                "amount": -1000,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "300000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "b59015d0-44c2-4a51-9985-1bf48deeef00",
                "amount": -26599.999,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "000008456789876",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "d2ed899c-44d2-4161-8823-9d03bd19bc1e",
                "amount": -25599.999,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "100000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "d9eed95c-0e68-4748-8019-d58e22dc161f",
                "amount": 25599.999,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "H",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "100000000000001",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "dc862343-27c4-4d1d-9f3b-12e1bffd8044",
                "amount": -46802.401,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "200000000000000",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "f706b848-59cb-4fe4-85f4-956fa16e111b",
                "amount": -1000,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "S",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "000008456789878",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
              {
                "ID": "fd607bbb-7f38-40f6-8db1-b7c7f1ba120b",
                "amount": 45802.401,
                "company": {
                  "code": "sap01",
                },
                "costCenter": {
                  "name": "CC1",
                },
                "debitCreditIndicator": "H",
                "ghgCategory": {
                  "code": undefined,
                },
                "journalEntryID": "100000000000001",
                "profitCenter": {
                  "name": "PC1",
                },
                "segment": {
                  "code": "1000_A",
                },
              },
            ]
        `);
    });
});
