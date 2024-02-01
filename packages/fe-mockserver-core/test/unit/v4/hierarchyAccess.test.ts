import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

jest.setTimeout(3600000);
describe('Hierarchy Access', () => {
    let dataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    const baseUrl = '/Hierarchy';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'hierarchy');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    test('1- Request first page of SalesOrganization tree expanded to two levels (including root)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
         `);
    });
    test('2- Request first page of children of node US which the user has expanded', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(ID eq 'US'),1)/orderby(Name)&$count=true&$select=DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'US'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": false,
                  "maximumDistance": 1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "descendants",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 2,
                "DrillState": "collapsed",
                "ID": "US East",
                "Name": "US East",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "US West",
                "Name": "US West",
              },
            ]
        `);
    });
    test('3- Re-display the first page sorted by Name', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=orderby(Name)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });
    test('1 - Filter/Order/Restrict', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(contains(Name,'East') or contains(Name,'Central')),keep start)/orderby(Name)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=DrillState,LimitedDescendantCount,DistanceFromRoot,Matched,MatchedDescendantCount,ID,Name&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'East'",
                              ],
                              "type": "method",
                            },
                          },
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'Central'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                        "operator": "OR",
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);

        expect(odataRequest.selectedProperties).toMatchInlineSnapshot(`
            {
              "DistanceFromRoot": true,
              "DrillState": true,
              "ID": true,
              "LimitedDescendantCount": true,
              "Matched": true,
              "MatchedDescendantCount": true,
              "Name": true,
            }
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "US",
              },
            ]
        `);
    });
    test('1a - Pattern: Filter/Expand/Order', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=
	ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(contains(Name,'East') or contains(Name,'Central')),
		keep start)
	/descendants(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(ID eq 'US'),
		1)
	/orderby(Name)
&$count=true
&$select=DrillState,Matched,MatchedDescendantCount,ID,Name
&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'East'",
                              ],
                              "type": "method",
                            },
                          },
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'Central'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                        "operator": "OR",
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'US'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": false,
                  "maximumDistance": 1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "descendants",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DrillState": "leaf",
                "ID": "US East",
                "Matched": true,
                "MatchedDescendantCount": 0,
                "Name": "US East",
              },
            ]
        `);
    });
    test('1b - Pattern: Filter/Order/Restrict+', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=
	ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(contains(Name,'New York') or contains(Name,'Central')),
		keep start)
	/orderby(Name)
	/com.sap.vocabularies.Hierarchy.v1.TopLevels(
		HierarchyNodes=$root/SalesOrganizations,
		HierarchyQualifier='SalesOrgHierarchy',
		NodeProperty='ID',
		Levels=3,
		Expand=['US East','NY'],
		Collapse=['EMEA'])
&$count=true
&$select=DrillState,LimitedDescendantCount,DistanceFromRoot,Matched,MatchedDescendantCount,ID,Name
&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'New York'",
                              ],
                              "type": "method",
                            },
                          },
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'Central'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                        "operator": "OR",
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "Collapse": [
                    "'EMEA'",
                  ],
                  "Expand": [
                    "'US East'",
                    "'NY'",
                  ],
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "3",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 5,
                "Matched": false,
                "MatchedDescendantCount": 3,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 3,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "expanded",
                "ID": "US East",
                "LimitedDescendantCount": 2,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US East",
              },
              {
                "DistanceFromRoot": 3,
                "DrillState": "expanded",
                "ID": "NY",
                "LimitedDescendantCount": 1,
                "Matched": true,
                "MatchedDescendantCount": 1,
                "Name": "New York State",
              },
              {
                "DistanceFromRoot": 4,
                "DrillState": "leaf",
                "ID": "NYC",
                "LimitedDescendantCount": 0,
                "Matched": true,
                "MatchedDescendantCount": 0,
                "Name": "New York City",
              },
            ]
        `);
    });
    test('1c - Pattern: Filter/Order/Restrict#', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',

                url: `/SalesOrganizations?$apply=
	ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(contains(Name,'New York') or contains(Name,'Central')),
		keep start)
	/orderby(Name)
	/com.sap.vocabularies.Hierarchy.v1.TopLevels(
		HierarchyNodes=$root/SalesOrganizations,
		HierarchyQualifier='SalesOrgHierarchy',
		NodeProperty='ID',
		Levels=2,
		Show=['NY'])
&$count=true
&$select=DrillState,LimitedDescendantCount,DistanceFromRoot,Matched,MatchedDescendantCount,MessageSeverity,MessageDescendantSeverity,MessageDescendantCount,ID,Name
&sap-skiplocation=SalesOrganization('NY')&sap-skipcontext=3&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'New York'",
                              ],
                              "type": "method",
                            },
                          },
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'Central'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                        "operator": "OR",
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                  "Show": [
                    "'NY'",
                  ],
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 2,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "expanded",
                "ID": "US East",
                "LimitedDescendantCount": 1,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US East",
              },
              {
                "DistanceFromRoot": 3,
                "DrillState": "collapsed",
                "ID": "NY",
                "LimitedDescendantCount": 0,
                "Matched": true,
                "MatchedDescendantCount": 1,
                "Name": "New York State",
              },
            ]
        `);
    });

    test('1d - Filter+/Order/Restrict', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=
	ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		descendants(
			$root/SalesOrganizations,
			SalesOrgHierarchy,
			ID,
			filter(contains(Name,'East') or contains(Name,'Central')),
			keep start),
		keep start)
	/orderby(Name)
	/com.sap.vocabularies.Hierarchy.v1.TopLevels(
		HierarchyNodes=$root/SalesOrganizations,
		HierarchyQualifier='SalesOrgHierarchy',
		NodeProperty='ID',
		Levels=3)
