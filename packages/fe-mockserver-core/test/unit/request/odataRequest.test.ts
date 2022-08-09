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
        let myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries'
            },
            fakeDataAccess
        );
        expect(myRequest.queryPath).toMatchInlineSnapshot(`
            Array [
              Object {
                "keys": Object {},
                "path": "Countries",
              },
            ]
        `);
        myRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/Countries'
            },
            fakeDataAccess
        );
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
            Array [
              Object {
                "direction": "desc",
                "name": "Prop1",
              },
              Object {
                "direction": "asc",
                "name": "Prop2",
              },
              Object {
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
            Array [
              Object {
                "direction": "desc",
                "name": "Prop1",
              },
              Object {
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
            Object {
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
            Object {
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
            Object {
              "*": true,
              "Value1": true,
              "Value2": true,
              "Value3": true,
              "Value4": true,
            }
        `);
        expect(myRequest.expandProperties).toMatchInlineSnapshot(`
            Object {
              "Value1": Object {
                "expand": Object {},
                "properties": Object {
                  "*": true,
                },
              },
              "Value2": Object {
                "expand": Object {},
                "properties": Object {
                  "*": true,
                },
              },
              "Value3": Object {
                "expand": Object {},
                "properties": Object {
                  "*": true,
                },
              },
              "Value4": Object {
                "expand": Object {
                  "Value5": Object {
                    "expand": Object {},
                    "properties": Object {
                      "*": true,
                    },
                  },
                },
                "properties": Object {
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
            Object {
              "*": true,
              "Value1": true,
              "Value2": true,
            }
        `);
        expect(myRequest.expandProperties).toMatchInlineSnapshot(`
            Object {
              "Value1": Object {
                "expand": Object {},
                "properties": Object {
                  "*": true,
                },
              },
              "Value2": Object {
                "expand": Object {},
                "properties": Object {
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
            Object {
              "Value1": true,
              "Value2": true,
              "Value3": true,
            }
        `);
        expect(myRequest.expandProperties).toMatchInlineSnapshot(`
            Object {
              "Value1": Object {
                "expand": Object {},
                "properties": Object {
                  "*": true,
                },
              },
              "Value2": Object {
                "expand": Object {
                  "SubValue1": Object {
                    "expand": Object {
                      "SubSubValue1": Object {
                        "expand": Object {
                          "SubSubSubValue1": Object {
                            "expand": Object {},
                            "properties": Object {
                              "*": true,
                            },
                          },
                        },
                        "properties": Object {
                          "*": true,
                          "SubSubSubValue1": true,
                        },
                      },
                      "SubSubValue2": Object {
                        "expand": Object {},
                        "properties": Object {
                          "SubValue2": true,
                        },
                      },
                    },
                    "properties": Object {
                      "*": true,
                      "SubSubValue1": true,
                      "SubSubValue2": true,
                    },
                  },
                },
                "properties": Object {
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
            Object {
              "CreditScore": true,
              "Customer": true,
              "SomethingElse": true,
            }
        `);
        expect(myRequest.aggregateDefinition).toMatchInlineSnapshot(`
            Object {
              "aggregates": Array [
                Object {
                  "name": "CreditScore",
                  "operator": undefined,
                  "sourceProperty": "CreditScore",
                },
              ],
              "filter": undefined,
              "groupBy": Array [
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
            Object {
              "CreditScore": true,
              "Customer": true,
              "SomethingElse": true,
            }
        `);
        expect(myRequest.aggregateDefinition).toMatchInlineSnapshot(`
            Object {
              "aggregates": Array [
                Object {
                  "name": "CreditScore",
                  "operator": undefined,
                  "sourceProperty": "CreditScore",
                },
              ],
              "filter": Object {
                "expressions": Array [
                  Object {
                    "identifier": "CityName",
                    "literal": "'Waldorf'",
                    "operator": "eq",
                  },
                ],
              },
              "groupBy": Array [
                "Customer",
              ],
            }
        `);
    });
});
