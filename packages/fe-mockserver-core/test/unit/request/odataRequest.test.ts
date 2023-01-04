import ODataRequest from '../../../src/request/odataRequest';
import type { DataAccess } from '../../../src/data/dataAccess';

describe('OData Request', () => {
    const fakeDataAccess: DataAccess = {
        getMetadata: () => {
            return {
                getVersion: () => {
                    return '4.0';
                }
            };
        }
    } as DataAccess;
    const fakeDataAccessV2: DataAccess = {
        getMetadata: () => {
            return {
                getVersion: () => {
                    return '3.0';
                }
            };
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

    test('It can parse $expand', () => {
        // V2 Style
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries?$expand=Value1,Value2,,Value3,Value4/Value5'
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
                },
                "properties": {
                  "*": true,
                },
              },
            }
        `);
        // V4 Style
        myRequest = new ODataRequest(
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
        expect(myRequest.aggregateDefinition).toMatchInlineSnapshot(`
            {
              "aggregates": [
                {
                  "name": "CreditScore",
                  "operator": undefined,
                  "sourceProperty": "CreditScore",
                },
              ],
              "filter": undefined,
              "groupBy": [
                "Customer",
              ],
            }
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
        expect(myRequest.aggregateDefinition).toMatchInlineSnapshot(`
            {
              "aggregates": [
                {
                  "name": "CreditScore",
                  "operator": undefined,
                  "sourceProperty": "CreditScore",
                },
              ],
              "filter": {
                "expressions": [
                  {
                    "identifier": "CityName",
                    "literal": "'Waldorf'",
                    "operator": "eq",
                  },
                ],
              },
              "groupBy": [
                "Customer",
              ],
            }
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
});
