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
    let metadata!: ODataMetadata;
    const baseUrl = '/AnalyticalData';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'analytical');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'metadata.xml'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
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
});
