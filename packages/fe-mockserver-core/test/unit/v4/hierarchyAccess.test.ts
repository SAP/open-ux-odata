import { readFileSync } from 'fs';
import { join } from 'path';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import type { ServiceConfig } from '../../../src';
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
    test(' Request first page of SalesOrganization tree expanded to two levels (including root)', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.aggregateDefinition).toMatchInlineSnapshot(`
            {
              "aggregates": [],
              "customFunction": {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
              },
              "filter": undefined,
              "groupBy": [],
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
    it('Request first page of children of node US which the user has expanded', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(ID eq 'US'),1)/orderby(Name)&$count=true&$select=DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.aggregateDefinition).toMatchInlineSnapshot(`
            {
              "aggregates": [],
              "customFunction": {
                "name": "descendants",
                "parameters": {
                  "hierarchyRoot": "$root/SalesOrganizations",
                  "maximumDistance": 1,
                  "propertyPath": "ID",
                  "qualifier": "SalesOrgHierarchy",
                },
              },
              "filter": {
                "expressions": [
                  {
                    "identifier": "ID",
                    "literal": "'US'",
                    "operator": "eq",
                  },
                ],
              },
              "groupBy": [],
              "orderBy": [
                {
                  "direction": "asc",
                  "name": "Name",
                },
              ],
            }
        `);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "US West",
                "Name": "US West",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "collapsed",
                "ID": "US East",
                "Name": "US East",
              },
            ]
        `);
    });
    test(' Re-display the first page sorted by Name', async () => {
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=orderby(Name)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
            },
            dataAccess
        );
        expect(odataRequest.aggregateDefinition).toMatchInlineSnapshot(`
            {
              "aggregates": [],
              "customFunction": {
                "name": "com.sap.vocabularies.Hierarchy.v1.TopLevels",
                "parameters": {
                  "HierarchyNodes": "$root/SalesOrganizations",
                  "HierarchyQualifier": "'SalesOrgHierarchy'",
                  "Levels": "2",
                  "NodeProperty": "'ID'",
                },
              },
              "filter": undefined,
              "groupBy": [],
              "orderBy": [
                {
                  "direction": "asc",
                  "name": "Name",
                },
              ],
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
});
