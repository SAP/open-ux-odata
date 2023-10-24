import finalHandler from 'finalhandler';
import * as fs from 'fs';
import type { Server } from 'http';
import * as http from 'http';
import * as path from 'path';
import FEMockserver from '../../src';
import { ODataV4Requestor } from './__testData/Requestor';

jest.setTimeout(60000);

describe('V4 Requestor', function () {
    let server: Server;
    beforeAll(async function () {
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/action',
                    watch: true
                },
                {
                    metadataPath: path.join(__dirname, '__testData', 'service2.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/action/debug',
                    debug: true,
                    watch: true
                }
            ],
            annotations: [
                {
                    urlPath: '/sap/fe/core/mock/MyAnnotation.xml',
                    localPath: path.join(__dirname, '__testData', 'annotation.xml')
                },
                {
                    urlPath: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*',
                    localPath: path.join(__dirname, '__testData', 'annotation.xml')
                },
                {
                    urlPath: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(Yolo="duress")/$Value',
                    localPath: path.join(__dirname, '__testData', 'annotation.xml')
                }
            ],
            contextBasedIsolation: true,
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds',
                options: {}
            }
        });
        await mockServer.isReady;
        server = http.createServer(function onRequest(req, res) {
            mockServer.getRouter()(req, res, finalHandler(req, res));
        });
        server.listen(33331);
    });
    afterAll((done) => {
        server.close(done);
    });

    it('can get the XSRF token using HEAD', async () => {
        const dataRes = await fetch('http://localhost:33331/sap/fe/core/mock/action', {
            method: 'HEAD',
            headers: new Headers({
                'X-CSRF-Token': 'Fetch'
            })
        });
        expect(dataRes.headers.get('X-CSRF-Token')).toBe('0504-71383');
    });

    it('can get the XSRF token using GET', async () => {
        const dataRes = await fetch('http://localhost:33331/sap/fe/core/mock/action', {
            method: 'GET',
            headers: new Headers({
                'X-CSRF-Token': 'Fetch'
            })
        });
        expect(dataRes.headers.get('X-CSRF-Token')).toBe('0504-71383');
    });

    it('can get some data', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getList<any>('RootElement').execute();
        expect(dataRes.length).toBe(4);
        const dataRes2 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(4);
    });
    it('can execute an action without return type', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor
            .callAction(
                '/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.boundActionReturnsVoid',
                {}
            )
            .execute('POST');
        expect(dataRes).toMatchInlineSnapshot(`""`);
    });
    it('can execute a function', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor
            .callGETAction(
                "/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.baseFunction(data='I am data')"
            )
            .execute('GET');
        expect(dataRes).toMatchInlineSnapshot(`"I am data"`);
        const dataResStrict = dataRequestor.callGETAction(
            "/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.baseFunction(data='I am data')"
        );
        dataResStrict.headers['Prefer'] = 'handling=strict';
        const strictResult = await dataResStrict.execute('GET');
        expect(strictResult).toMatchInlineSnapshot(`"STRICT :: I am data"`);
        const dataRes2 = await dataRequestor
            .callGETAction('/RootElement(ID=1,IsActiveEntity=true)/_Elements')
            .execute('GET');
        expect(dataRes2).toMatchInlineSnapshot(`
            {
              "@odata.context": "$metadata#RootElement(ID=1,IsActiveEntity=true)/_Elements",
              "@odata.count": 3,
              "@odata.metadataEtag": "W/"606c-jGYf/2yxvlcG7Z+VRm6krl+f58U"",
              "value": [
                {
                  "HasActiveEntity": true,
                  "HasDraftEntity": false,
                  "ID": 1,
                  "IsActiveEntity": true,
                  "SubProp1": "First Prop for 1-1",
                  "SubProp2": "Second Prop for 1-1",
                  "isBoundAction3Hidden": false,
                  "isBoundAction4Hidden": false,
                  "owner_ID": 1,
                  "sibling_ID": 2,
                },
                {
                  "HasActiveEntity": true,
                  "HasDraftEntity": false,
                  "ID": 2,
                  "IsActiveEntity": true,
                  "SubProp1": "First Prop for 1-2",
                  "SubProp2": "Second Prop for 1-2",
                  "isBoundAction3Hidden": true,
                  "isBoundAction4Hidden": true,
                  "owner_ID": 1,
                  "sibling_ID": 1,
                },
                {
                  "HasActiveEntity": true,
                  "HasDraftEntity": false,
                  "ID": 3,
                  "IsActiveEntity": true,
                  "SubProp1": "First Prop for 1-3",
                  "SubProp2": "Second Prop for 1-3",
                  "isBoundAction3Hidden": false,
                  "isBoundAction4Hidden": false,
                  "owner_ID": 1,
                  "sibling_ID": 3,
                },
              ],
            }
        `);
    });
    it('can get the metadata', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getMetadata().execute();
        expect(dataRes).toMatchSnapshot();
    });
    it('can get the root', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getRoot().execute();
        expect(dataRes).toMatchSnapshot();
    });
    it('can get the serviceCatalog', async () => {
        const output = await fetch('http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection');
        const textResponse = await output.text();
        expect(textResponse).toMatchSnapshot();
        const output2 = await fetch(
            'http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection(Yolo)'
        );
        const textResponse2 = await output2.text();
        expect(textResponse2).toMatchSnapshot();
    });
    it('can get the annotation file', async () => {
        const output = await fetch('http://localhost:33331/sap/fe/core/mock/MyAnnotation.xml');
        const textResponse = await output.text();
        expect(textResponse).toMatchSnapshot();
    });

    it('can get the other annotation file', async () => {
        const output = await fetch('http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*');
        const textResponse = await output.text();
        expect(textResponse).toMatchSnapshot();
    });
    it('can get the other annotation file with a more complex regexp', async () => {
        const output = await fetch(
            'http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(Yolo="duress")/$Value'
        );
        const textResponse = await output.text();
        expect(textResponse).toMatchSnapshot();
    });

    it('can reload the data', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.reloadData().execute('POST');
        expect(dataRes).toMatchSnapshot();
    });
    it('can get some data through a batch call', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes.length).toBe(4);
    });

    it('can count data through a batch call', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getCount<any>('RootElement').executeAsBatch();
        expect(dataRes).toBe(4);
    });

    it('can get some data through a batch call with changeset', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getList<any>('RootElement').executeAsBatch(true);
        expect(dataRes.length).toBe(4);
    });
    it('get one data', async () => {
        // const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        // const dataRes = await dataRequestor.createData<any>('/RootElement', { ID: 555 }).execute('POST');
        // expect(dataRes).toMatchSnapshot();
        let dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        let dataRes = await dataRequestor.getObject<any>('RootElement', { ID: 2 }).executeAsBatch();
        expect(dataRes).toMatchSnapshot();

        dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        dataRes = await dataRequestor.getObject<any>('RootElement', { ID: 233 }).executeAsBatch();
        expect(dataRes).toMatchSnapshot();

        dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-003/sap/fe/core/mock/action');
        dataRes = await dataRequestor.getObject<any>('RootElement', { ID: 2 }).executeAsBatch();
        expect(dataRes).toMatchSnapshot();
        dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataResClient = await dataRequestor
            .getObject<any>('RootElement', { ID: 2 })
            .executeAsBatch(false, '?sap-client=003');
        expect(dataResClient).toEqual(dataRes);
    });

    it('can create data through a call', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.createData<any>('RootElement', { ID: 555 }).executeAsBatch();
        delete dataRes.DraftAdministrativeData;
        expect(dataRes).toMatchSnapshot();

        const dataRes2 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(5);
        expect(dataRes2[4].ID).toBe(555);
        expect(dataRes2[4].Prop1).toBe('');

        const dataRequestor3 = new ODataV4Requestor('http://localhost:33331/tenant-008/sap/fe/core/mock/action');
        const dataRes3 = await dataRequestor.createData<any>('/RootElement', { ID: 666 }).execute('POST');
        delete dataRes3.DraftAdministrativeData;
        expect(dataRes3).toMatchSnapshot();

        const dataRes4 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes4.length).toBe(6);
        expect(dataRes4[5].ID).toBe(666);
        expect(dataRes4[5].Prop1).toBe('');
        // const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        // const dataRes = await dataRequestor.createData<any>('/RootElement', { ID: 556 }).executeAsBatch(true);
        // expect(dataRes).toMatchSnapshot();
    });
    it('can fail to create data through a call', async () => {
        // const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        // const dataRes = await dataRequestor.createData<any>('/RootElement', { ID: 555 }).execute('POST');
        // expect(dataRes).toMatchSnapshot();
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.createData<any>('IDONTEXIST', { ID: 555 }).executeAsBatch();
        delete dataRes.DraftAdministrativeData;
        expect(dataRes).toMatchSnapshot();
    });
    it('can update data through a call', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-001/sap/fe/core/mock/action');
        let dataRes = await dataRequestor.createData<any>('RootElement', { ID: 556 }).execute('POST');
        delete dataRes.DraftAdministrativeData;
        expect(dataRes).toMatchSnapshot();
        dataRes = await dataRequestor.updateData<any>('RootElement(ID=556)', { Prop1: 'MyNewProp1' }).execute('PATCH');
        delete dataRes.DraftAdministrativeData;
        expect(dataRes).toMatchSnapshot();
        const dataRes2 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(5);
        expect(dataRes2[4].ID).toBe(556);
        expect(dataRes2[4].Prop1).toBe('MyNewProp1');
        const res = await dataRequestor
            .updateData<any>('RootElement(ID=557)', { Prop1: 'MyNewProp1' })
            .execute('PATCH');
        delete res.DraftAdministrativeData;
        expect(res).toMatchSnapshot();

        // Deep update
        const res2 = await dataRequestor.updateData<any>('RootElement(ID=556)/Prop1', 'Lali-ho', true).execute('PUT');
        delete res2.DraftAdministrativeData;
        expect(res2).toMatchSnapshot();
        const dataRes3 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes3.length).toBe(5);
        expect(dataRes3[4].ID).toBe(556);
        expect(dataRes3[4].Prop1).toBe('Lali-ho');
    });
    it('can get updated the sticky header timeout', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.reloadStickyHeader('RootElement', 'myHeader').execute('HEAD');
        expect(dataRes).toMatchSnapshot();
    });
    it('can get updated the sticky header timeout for a tenant', async () => {
        const dataRes = await fetch('http://localhost:33331/tenant-112/sap/fe/core/mock/action/Something', {
            method: 'HEAD',
            headers: new Headers({
                'sap-contextid': 'myHeader'
            })
        });
        expect(dataRes.headers.get('sap-tenantid')).toEqual('tenant-112');
        expect(dataRes.headers.get('sap-contextid')).toEqual('');
    });
    it('does not fail if query properties cannot be parsed', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');

        // /RootElement?$expand=_Elements($select=ID)) --> too many closing parentheses!
        const dataReq = dataRequestor.getList<any>('RootElement');
        dataReq.expand({ _Elements: { select: ['ID)'] } });

        const response = await dataReq.execute();
        expect(response).toMatchInlineSnapshot(`"Too many closing parentheses: _Elements($select=ID))"`);
    });
    it('can get some data after changing the watch mode', async () => {
        let dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        let dataRes = await dataRequestor.getList<any>('RootElement').execute();
        expect(dataRes.length).toBe(4);
        expect(dataRes[0].Prop1).toBe('First Prop');
        const myJSON = JSON.parse(
            fs.readFileSync(path.join(__dirname, '__testData', 'RootElement.json')).toString('utf-8')
        );
        myJSON[0].Prop1 = 'SomethingElse';
        fs.writeFileSync(path.join(__dirname, '__testData', 'RootElement.json'), JSON.stringify(myJSON, null, 4));
        let resolveFn: Function;
        const myPromise = new Promise((resolve) => {
            resolveFn = resolve;
        });
        setTimeout(async function () {
            dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
            dataRes = await dataRequestor.getList<any>('RootElement').execute();
            expect(dataRes.length).toBe(4);
            expect(dataRes[0].Prop1).toBe('SomethingElse');
            resolveFn();
        }, 1000);
        return myPromise;
    });
    beforeAll(() => {
        const myJSON = JSON.parse(
            fs.readFileSync(path.join(__dirname, '__testData', 'RootElement.json')).toString('utf-8')
        );
        myJSON[0].Prop1 = 'First Prop';
        fs.writeFileSync(path.join(__dirname, '__testData', 'RootElement.json'), JSON.stringify(myJSON, null, 4));
    });
    afterAll(() => {
        const myJSON = JSON.parse(
            fs.readFileSync(path.join(__dirname, '__testData', 'RootElement.json')).toString('utf-8')
        );
        myJSON[0].Prop1 = 'First Prop';
        fs.writeFileSync(path.join(__dirname, '__testData', 'RootElement.json'), JSON.stringify(myJSON, null, 4));
    });
});
