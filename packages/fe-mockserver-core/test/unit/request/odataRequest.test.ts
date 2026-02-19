import type { DataAccess } from '../../../src/data/dataAccess';
import ODataRequest from '../../../src/request/odataRequest';

describe('OData Request', () => {
    const fakeDataAccess: DataAccess = {
        getMetadata: () => {
            return {
                getVersion: () => {
                    return '4.0';
                }
            };
        },
        deleteData: jest.fn(),
        checkSession: jest.fn(),
        resetStickySessionTimeout: jest.fn(),
        updateData: jest.fn(),
        log: {
            info: (message: string) => {
                /* nothing */
            },
            error: (message: string | Error) => {
                /* nothing */
            }
        }
    } as unknown as DataAccess;
    const fakeDataAccessV2: DataAccess = {
        getMetadata: () => {
            return {
                getVersion: () => {
                    return '3.0';
                }
            };
        },
        log: {
            info: (message: string) => {
                /* nothing */
            },
            error: (message: string | Error) => {
                /* nothing */
            }
        }
    } as DataAccess;
    test('It can parse queries', () => {
        const myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries'
            },
            fakeDataAccess
        );
        expect(myRequest.queryPath).toMatchInlineSnapshot(`
            [
              {
                "keys": {},
                "path": "Countries",
              },
            ]
        `);
    });

    test('It can parse queries with search and search-focus', () => {
        const myRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/Countries?$filter=substringof(%27test%27, CompanyCode)&search-focus=CompanyCode&search=Value1`
            },
            fakeDataAccess
        );
        expect(myRequest.queryPath).toMatchInlineSnapshot(`
            [
              {
                "keys": {},
                "path": "Countries",
              },
            ]
        `);
        expect(myRequest.filterDefinition).toMatchInlineSnapshot(`
            {
              "expressions": [
                {
                  "identifier": {
                    "method": "substringof",
                    "methodArgs": [
                      "'test'",
                      "CompanyCode",
                    ],
                    "type": "method",
                  },
                },
              ],
            }
        `);
        const myOtherRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/Countries?$filter=SalesOrderType_Text%20eq%20'Standard%20Order%20(OR)%23'&search=Value1`
            },
            fakeDataAccess
        );
        expect(myOtherRequest.queryPath).toMatchInlineSnapshot(`
            [
              {
                "keys": {},
                "path": "Countries",
              },
            ]
        `);
        expect(myOtherRequest.filterDefinition).toMatchInlineSnapshot(`
            {
              "expressions": [
                {
                  "identifier": "SalesOrderType_Text",
                  "literal": "'Standard Order (OR)#'",
                  "operator": "eq",
                },
              ],
            }
        `);
    });

    test('It can parse $orderby', () => {
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$orderby=Prop1 desc,Prop2 asc,Prop3'
            },
            fakeDataAccess
        );
        expect(myRequest.orderBy).toMatchInlineSnapshot(`
            [
              {
                "direction": "desc",
                "name": "Prop1",
              },
              {
                "direction": "asc",
                "name": "Prop2",
              },
              {
                "direction": "asc",
                "name": "Prop3",
              },
            ]
        `);
        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$orderby=Prop1 desc asc,Prop3'
            },
            fakeDataAccess
        );
        expect(myRequest.orderBy).toMatchInlineSnapshot(`
            [
              {
                "direction": "desc",
                "name": "Prop1",
              },
              {
                "direction": "asc",
                "name": "Prop3",
              },
            ]
        `);

        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$orderby=implicitExpand/Prop1 desc'
            },
            fakeDataAccess
        );
        expect(myRequest.orderBy).toMatchInlineSnapshot(`
            [
              {
                "direction": "desc",
                "name": "implicitExpand/Prop1",
              },
            ]
        `);
        expect(myRequest.expandProperties).toMatchInlineSnapshot(`
            {
              "implicitExpand": {
                "expand": {},
                "properties": {
                  "*": true,
                },
                "removeFromResult": true,
              },
            }
        `);
    });

    test('It can parse $skip and $top', () => {
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$skip=0&$top=800'
            },
            fakeDataAccess
        );
        expect(myRequest.startIndex).toBe(0);
        expect(myRequest.maxElements).toBe(800);
        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$skip=Me&$top=Nope'
            },
            fakeDataAccess
        );
        expect(myRequest.startIndex).toBe(0);
        expect(myRequest.maxElements).toBe(Number.POSITIVE_INFINITY);
    });

    test('It can parse $count', () => {
        const myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$skip=0&$top=800&$count'
            },
            fakeDataAccess
        );
        expect(myRequest.countRequested).toBe(true);
    });

    test('It can parse $select', () => {
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'Countries?$select=Value1,Value2,,Value3'
            },
            fakeDataAccess
        );
        expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
            {
              "Value1": true,
              "Value2": true,
              "Value3": true,
            }
        `);

        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: 'Countries'
            },
            fakeDataAccess
        );
        expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
            {
              "*": true,
            }
        `);
    });

    describe('It can parse $expand', () => {
        test('V2 style', () => {
            const myRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: '/Countries?$expand=Value1,Value2,,Value3,Value4/Value5,Value4/Value6,Value4/Value7,Value4/Value6/Value8,Value4/Value6/Value9'
                },
                fakeDataAccessV2
            );
            expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
                            {
                              "*": true,
                              "Value1": true,
                              "Value2": true,
                              "Value3": true,
                              "Value4": true,
                            }
                    `);
            expect(myRequest.expandProperties).toMatchInlineSnapshot(`
                {
                  "Value1": {
                    "expand": {},
                    "properties": {
                      "*": true,
                    },
                  },
                  "Value2": {
                    "expand": {},
                    "properties": {
                      "*": true,
                    },
                  },
                  "Value3": {
                    "expand": {},
                    "properties": {
                      "*": true,
                    },
                  },
                  "Value4": {
                    "expand": {
                      "Value5": {
                        "expand": {},
                        "properties": {
                          "*": true,
                        },
                      },
                      "Value6": {
                        "expand": {
                          "Value8": {
                            "expand": {},
                            "properties": {
                              "*": true,
                            },
                          },
                          "Value9": {
                            "expand": {},
                            "properties": {
                              "*": true,
                            },
                          },
                        },
                        "properties": {
                          "*": true,
                        },
                      },
                      "Value7": {
                        "expand": {},
                        "properties": {
                          "*": true,
                        },
                      },
                    },
                    "properties": {
                      "*": true,
                    },
                  },
                }
            `);
        });

        test('V4, no additional expand options', () => {
            // V4 Style
            let myRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: '/Countries?$expand=Value1,Value2($select=SubValue1,SubValue2)'
                },
                fakeDataAccess
            );
            expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
                            {
                              "*": true,
                              "Value1": true,
                              "Value2": true,
                            }
                    `);
            expect(myRequest.expandProperties).toMatchInlineSnapshot(`
                {
                  "Value1": {
                    "expand": {},
                    "properties": {
                      "*": true,
                    },
                  },
                  "Value2": {
                    "expand": {},
                    "properties": {
                      "SubValue1": true,
                      "SubValue2": true,
                    },
                  },
                }
            `);
            // Complex nested style
            myRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: 'Countries?$select=Value3&$expand=Value1,Value2($expand=SubValue1($expand=SubSubValue1($expand=SubSubSubValue1),SubSubValue2($select=SubValue2)))'
                },
                fakeDataAccess
            );
            expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
                            {
                              "Value1": true,
                              "Value2": true,
                              "Value3": true,
                            }
                    `);
            expect(myRequest.expandProperties).toMatchInlineSnapshot(`
                {
                  "Value1": {
                    "expand": {},
                    "properties": {
                      "*": true,
                    },
                  },
                  "Value2": {
                    "expand": {
                      "SubValue1": {
                        "expand": {
                          "SubSubValue1": {
                            "expand": {
                              "SubSubSubValue1": {
                                "expand": {},
                                "properties": {
                                  "*": true,
                                },
                              },
                            },
                            "properties": {
                              "*": true,
                              "SubSubSubValue1": true,
                            },
                          },
                          "SubSubValue2": {
                            "expand": {},
                            "properties": {
                              "SubValue2": true,
                            },
                          },
                        },
                        "properties": {
                          "*": true,
                          "SubSubValue1": true,
                          "SubSubValue2": true,
                        },
                      },
                    },
                    "properties": {
                      "*": true,
                      "SubValue1": true,
                    },
                  },
                }
            `);
        });

        test('V4, additional expand options (1 level)', () => {
            const myRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: 'Set?$expand=explicitExpand($filter=implicitExpand1/FilterProperty eq 1;$orderby=implicitExpand2/implicitExpand3/OrderByProperty desc)'
                },
                fakeDataAccess
            );
            expect(myRequest.expandProperties).toMatchInlineSnapshot(`
                {
                  "explicitExpand": {
                    "expand": {
                      "implicitExpand1": {
                        "expand": {},
                        "properties": {
                          "*": true,
                        },
                        "removeFromResult": true,
                      },
                      "implicitExpand2": {
                        "expand": {
                          "implicitExpand3": {
                            "expand": {},
                            "properties": {
                              "*": true,
                            },
                            "removeFromResult": true,
                          },
                        },
                        "properties": {
                          "*": true,
                        },
                        "removeFromResult": true,
                      },
                    },
                    "filter": {
                      "expressions": [
                        {
                          "identifier": "implicitExpand1/FilterProperty",
                          "literal": "1",
                          "operator": "eq",
                        },
                      ],
                    },
                    "orderBy": [
                      {
                        "direction": "desc",
                        "name": "implicitExpand2/implicitExpand3/OrderByProperty",
                      },
                    ],
                    "properties": {
                      "*": true,
                    },
                  },
                }
            `);
        });

        test('V4, additional expand options (2 levels)', () => {
            const myRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: 'Set?$expand=explicitExpand($filter=implicitExpand1/FilterProperty eq 1;$orderby=implicitExpand2/OrderByProperty desc;$expand=explicitSubExpand($select=selectProperty;$filter=implicitSubExpand1/filterProperty1 eq 2))'
                },
                fakeDataAccess
            );
            expect(myRequest.expandProperties).toMatchInlineSnapshot(`
                {
                  "explicitExpand": {
                    "expand": {
                      "explicitSubExpand": {
                        "expand": {
                          "implicitSubExpand1": {
                            "expand": {},
                            "properties": {
                              "*": true,
                            },
                            "removeFromResult": true,
                          },
                        },
                        "filter": {
                          "expressions": [
                            {
                              "identifier": "implicitSubExpand1/filterProperty1",
                              "literal": "2",
                              "operator": "eq",
                            },
                          ],
                        },
                        "properties": {
                          "selectProperty": true,
                        },
                      },
                      "implicitExpand1": {
                        "expand": {},
                        "properties": {
                          "*": true,
                        },
                        "removeFromResult": true,
                      },
                      "implicitExpand2": {
                        "expand": {},
                        "properties": {
                          "*": true,
                        },
                        "removeFromResult": true,
                      },
                    },
                    "filter": {
                      "expressions": [
                        {
                          "identifier": "implicitExpand1/FilterProperty",
                          "literal": "1",
                          "operator": "eq",
                        },
                      ],
                    },
                    "orderBy": [
                      {
                        "direction": "desc",
                        "name": "implicitExpand2/OrderByProperty",
                      },
                    ],
                    "properties": {
                      "*": true,
                      "explicitSubExpand": true,
                    },
                  },
                }
            `);
        });
    });

    //$apply

    test('It can parse $apply', () => {
        // Complex nested style
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/Customer(P_CompanyCode='0001')/Set?$apply=groupby((Customer),aggregate(CreditScore))&$select=SomethingElse"
            },
            fakeDataAccess
        );
        expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
            {
              "CreditScore": true,
              "Customer": true,
              "SomethingElse": true,
            }
        `);
        expect(myRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "groupBy": [
                  "Customer",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "CreditScore",
                        "operator": undefined,
                        "sourceProperty": "CreditScore",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);
        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/Customer(P_CompanyCode='0001')/Set?$apply=filter(CityName%20eq%20'Waldorf')/groupby((Customer),aggregate(CreditScore))&$select=SomethingElse"
            },
            fakeDataAccess
        );
        expect(myRequest.selectedProperties).toMatchInlineSnapshot(`
            {
              "CreditScore": true,
              "Customer": true,
              "SomethingElse": true,
            }
        `);
        expect(myRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "filterExpr": {
                  "expressions": [
                    {
                      "identifier": "CityName",
                      "literal": "'Waldorf'",
                      "operator": "eq",
                    },
                  ],
                },
                "type": "filter",
              },
              {
                "groupBy": [
                  "Customer",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "CreditScore",
                        "operator": undefined,
                        "sourceProperty": "CreditScore",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);
        const chartRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/RootEntity?entitySet=Service.RootEntity&$apply=groupby((SalesOrganization,SalesOrganizationText),aggregate(NetPricing%20with%20sum%20as%20totalPricing))'
            },
            fakeDataAccess
        );
        expect(chartRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "groupBy": [
                  "SalesOrganization",
                  "SalesOrganizationText",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "totalPricing",
                        "operator": "sum",
                        "sourceProperty": "NetPricing",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);

        const alpRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrderItem?$count=true&$apply=groupby((HigherLevelItem,ID,Material,NetAmount,RequestedDeliveryDate,RequestedQuantity,RequestedQuantityUnit,SalesOrderItem,SalesOrderItemCategory,TransactionCurrency,_Material/Material,isVerified,owner/isVerified,_Material/Material_Text,_RequestedQuantityUnit/UnitOfMeasure_Text,SalesOrderItemText,_ItemCategory/SalesDocumentItemCategory_Text))&$skip=0&$top=64`
            },
            fakeDataAccess
        );
        expect(alpRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "groupBy": [
                  "HigherLevelItem",
                  "ID",
                  "Material",
                  "NetAmount",
                  "RequestedDeliveryDate",
                  "RequestedQuantity",
                  "RequestedQuantityUnit",
                  "SalesOrderItem",
                  "SalesOrderItemCategory",
                  "TransactionCurrency",
                  "_Material/Material",
                  "isVerified",
                  "owner/isVerified",
                  "_Material/Material_Text",
                  "_RequestedQuantityUnit/UnitOfMeasure_Text",
                  "SalesOrderItemText",
                  "_ItemCategory/SalesDocumentItemCategory_Text",
                ],
                "subTransformations": [],
                "type": "groupBy",
              },
            ]
        `);

        const anotherALPRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrderItem?entitySet=SalesOrderItem&useBatchRequests=true&provideGrandTotals=true&provideTotalResultSize=true&noPaging=true&$apply=groupby((SalesOrderItem,SalesOrderItemText),aggregate(NetAmount%20with%20max%20as%20maxAmount))`
            },
            fakeDataAccess
        );
        expect(anotherALPRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "groupBy": [
                  "SalesOrderItem",
                  "SalesOrderItemText",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "maxAmount",
                        "operator": "max",
                        "sourceProperty": "NetAmount",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);

        const anotherALP = new ODataRequest(
            {
                method: 'GET',
                url: 'SalesOrderItem?$count=true&$apply=groupby((HigherLevelItem,ID,Material,NetAmount,RequestedDeliveryDate,RequestedQuantity,RequestedQuantityUnit,SalesOrderItem,SalesOrderItemCategory,TransactionCurrency,_Material/Material,isVerified,owner/isVerified,_Material/Material_Text,_RequestedQuantityUnit/UnitOfMeasure_Text,SalesOrderItemText,_ItemCategory/SalesDocumentItemCategory_Text))&$skip=0&$top=70'
            },
            fakeDataAccess
        );
        expect(anotherALP.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "groupBy": [
                  "HigherLevelItem",
                  "ID",
                  "Material",
                  "NetAmount",
                  "RequestedDeliveryDate",
                  "RequestedQuantity",
                  "RequestedQuantityUnit",
                  "SalesOrderItem",
                  "SalesOrderItemCategory",
                  "TransactionCurrency",
                  "_Material/Material",
                  "isVerified",
                  "owner/isVerified",
                  "_Material/Material_Text",
                  "_RequestedQuantityUnit/UnitOfMeasure_Text",
                  "SalesOrderItemText",
                  "_ItemCategory/SalesDocumentItemCategory_Text",
                ],
                "subTransformations": [],
                "type": "groupBy",
              },
            ]
        `);

        const anotherAnotherALPREquest = new ODataRequest(
            {
                method: 'GET',
                url: `BusinessPartners?$apply=filter(Segment%20eq%20'Large')/concat(groupby((CountryVisibility,Country_Code,Currency,Id,LocalCurrency,Name,QuantityTrend,Region,Segment,ValuationDate))/aggregate($count%20as%20UI5__leaves),aggregate(Rating,RequestedQuantity,QuantityUnit,RequestedQuantityLocalUnit,LocalQuantityUnit,SalesAmount,Currency,SalesAmountLocalCurrency,LocalCurrency),groupby((Country_Code,Country),aggregate(Rating,RequestedQuantity,QuantityUnit,RequestedQuantityLocalUnit,LocalQuantityUnit,SalesAmount,Currency,SalesAmountLocalCurrency,LocalCurrency))/orderby(SalesAmount)/concat(aggregate($count%20as%20UI5__count),top(69)))`
            },
            fakeDataAccess
        );
        expect(anotherAnotherALPREquest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "filterExpr": {
                  "expressions": [
                    {
                      "identifier": "Segment",
                      "literal": "'Large'",
                      "operator": "eq",
                    },
                  ],
                },
                "type": "filter",
              },
              {
                "concatExpr": [
                  [
                    {
                      "groupBy": [
                        "CountryVisibility",
                        "Country_Code",
                        "Currency",
                        "Id",
                        "LocalCurrency",
                        "Name",
                        "QuantityTrend",
                        "Region",
                        "Segment",
                        "ValuationDate",
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
                          "name": "Rating",
                          "operator": undefined,
                          "sourceProperty": "Rating",
                        },
                        {
                          "name": "RequestedQuantity",
                          "operator": undefined,
                          "sourceProperty": "RequestedQuantity",
                        },
                        {
                          "name": "QuantityUnit",
                          "operator": undefined,
                          "sourceProperty": "QuantityUnit",
                        },
                        {
                          "name": "RequestedQuantityLocalUnit",
                          "operator": undefined,
                          "sourceProperty": "RequestedQuantityLocalUnit",
                        },
                        {
                          "name": "LocalQuantityUnit",
                          "operator": undefined,
                          "sourceProperty": "LocalQuantityUnit",
                        },
                        {
                          "name": "SalesAmount",
                          "operator": undefined,
                          "sourceProperty": "SalesAmount",
                        },
                        {
                          "name": "Currency",
                          "operator": undefined,
                          "sourceProperty": "Currency",
                        },
                        {
                          "name": "SalesAmountLocalCurrency",
                          "operator": undefined,
                          "sourceProperty": "SalesAmountLocalCurrency",
                        },
                        {
                          "name": "LocalCurrency",
                          "operator": undefined,
                          "sourceProperty": "LocalCurrency",
                        },
                      ],
                      "type": "aggregates",
                    },
                  ],
                  [
                    {
                      "groupBy": [
                        "Country_Code",
                        "Country",
                      ],
                      "subTransformations": [
                        {
                          "aggregateDef": [
                            {
                              "name": "Rating",
                              "operator": undefined,
                              "sourceProperty": "Rating",
                            },
                            {
                              "name": "RequestedQuantity",
                              "operator": undefined,
                              "sourceProperty": "RequestedQuantity",
                            },
                            {
                              "name": "QuantityUnit",
                              "operator": undefined,
                              "sourceProperty": "QuantityUnit",
                            },
                            {
                              "name": "RequestedQuantityLocalUnit",
                              "operator": undefined,
                              "sourceProperty": "RequestedQuantityLocalUnit",
                            },
                            {
                              "name": "LocalQuantityUnit",
                              "operator": undefined,
                              "sourceProperty": "LocalQuantityUnit",
                            },
                            {
                              "name": "SalesAmount",
                              "operator": undefined,
                              "sourceProperty": "SalesAmount",
                            },
                            {
                              "name": "Currency",
                              "operator": undefined,
                              "sourceProperty": "Currency",
                            },
                            {
                              "name": "SalesAmountLocalCurrency",
                              "operator": undefined,
                              "sourceProperty": "SalesAmountLocalCurrency",
                            },
                            {
                              "name": "LocalCurrency",
                              "operator": undefined,
                              "sourceProperty": "LocalCurrency",
                            },
                          ],
                          "type": "aggregates",
                        },
                      ],
                      "type": "groupBy",
                    },
                    {
                      "orderBy": [
                        {
                          "direction": "asc",
                          "name": "SalesAmount",
                        },
                      ],
                      "type": "orderBy",
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
                            "topCount": 69,
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
    });

    // $filter
    describe('It can parse $filter', () => {
        const $filterTestCases: { query: string }[] = [
            // simple filters
            { query: '$filter=value eq 0' },
            { query: '$filter=single/value eq 0' },
            { query: '$filter=single/value eq 0&$expand=single($select=other)' },

            // lambda
            { query: '$filter=collection/any()' },
            { query: '$filter=collection/any(d:d gt 0)' },
            { query: '$filter=collection/any(d:d/value gt 0)' },
            { query: '$filter=collection/any(d:d/value gt 0 and d/single/value eq 1)' },
            { query: '$filter=collection/any(d:d/collection/all(e:e gt 0))' },
            { query: '$filter=collection1/any(d:d/value gt 0) and collection2/any(d:d/value eq 1)' },
            { query: '$filter=single1/single2/collection/any(d:d/value gt 0)' },
            { query: '$filter=collection/any(d:d/single1/single2/value gt 0)' },
            { query: '$filter=collection/any(d:d/value gt 0 and d/collection/all(e:e/value eq 1)' },
            { query: '$filter=collection/any(d:d/value1 gt 0)&$expand=collection($select=value2)' },
            { query: '$filter=collection1/any(d:d/value1 gt 0)&$expand=collection2' }
        ];

        test.each($filterTestCases)('$query', ({ query }) => {
            const request = new ODataRequest({ method: 'GET', url: `/Entities?${query}` }, fakeDataAccess);

            expect({
                expandProperties: request.expandProperties, // $filter can affect the expandProperties
                filterDefinition: request.filterDefinition
            }).toMatchSnapshot();
        });
    });

    describe('It can parse keys', () => {
        // test values in parts taken from https://docs.oasis-open.org/odata/odata/v4.01/os/abnf/odata-abnf-testcases.xml
        const keyValues: { keyValue: string; parsedValue: string | number | boolean }[] = [
            { keyValue: "''", parsedValue: '' },
            { keyValue: "'Tablet'", parsedValue: 'Tablet' },
            { keyValue: "'7''''%20Tablet'", parsedValue: "7'''' Tablet" },
            { keyValue: "'Tablet%2FSlate'", parsedValue: 'Tablet/Slate' },
            { keyValue: "'Tablet%20%28small%29'", parsedValue: 'Tablet (small)' },
            { keyValue: "'Tablet%20(small)'", parsedValue: 'Tablet (small)' },
            { keyValue: "'Tablet%20)small('", parsedValue: 'Tablet )small(' },
            { keyValue: '2018-02-13T23:59:59Z', parsedValue: '2018-02-13T23:59:59Z' },
            { keyValue: '2018-02-13T23%3A59%3A59Z', parsedValue: '2018-02-13T23:59:59Z' },
            { keyValue: '23:59:59', parsedValue: '23:59:59' },
            { keyValue: '23%3A59%3A59', parsedValue: '23:59:59' },
            { keyValue: '0583fe64-bf12-4b22-b473-d1ad99becc5f', parsedValue: '0583fe64-bf12-4b22-b473-d1ad99becc5f' },
            { keyValue: '0', parsedValue: 0 },
            { keyValue: '1', parsedValue: 1 },
            { keyValue: '123', parsedValue: 123 },
            { keyValue: 'true', parsedValue: true },
            { keyValue: "'true'", parsedValue: 'true' },
            { keyValue: 'false', parsedValue: false },
            { keyValue: "'false'", parsedValue: 'false' },
            { keyValue: '%27Tablet%27', parsedValue: 'Tablet' }
        ];

        test.each(keyValues)('$keyValue -> $parsedValue', ({ keyValue, parsedValue }) => {
            const namedKey = new ODataRequest({ method: 'POST', url: `/Entity(key=${keyValue})` }, fakeDataAccess);
            expect(namedKey.queryPath[0].keys).toEqual({ key: parsedValue });

            const defaultKey = new ODataRequest({ method: 'POST', url: `/Entity(${keyValue})` }, fakeDataAccess);
            expect(defaultKey.queryPath[0].keys).toEqual({ '': parsedValue });
        });
    });

    test('It can consider POST queries with x-http-method as their correct equivalent', async () => {
        const myRequest = new ODataRequest(
            {
                method: 'POST',
                url: `/Countries?$filter=substringof(%27test%27, CompanyCode)&search-focus=CompanyCode&search=Value1`,
                headers: {
                    'x-http-method': 'MERGE'
                }
            },
            fakeDataAccess
        );
        await myRequest.handleRequest();
        expect(fakeDataAccess.updateData).toHaveBeenCalled();

        const myOtherRequest = new ODataRequest(
            {
                method: 'POST',
                url: `/Countries?$filter=substringof(%27test%27, CompanyCode)&search-focus=CompanyCode&search=Value1`,
                headers: {
                    'x-http-method': 'DELETE'
                }
            },
            fakeDataAccess
        );
        await myOtherRequest.handleRequest();
        expect(fakeDataAccess.deleteData).toHaveBeenCalled();
    });

    describe('It can parse matrix parameters', () => {
        // Matrix parameters are used for external service references in OData V4
        // See: https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_MatrixParameters

        test('It can parse encoded matrix parameters (UI5 1.142 format)', () => {
            const request = new ODataRequest(
                {
                    method: 'GET',
                    url: '/srvd_f4/dmo/i_agency/0001;ps=%27srvd-m2_sd_travel_mduu-0001%27;va=%27com.sap.gateway.srvd.m2_sd_travel_mduu.v0001.et-m2_c_travel_mduu.agencyid%27/$metadata'
                },
                fakeDataAccess
            );

            expect(request.queryPath).toMatchInlineSnapshot(`
                [
                  {
                    "keys": {},
                    "path": "srvd_f4",
                  },
                  {
                    "keys": {},
                    "path": "dmo",
                  },
                  {
                    "keys": {},
                    "path": "i_agency",
                  },
                  {
                    "keys": {},
                    "matrixParameters": {
                      "ps": "srvd-m2_sd_travel_mduu-0001",
                      "va": "com.sap.gateway.srvd.m2_sd_travel_mduu.v0001.et-m2_c_travel_mduu.agencyid",
                    },
                    "path": "0001",
                  },
                  {
                    "keys": {},
                    "path": "$metadata",
                  },
                ]
            `);
        });

        test('It can parse unencoded matrix parameters (UI5 1.144+ format)', () => {
            const request = new ODataRequest(
                {
                    method: 'GET',
                    url: "/srvd_f4/dmo/i_agency/0001;ps='srvd-m2_sd_travel_mduu-0001';va='com.sap.gateway.srvd.m2_sd_travel_mduu.v0001.et-m2_c_travel_mduu.agencyid'/$metadata"
                },
                fakeDataAccess
            );

            // Should parse the same as encoded version
            expect(request.queryPath).toMatchInlineSnapshot(`
                [
                  {
                    "keys": {},
                    "path": "srvd_f4",
                  },
                  {
                    "keys": {},
                    "path": "dmo",
                  },
                  {
                    "keys": {},
                    "path": "i_agency",
                  },
                  {
                    "keys": {},
                    "matrixParameters": {
                      "ps": "srvd-m2_sd_travel_mduu-0001",
                      "va": "com.sap.gateway.srvd.m2_sd_travel_mduu.v0001.et-m2_c_travel_mduu.agencyid",
                    },
                    "path": "0001",
                  },
                  {
                    "keys": {},
                    "path": "$metadata",
                  },
                ]
            `);
        });

        test('It can parse matrix parameters with keys', () => {
            const request = new ODataRequest(
                {
                    method: 'GET',
                    url: "/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_COMMON',Version='0001',SAP__Origin='LOCAL');v=2/$value"
                },
                fakeDataAccess
            );

            expect(request.queryPath).toMatchInlineSnapshot(`
                [
                  {
                    "keys": {
                      "SAP__Origin": "LOCAL",
                      "TechnicalName": "/IWBEP/VOC_COMMON",
                      "Version": "0001",
                    },
                    "matrixParameters": {
                      "v": "2",
                    },
                    "path": "Vocabularies",
                  },
                  {
                    "keys": {},
                    "path": "$value",
                  },
                ]
            `);
        });
    });
});