&$count=true
&$select=DrillState,LimitedDescendantCount,DistanceFromRoot,Matched,MatchedDescendantCount,ID,Name
&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "parameters": {
                        "hierarchyRoot": "$root/SalesOrganizations",
                        "inputSetTransformations": [
                          {
                            "filterExpr": {
                              "expressions": [
                                {
                                  "identifier": {
                                    "method": "contains",
                                    "methodArgs": [
                                      "Name",
                                      "'East'",
                                    ],
                                    "type": "method",
                                  },
                                },
                                {
                                  "identifier": {
                                    "method": "contains",
                                    "methodArgs": [
                                      "Name",
                                      "'Central'",
                                    ],
                                    "type": "method",
                                  },
                                },
                              ],
                              "operator": "OR",
                            },
                            "type": "filter",
                          },
                        ],
                        "keepStart": true,
                        "maximumDistance": -1,
                        "propertyPath": "ID",
                        "qualifier": "SalesOrgHierarchy",
                      },
                      "type": "descendants",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "3",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 4,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "EMEA",
                "LimitedDescendantCount": 1,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "EMEA Central",
                "LimitedDescendantCount": 0,
                "Matched": true,
                "MatchedDescendantCount": 0,
                "Name": "EMEA Central",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 1,
                "Matched": false,
                "MatchedDescendantCount": 1,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "US East",
                "LimitedDescendantCount": 0,
                "Matched": true,
                "MatchedDescendantCount": 0,
                "Name": "US East",
              },
            ]
        `);
    });

    test('2 - Pattern: Sub/Filter/Order/Restrict', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=
	descendants(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(ID eq 'US'),
		keep start)
	/ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(contains(Name,'New York')),
		keep start)
	/orderby(Name)
	/com.sap.vocabularies.Hierarchy.v1.TopLevels(
		HierarchyNodes=$root/SalesOrganizations,
		HierarchyQualifier='SalesOrgHierarchy',
		NodeProperty='ID',
		Levels=2)
&$count=true
&$select=DrillState,LimitedDescendantCount,DistanceFromRoot,Matched,MatchedDescendantCount,ID,Name
&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'US'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "descendants",
              },
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'New York'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 1,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US East",
                "LimitedDescendantCount": 0,
                "Matched": false,
                "MatchedDescendantCount": 2,
                "Name": "US East",
              },
            ]
        `);
    });
    test('2a - Pattern: Sub/Filter/Expand/Order', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=
	descendants(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(ID eq 'US'),
		keep start)
	/ancestors(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(contains(Name,'New York')),
		keep start)
	/descendants(
		$root/SalesOrganizations,
		SalesOrgHierarchy,
		ID,
		filter(ID eq 'US East'),
		1)
	/orderby(Name)
&$count=true
&$select=DrillState,Matched,MatchedDescendantCount,ID,Name
&$skip=0&$top=10`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'US'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "descendants",
              },
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": {
                              "method": "contains",
                              "methodArgs": [
                                "Name",
                                "'New York'",
                              ],
                              "type": "method",
                            },
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'US East'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": false,
                  "maximumDistance": 1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "descendants",
              },
              {
                "orderBy": [
                  {
                    "direction": "asc",
                    "name": "Name",
                  },
                ],
                "type": "orderBy",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DrillState": "collapsed",
                "ID": "NY",
                "Matched": true,
                "MatchedDescendantCount": 1,
                "Name": "New York State",
              },
            ]
        `);
    });

    test('4a- Search (not showing result)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,search(%22East%22),keep%20start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "searchExpr": [
                        "East",
                      ],
                      "type": "search",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 1,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });

    test('4b- Search (showing result)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,search(%22Corporate%22),keep%20start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=10"
            },
            dataAccess
        );

        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "inputSetTransformations": [
                    {
                      "searchExpr": [
                        "Corporate",
                      ],
                      "type": "search",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
                "type": "ancestors",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);

        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
                      [
                        {
                          "DistanceFromRoot": 0,
                          "DrillState": "leaf",
                          "ID": "Sales",
                          "LimitedDescendantCount": 0,
                          "Name": "Corporate Sales",
                        },
                      ]
              `);
    });

    test('4c- Another search (showing result)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,search(%22West%22),keep%20start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=99)&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=10"
            },
            dataAccess
        );

        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
                      [
                        {
                          "parameters": {
                            "hierarchyRoot": "$root/SalesOrganizations",
                            "inputSetTransformations": [
                              {
                                "searchExpr": [
                                  "West",
                                ],
                                "type": "search",
                              },
                            ],
                            "keepStart": true,
                            "maximumDistance": -1,
                            "propertyPath": "ID",
                            "qualifier": "SalesOrgHierarchy",
                          },
                          "type": "ancestors",
                        },
                        {
                          "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                          "parameters": {
                            "HierarchyNodes": "$root/SalesOrganizations",
                            "HierarchyQualifier": "'SalesOrgHierarchy'",
                            "Levels": "99",
                            "NodeProperty": "'ID'",
                          },
                          "type": "customFunction",
                        },
                      ]
              `);

        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
                    [
                      {
                        "DistanceFromRoot": 0,
                        "DrillState": "expanded",
                        "ID": "Sales",
                        "LimitedDescendantCount": 2,
                        "Name": "Corporate Sales",
                      },
                      {
                        "DistanceFromRoot": 1,
                        "DrillState": "expanded",
                        "ID": "US",
                        "LimitedDescendantCount": 1,
                        "Name": "US",
                      },
                      {
                        "DistanceFromRoot": 2,
                        "DrillState": "leaf",
                        "ID": "US West",
                        "LimitedDescendantCount": 0,
                        "Name": "US West",
                      },
                    ]
              `);
    });

    test('5- Hierarchy in Object Page - Product hierarchy expanded to two levels (including root)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations('Sales')/_Products?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations('Sales')/_Products,HierarchyQualifier='ProductsHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "2",
                "LimitedDescendantCount": 3,
                "Name": "Wines",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "20",
                "LimitedDescendantCount": 0,
                "Name": "Red wine",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "21",
                "LimitedDescendantCount": 0,
                "Name": "White wine",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "22",
                "LimitedDescendantCount": 0,
                "Name": "Sparkling wines",
              },
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "1",
                "LimitedDescendantCount": 2,
                "Name": "Waters",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "10",
                "LimitedDescendantCount": 0,
                "Name": "Still water",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "11",
                "LimitedDescendantCount": 0,
                "Name": "Sparkling water",
              },
            ]
        `);
    });

    test('6- Hierarchy in Object Page - Expand a node', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations('Sales')/_Products?$apply=descendants($root/SalesOrganizations('Sales')/_Products,ProductsHierarchy,ID,filter(ID%20eq%20'2'),1)&$select=DrillState,ID,Name&$count=true&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations('Sales')/_Products",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "identifier": "ID",
                            "literal": "'2'",
                            "operator": "eq",
                          },
                        ],
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": false,
                  "maximumDistance": 1,
                  "propertyPath": "ID",
                  "qualifier": "ProductsHierarchy",
                },
                "type": "descendants",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
                      [
                        {
                          "DrillState": "leaf",
                          "ID": "20",
                          "Name": "Red wine",
                        },
                        {
                          "DrillState": "leaf",
                          "ID": "21",
                          "Name": "White wine",
                        },
                        {
                          "DrillState": "collapsed",
                          "ID": "22",
                          "Name": "Sparkling wines",
                        },
                      ]
              `);
    });

    it('7 - Hierarchy in LR, sort in desc order', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=orderby(ID%20desc)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=76"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "orderBy": [
                  {
                    "direction": "desc",
                    "name": "ID",
                  },
                ],
                "type": "orderBy",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
            ]
        `);
    });

    it('8 - Expand all should work ', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID')&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=47`
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 7,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "EMEA",
                "LimitedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "EMEA Central",
                "LimitedDescendantCount": 0,
                "Name": "EMEA Central",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 4,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "US West",
                "LimitedDescendantCount": 0,
                "Name": "US West",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "expanded",
                "ID": "US East",
                "LimitedDescendantCount": 2,
                "Name": "US East",
              },
              {
                "DistanceFromRoot": 3,
                "DrillState": "expanded",
                "ID": "NY",
                "LimitedDescendantCount": 1,
                "Name": "New York State",
              },
              {
                "DistanceFromRoot": 4,
                "DrillState": "leaf",
                "ID": "NYC",
                "LimitedDescendantCount": 0,
                "Name": "New York City",
              },
            ]
        `);
    });
    test('9 - Create new root and a child', async () => {
        const createRequest = new ODataRequest(
            {
                method: 'POST',
                url: '/SalesOrganizations',
                tenantId: 'createRoot'
            },
            dataAccess
        );
        await dataAccess.createData(createRequest, {
            ID: 'NZL',
            Name: 'NZL'
        });
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10",
                tenantId: 'createRoot'
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "leaf",
                "ID": "NZL",
                "LimitedDescendantCount": 0,
                "Name": "NZL",
              },
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);

        await dataAccess.createData(createRequest, {
            ID: 'NZL_C',
            Name: 'NZL_C',
            'Superordinate@odata.bind': "SalesOrganizations('NZL')"
        });
        const odataRequest2 = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10",
                tenantId: 'createRoot'
            },
            dataAccess
        );
        const data2 = await dataAccess.getData(odataRequest2);
        expect(data2).toMatchInlineSnapshot(`
                      [
                        {
                          "DistanceFromRoot": 0,
                          "DrillState": "expanded",
                          "ID": "NZL",
                          "LimitedDescendantCount": 1,
                          "Name": "NZL",
                        },
                        {
                          "DistanceFromRoot": 1,
                          "DrillState": "leaf",
                          "ID": "NZL_C",
                          "LimitedDescendantCount": 0,
                          "Name": "NZL_C",
                        },
                        {
                          "DistanceFromRoot": 0,
                          "DrillState": "expanded",
                          "ID": "Sales",
                          "LimitedDescendantCount": 2,
                          "Name": "Corporate Sales",
                        },
                        {
                          "DistanceFromRoot": 1,
                          "DrillState": "collapsed",
                          "ID": "EMEA",
                          "LimitedDescendantCount": 0,
                          "Name": "EMEA",
                        },
                        {
                          "DistanceFromRoot": 1,
                          "DrillState": "collapsed",
                          "ID": "US",
                          "LimitedDescendantCount": 0,
                          "Name": "US",
                        },
                      ]
              `);
    });
    test('10 - Create new child node of existing node', async () => {
        const createRequest = new ODataRequest(
            {
                method: 'POST',
                url: '/SalesOrganizations'
            },
            dataAccess
        );
        const createData = await dataAccess.createData(createRequest, {
            ID: 'APJ',
            Name: 'APJ',
            'Superordinate@odata.bind': "SalesOrganizations('Sales')"
        });
        expect(createData).toMatchInlineSnapshot(`
            {
              "DistanceFromRoot": 0,
              "DrillState": "",
              "ID": "APJ",
              "LimitedDescendantCount": 0,
              "Matched": false,
              "MatchedDescendantCount": 0,
              "Name": "APJ",
              "Parent": "Sales",
            }
        `);
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
                "type": "customFunction",
              },
            ]
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 3,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "APJ",
                "LimitedDescendantCount": 0,
                "Name": "APJ",
              },
            ]
        `);
    });
    test('11 - Delete a node', async () => {
        // DELETE Artists(ArtistID='42',IsActiveEntity=false)
        const createRequest = new ODataRequest(
            {
                method: 'DELETE',
                url: `/SalesOrganizations('EMEA')`,
                tenantId: 'delete'
            },
            dataAccess
        );
        await dataAccess.deleteData(createRequest);
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10",
                tenantId: 'delete'
            },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 1,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });
    test('12 - Turn a child into a root', async () => {
        const updateRequest = new ODataRequest(
            {
                method: 'PATCH',
                url: `/SalesOrganizations('NY')`,
                tenantId: 'update2'
            },
            dataAccess
        );
        await dataAccess.updateData(updateRequest, {
            'Superordinate@odata.bind': null
        });
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10",
                tenantId: 'update2'
            },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "NY",
                "LimitedDescendantCount": 1,
                "Name": "New York State",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "NYC",
                "LimitedDescendantCount": 0,
                "Name": "New York City",
              },
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });
    test('13 - Move a node to a different parent', async () => {
        const createRequest = new ODataRequest(
            {
                method: 'PATCH',
                url: `/SalesOrganizations('NY')`,
                tenantId: 'update'
            },
            dataAccess
        );
        await dataAccess.updateData(createRequest, {
            'Superordinate@odata.bind': "SalesOrganizations('US West')"
        });
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=999)&$select=DistanceFromRoot,DrillState,ID,LimitedDescendantCount,Name&$count=true&$skip=0&$top=47`,
                tenantId: 'update'
            },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "LimitedDescendantCount": 7,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "EMEA",
                "LimitedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "EMEA Central",
                "LimitedDescendantCount": 0,
                "Name": "EMEA Central",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "US",
                "LimitedDescendantCount": 4,
                "Name": "US",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "expanded",
                "ID": "US West",
                "LimitedDescendantCount": 2,
                "Name": "US West",
              },
              {
                "DistanceFromRoot": 3,
                "DrillState": "expanded",
                "ID": "NY",
                "LimitedDescendantCount": 1,
                "Name": "New York State",
              },
              {
                "DistanceFromRoot": 4,
                "DrillState": "leaf",
                "ID": "NYC",
                "LimitedDescendantCount": 0,
                "Name": "New York City",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "US East",
                "LimitedDescendantCount": 0,
                "Name": "US East",
              },
            ]
        `);
    });

    test('Query with multiple keys', () => {
        const q =
            "NumberSchemeVersion(NumberingSchemeVersionUUID=877969d8-1456-5cfb-ad4b-ff094b96fa3a,IsActiveEntity=false)/_Result?sap-client=601&$select=HasActiveEntity,IsActiveEntity,NumberingSchemeVersionUUID,TradeClassificationNumber,TrdClassfctnNmbrOfclDesc,TrdClassfctnNumberIsEndline,TrdClassfctnNumberType,TrdClassfctnNumberUUID,TrdClfnNumberValidityEndDate,TrdClfnNumberValidtyStartDate,__EntityControl/Deletable,__EntityControl/Updatable,__FieldControl/TrdClfnNumberValidtyStartDate,__HierarchyPropertiesForI_ITMTrdClfnNumberHierarchy/DrillState,__HierarchyPropertiesForI_ITMTrdClfnNumberHierarchy/NodeId,__OperationControl/ReplaceContent,__OperationControl/UpdateContent&$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/NumberSchemeVersion(NumberingSchemeVersionUUID=877969d8-1456-5cfb-ad4b-ff094b96fa3a,IsActiveEntity=false)/_Result,HierarchyQualifier='I_ITMTrdClfnNumberHierarchy',NodeProperty='__HierarchyPropertiesForI_ITMTrdClfnNumberHierarchy/NodeId',Levels=1)&$count=true&$skip=0&$top=55";
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: q
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/NumberSchemeVersion(NumberingSchemeVersionUUID=877969d8-1456-5cfb-ad4b-ff094b96fa3a,IsActiveEntity=false)/_Result",
                  "HierarchyQualifier": "'I_ITMTrdClfnNumberHierarchy'",
                  "Levels": "1",
                  "NodeProperty": "'__HierarchyPropertiesForI_ITMTrdClfnNumberHierarchy/NodeId'",
                },
                "type": "customFunction",
              },
            ]
        `);
    });
    test('apply queries', () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url:
                    '/SalesOrganizations?$apply=ancestors(' +
                    '$root/PurchaseRequisitionItem,' +
                    'I_PPS_ProcPurReqnItemHNRltn,__HierarchyPropertiesForI_PPS_ProcPurReqnItemHNRltn/NodeId,' +
                    "filter((PPSLoggedInUsrIsRespPurr%20eq%20true)%20and%20(PPSPurReqnItemCompletionStatus%20eq%20'0')),keep%20start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/PurchaseRequisitionItem,HierarchyQualifier='I_PPS_ProcPurReqnItemHNRltn',NodeProperty='__HierarchyPropertiesForI_PPS_ProcPurReqnItemHNRltn/NodeId',Levels=1)"
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "parameters": {
                  "hierarchyRoot": "$root/PurchaseRequisitionItem",
                  "inputSetTransformations": [
                    {
                      "filterExpr": {
                        "expressions": [
                          {
                            "expressions": [
                              {
                                "identifier": "PPSLoggedInUsrIsRespPurr",
                                "literal": "true",
                                "operator": "eq",
                              },
                            ],
                            "isGroup": true,
                            "isReversed": false,
                            "operator": undefined,
                          },
                          {
                            "identifier": "PPSPurReqnItemCompletionStatus",
                            "literal": "'0'",
                            "operator": "eq",
                          },
                        ],
                        "operator": "AND",
                      },
                      "type": "filter",
                    },
                  ],
                  "keepStart": true,
                  "maximumDistance": -1,
                  "propertyPath": "__HierarchyPropertiesForI_PPS_ProcPurReqnItemHNRltn/NodeId",
                  "qualifier": "I_PPS_ProcPurReqnItemHNRltn",
                },
                "type": "ancestors",
              },
              {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/PurchaseRequisitionItem",
                  "HierarchyQualifier": "'I_PPS_ProcPurReqnItemHNRltn'",
                  "Levels": "1",
                  "NodeProperty": "'__HierarchyPropertiesForI_PPS_ProcPurReqnItemHNRltn/NodeId'",
                },
                "type": "customFunction",
              },
            ]
        `);
    });

    test('more apply queries', () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/RiskSettingsService/LevelCorrelation?entitySet=LevelCorrelation&$apply=filter(IsActiveEntity%20eq%20true)/groupby((impactLevelUpperValue,impactLevel_ID,probabilityLevelUpperValue,probabilityLevel_ID),aggregate(nullProperty%20with%20min%20as%20nullMeasure))'
            },
            dataAccess
        );
        expect(odataRequest.applyDefinition).toMatchInlineSnapshot(`
            [
              {
                "filterExpr": {
                  "expressions": [
                    {
                      "identifier": "IsActiveEntity",
                      "literal": "true",
                      "operator": "eq",
                    },
                  ],
                },
                "type": "filter",
              },
              {
                "groupBy": [
                  "impactLevelUpperValue",
                  "impactLevel_ID",
                  "probabilityLevelUpperValue",
                  "probabilityLevel_ID",
                ],
                "subTransformations": [
                  {
                    "aggregateDef": [
                      {
                        "name": "nullMeasure",
                        "operator": "min",
                        "sourceProperty": "nullProperty",
                      },
                    ],
                    "type": "aggregates",
                  },
                ],
                "type": "groupBy",
              },
            ]
        `);
    });
});
