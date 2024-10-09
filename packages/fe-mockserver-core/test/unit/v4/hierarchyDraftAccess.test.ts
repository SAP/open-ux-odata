import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

jest.setTimeout(3600000);
describe('Hierarchy with draft', () => {
    let dataAccess!: DataAccess;
    let dataAccess2!: DataAccess;
    let metadata!: ODataMetadata;
    let metadata2!: ODataMetadata;
    const baseUrl = '/Hierarchy';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);

    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'hierarchy');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'draftService.cds'));
        const edmx2 = await metadataProvider.loadMetadata(join(baseDir, 'otherDraftService.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        metadata2 = await ODataMetadata.parse(edmx2, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        dataAccess2 = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata2, fileLoader);
    });

    test('Request active instances only', async () => {
        // Create a draft for EMEA
        const draftCreateRequest = new ODataRequest(
            {
                method: 'POST',
                url: "/SalesOrganizations(ID='EMEA',IsActiveEntity=true)/v4treedraft.draftEdit?$select=HasActiveEntity,HasDraftEntity,ID,IsActiveEntity&$expand=DraftAdministrativeData($select=DraftIsCreatedByMe,DraftUUID,InProcessByUser)'"
            },
            dataAccess
        );
        await dataAccess.performAction(draftCreateRequest);

        // Request the hierarchy for all active instances
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations?$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(IsActiveEntity eq true),keep start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=2)&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10"
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
                            "identifier": "IsActiveEntity",
                            "literal": "true",
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
                "IsActiveEntity": true,
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);

        // Delete the draft instance
        const draftDeleteRequest = new ODataRequest(
            {
                method: 'DELETE',
                url: "/SalesOrganizations(ID='EMEA',IsActiveEntity=false)"
            },
            dataAccess
        );
        await dataAccess.deleteData(draftDeleteRequest);

        // Reload the hierarchy
        const dataAfterDelete = await dataAccess.getData(odataRequest);
        expect(dataAfterDelete).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 2,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "EMEA",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });

    test('Expand on sub-nodes', async () => {
        // Create a draft for Sales
        const draftCreateRequest = new ODataRequest(
            {
                method: 'POST',
                url: "/SalesOrganizations(ID='Sales',IsActiveEntity=true)/v4treedraft.draftEdit?$select=HasActiveEntity,HasDraftEntity,ID,IsActiveEntity&$expand=DraftAdministrativeData($select=DraftIsCreatedByMe,DraftUUID,InProcessByUser)'"
            },
            dataAccess
        );
        await dataAccess.performAction(draftCreateRequest);

        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: '/SalesOrganizations?$select=ID,DistanceFromRoot,DrillState,Name,IsActiveEntity,LimitedDescendantCount&$apply=ancestors($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(IsActiveEntity eq true),keep start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier=\'SalesOrgHierarchy\',NodeProperty=\'ID\',Levels=2,ExpandLevels=[{"NodeID":"EMEA","Levels":1}])&$count=true&$select=LimitedDescendantCount,DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10'
            },
            dataAccess
        );

        // Load hierarchy with subnodes expanded
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "Sales",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 3,
                "Name": "Corporate Sales",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "ID": "EMEA",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 1,
                "Name": "EMEA",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "ID": "EMEA Central",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "EMEA Central",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "collapsed",
                "ID": "US",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "Name": "US",
              },
            ]
        `);
    });

    test('Hierarchy of sub-objects', async () => {
        // Create a draft for US
        const draftCreateRequest = new ODataRequest(
            {
                method: 'POST',
                url: "/SalesOrganizations(ID='US',IsActiveEntity=true)/v4treedraft.draftEdit?$select=HasActiveEntity,HasDraftEntity,ID,IsActiveEntity&$expand=DraftAdministrativeData($select=DraftIsCreatedByMe,DraftUUID,InProcessByUser)'"
            },
            dataAccess
        );
        await dataAccess.performAction(draftCreateRequest);

        // Get the products hierarchy for 'US'
        const odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrganizations(ID='US',IsActiveEntity=false)/_Products?$select=ID,DistanceFromRoot,DrillState,Name,IsActiveEntity,LimitedDescendantCount&$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations(ID='US',IsActiveEntity=false)/_Products,HierarchyQualifier='ProductsHierarchy',NodeProperty='ID',Levels=2)&$skip=0&$top=10"
            },
            dataAccess
        );

        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "ID": "9",
                "IsActiveEntity": false,
                "LimitedDescendantCount": 2,
                "Name": "Beverages",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "91",
                "IsActiveEntity": false,
                "LimitedDescendantCount": 0,
                "Name": "Sodas",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "ID": "92",
                "IsActiveEntity": false,
                "LimitedDescendantCount": 0,
                "Name": "Juices",
              },
            ]
        `);
    });

    test('16 - Expand a node completely (OP)', async () => {
        const expandRequest = new ODataRequest(
            {
                method: 'GET',
                url: `/Organizations(ID='FUNC',IsActiveEntity=true)/_Nodes?$select=DistanceFromRoot,DrillState,HasActiveEntity,ID,IsActiveEntity,LimitedDescendantCount,employeeCount,name,nodeType&$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/Organizations(ID=%27FUNC%27,IsActiveEntity=true)/_Nodes,HierarchyQualifier=%27NodesHierarchy%27,NodeProperty=%27ID%27,Levels=1,ExpandLevels=%5B%7B"NodeID":"FUNC2","Levels":null%7D%5D)&$count=true&$skip=0&$top=206`
            },
            dataAccess2
        );
        const data = await dataAccess2.getData(expandRequest);
        // Expanding Sales
        expect(data).toMatchInlineSnapshot(`
            [
              {
                "DistanceFromRoot": 0,
                "DrillState": "expanded",
                "HasActiveEntity": true,
                "ID": "FUNC2",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 4,
                "employeeCount": 88,
                "name": "Sales",
                "nodeType": "Zone",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "leaf",
                "HasActiveEntity": true,
                "ID": "FUNC21",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "employeeCount": 61,
                "name": "Consumer goods",
                "nodeType": "Intermediary",
              },
              {
                "DistanceFromRoot": 1,
                "DrillState": "expanded",
                "HasActiveEntity": true,
                "ID": "FUNC22",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 2,
                "employeeCount": 27,
                "name": "Financial services",
                "nodeType": "Intermediary",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "HasActiveEntity": true,
                "ID": "FUNC221",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "employeeCount": 19,
                "name": "Bank",
                "nodeType": "Line",
              },
              {
                "DistanceFromRoot": 2,
                "DrillState": "leaf",
                "HasActiveEntity": true,
                "ID": "FUNC222",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "employeeCount": 8,
                "name": "Insurance",
                "nodeType": "Line",
              },
              {
                "DistanceFromRoot": 0,
                "DrillState": "collapsed",
                "HasActiveEntity": true,
                "ID": "FUNC1",
                "IsActiveEntity": true,
                "LimitedDescendantCount": 0,
                "employeeCount": 274,
                "name": "Operations",
                "nodeType": "Zone",
              },
            ]
        `);
    });
});
