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
});
