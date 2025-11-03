import finalHandler from 'finalhandler';
import * as fs from 'fs';
import type { Server } from 'http';
import * as http from 'http';
import * as path from 'path';
import FEMockserver, { type MockserverConfiguration } from '../../src';
import FileSystemLoader from '../../src/plugins/fileSystemLoader';
import { getJsonFromMultipartContent, getStatusAndHeadersFromMultipartContent } from '../../test/unit/__testData/utils';
import { ODataV4Requestor } from './__testData/Requestor';

jest.setTimeout(60000);

describe('V4 Requestor', function () {
    let server: Server;
    let pluginLoadSpy: jest.SpyInstance<Promise<any>, [filePath: string]>;
    beforeAll(async function () {
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/action',
                    watch: true,
                    validateETag: true
                },
                {
                    metadataPath: path.join(__dirname, '__testData', 'service2.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/action/debug',
                    debug: true,
                    watch: true
                },
                {
                    metadataPath: path.join(__dirname, '__testData', 'service-sticky.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/sticky',
                    watch: true,
                    generateMockData: false
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
            plugins: [path.resolve(__dirname, './plugins/fake-plugin')],
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
        const dataRes = await dataRequestor.getList<any>('/RootElement').execute();
        expect(dataRes.body.length).toBe(4);
        const dataRes2 = await dataRequestor.getList<any>('/RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(4);
        const dataRes3 = await dataRequestor.getList<any>('/RootElement').executeAsJsonBatch();
        expect(dataRes3.length).toBe(4);
    });
    it('can get some data from the plugin', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/plugin');
        const dataRes = await dataRequestor.getList<any>('/RootElement').execute();
        expect(dataRes.body.length).toBe(4);
        const dataRes2 = await dataRequestor.getList<any>('/RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(4);
        const dataRes3 = await dataRequestor.getList<any>('/RootElement').executeAsJsonBatch();
        expect(dataRes3.length).toBe(4);
    });
    it('can execute an action without return type', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor
            .callAction(
                '/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.boundActionReturnsVoid',
                {}
            )
            .execute();
        expect(dataRes.body).toMatchInlineSnapshot(`""`);
    });
    it('can execute a function', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor
            .callGETAction(
                "/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.baseFunction(data='I am data')"
            )
            .execute();
        expect(dataRes.body).toMatchInlineSnapshot(`"I am data"`);
        const dataResStrict = dataRequestor.callGETAction(
            "/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.baseFunction(data='I am data')"
        );
        dataResStrict.headers['Prefer'] = 'handling=strict';
        const strictResult = await dataResStrict.execute();
        expect(strictResult.body).toMatchInlineSnapshot(`"STRICT :: I am data"`);
        const dataRes2 = await dataRequestor
            .callGETAction('/RootElement(ID=1,IsActiveEntity=true)/_Elements')
            .execute();
        for (const dataRes2Element of (dataRes2.body as any).value) {
            delete dataRes2Element['@odata.etag'];
        }
        expect(dataRes2.body).toMatchInlineSnapshot(`
            {
              "@odata.context": "$metadata#RootElement(ID=1,IsActiveEntity=true)/_Elements",
              "@odata.count": 3,
              "@odata.metadataEtag": "W/"6770-h9dQUjphfbSGIAAET0AzZrT84Us"",
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
        expect(dataRes.body).toMatchSnapshot();
    });
    it('can get the root', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.getRoot().execute();
        expect(dataRes.body).toMatchSnapshot();

        const dataRequestor2 = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes2 = await dataRequestor2.getRoot('$format=json').execute();
        expect(dataRes2.body).toMatchSnapshot();

        const output = await fetch('http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2?$format=json');
        const textResponse = await output.text();
        expect(textResponse).toMatchSnapshot();

        const serviceCatalogAtom = await fetch('http://localhost:33331/sap/opu/odata/IWFND/CATALOGSERVICE;v=2');
        const textResponseAtom = await serviceCatalogAtom.text();
        expect(textResponseAtom).toMatchSnapshot();
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
        const dataRes = await dataRequestor.reloadData().execute();
        expect(dataRes.body).toMatchSnapshot();
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
        const dataRes2 = await dataRequestor.getCount<any>('RootElement').executeAsJsonBatch();
        expect(dataRes2).toBe(4);
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
        delete dataRes['@odata.etag'];
        expect(dataRes).toMatchSnapshot();
        const dataRes2 = await dataRequestor.getObject<any>('RootElement', { ID: 2 }).executeAsJsonBatch();
        delete dataRes2['@odata.etag'];
        expect(dataRes2).toMatchSnapshot();

        dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-002/sap/fe/core/mock/action');
        dataRes = await dataRequestor.getObject<any>('RootElement', { ID: 233 }).executeAsBatch();
        delete dataRes['@odata.etag'];
        expect(dataRes).toMatchSnapshot();

        dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-003/sap/fe/core/mock/action');
        dataRes = await dataRequestor.getObject<any>('RootElement', { ID: 2 }).executeAsBatch();
        delete dataRes['@odata.etag'];
        expect(dataRes).toMatchSnapshot();
        dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataResClient = await dataRequestor
            .getObject<any>('RootElement', { ID: 2 })
            .executeAsBatch(false, '?sap-client=003');
        delete dataResClient['@odata.etag'];
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

        const dataResJ = await dataRequestor.createData<any>('RootElement', { ID: 556 }).executeAsJsonBatch();
        delete dataResJ.DraftAdministrativeData;
        expect(dataResJ).toMatchSnapshot();

        const dataResJ2 = await dataRequestor.getList<any>('RootElement').executeAsJsonBatch();
        expect(dataResJ2.length).toBe(6);
        expect(dataResJ2[5].ID).toBe(556);
        expect(dataResJ2[5].Prop1).toBe('');

        const dataRequestor3 = new ODataV4Requestor('http://localhost:33331/tenant-008/sap/fe/core/mock/action');
        const dataRes3 = await dataRequestor.createData<any>('/RootElement', { ID: 666 }).execute();
        delete dataRes3.body.DraftAdministrativeData;
        expect(dataRes3.body).toMatchSnapshot();

        const dataRes4 = await dataRequestor.getList<any>('RootElement').executeAsBatch();
        expect(dataRes4.length).toBe(7);
        expect(dataRes4[6].ID).toBe(666);
        expect(dataRes4[6].Prop1).toBe('');
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
        let dataRes = await dataRequestor.createData<any>('/RootElement', { ID: 556 }).execute();
        delete dataRes.body.DraftAdministrativeData;
        delete dataRes.body['@odata.etag'];
        expect(dataRes.body).toMatchSnapshot();
        dataRes = await dataRequestor.updateData<any>('/RootElement(ID=556)', { Prop1: 'MyNewProp1' }).execute();
        delete dataRes.body.DraftAdministrativeData;
        delete dataRes.body['@odata.etag'];
        expect(dataRes.body).toMatchSnapshot();
        const dataRes2 = await dataRequestor.getList<any>('/RootElement').executeAsBatch();
        expect(dataRes2.length).toBe(5);
        expect(dataRes2[4].ID).toBe(556);
        expect(dataRes2[4].Prop1).toBe('MyNewProp1');

        // update something that does not exist
        const res = await dataRequestor.updateData<any>('/RootElement(ID=557)', { Prop1: 'MyNewProp1' }).execute();
        expect(res.status).toBe(404);

        // Deep update
        const res2 = await dataRequestor
            .updateData<any>('/RootElement(ID=556)/Prop1', 'Lali-ho', true, 'PUT')
            .execute();
        delete res2.body.DraftAdministrativeData;
        expect(res2.body).toMatchSnapshot();
        const res3 = await dataRequestor
            .updateData<any>('/RootElement(ID=556)/Prop1', 'Lali-hoho', true, 'PUT', {
                'If-Match': dataRes2[4]['@odata.etag']
            })
            .execute();
        delete res3.body.DraftAdministrativeData;
        const newEtag = res3.body['@odata.etag'];
        delete res3.body['@odata.etag'];
        expect(res3.body).toMatchSnapshot();
        const dataRes3 = await dataRequestor.getList<any>('/RootElement').executeAsBatch();
        expect(dataRes3.length).toBe(5);
        expect(dataRes3[4].ID).toBe(556);
        expect(dataRes3[4].Prop1).toBe('Lali-hoho');
        const res4 = await dataRequestor
            .updateData<any>('/RootElement(ID=556)/Prop1', 'Lali', true, 'PUT', {
                'If-Match': dataRes2[4]['@odata.etag']
            })
            .execute();
        expect(res4.body).toMatchSnapshot();
        const dataRes4 = await dataRequestor.getList<any>('/RootElement').executeAsBatch();
        expect(dataRes4.length).toBe(5);
        expect(dataRes4[4].ID).toBe(556);
        expect(dataRes4[4].Prop1).toBe('Lali-hoho');
        const res5 = await dataRequestor
            .updateData<any>('/RootElement(ID=556)/Prop1', 'Lali', true, 'PUT', {
                'If-Match': newEtag
            })
            .execute();
        delete res5.body['@odata.etag'];
        delete res5.body.DraftAdministrativeData;
        expect(res5.body).toMatchSnapshot();
    });
    describe('Sticky', () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/tenant-0/sap/fe/core/mock/sticky');

        it('create, discard, try to update the discarded item', async () => {
            const created = await dataRequestor.callAction<any>('/Root/TestService.Create', {}).execute();
            expect(created).toMatchSnapshot(
                { headers: expect.objectContaining({ 'sap-contextid': expect.any(String) }) },
                'Create'
            );

            const id = created.body.ID;
            const contextId = created.headers['sap-contextid'];

            const discarded = await dataRequestor
                .callAction('/Discard', {}, false, {
                    'sap-contextid': contextId
                })
                .execute();
            expect(discarded).toMatchSnapshot(
                {
                    headers: expect.not.objectContaining({ 'sap-contextid': expect.any(String) })
                },
                'Discard'
            );

            const updated = await dataRequestor
                .updateData<any>(`/Root(ID=${id})`, { data: 'Updated Data' }, false, 'PATCH', {
                    'sap-contextid': contextId
                })
                .execute();
            expect(updated).toMatchSnapshot(
                {
                    headers: expect.not.objectContaining({ 'sap-contextid': expect.any(String) })
                },
                'Update discarded item'
            );

            // try with $batch
            const response = await fetch('http://localhost:33331/tenant-0/sap/fe/core/mock/sticky/$batch', {
                method: 'POST',
                headers: new Headers({
                    'content-type': 'multipart/mixed; boundary=batch_id-1698318562147-861',
                    accept: 'multipart/mixed',
                    'sap-contextid': contextId
                }),
                body: `
--batch_id-1698318562147-861
Content-Type:application/http
Content-Transfer-Encoding:binary

PATCH Root(ID=${id}) HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
SAP-ContextId:${contextId}
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"data": "Updated Data"}
--batch_id-1698318562147-861--`
            });

            expect(response.status).toEqual(400);
        });

        it('can get updated the sticky header timeout', async () => {
            const created = await dataRequestor.callAction<any>('/Root/TestService.Create', {}).execute();
            const contextId = created.headers['sap-contextid'];
            expect(contextId).toBeDefined();

            const dataRes = await dataRequestor.reloadStickyHeader(contextId).execute();
            expect(dataRes.headers['sap-contextid']).toEqual(contextId);
            expect(dataRes.headers['sap-http-session-timeout']).toBeDefined();
        });
    });

    it('does not fail if query properties cannot be parsed', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');

        // /RootElement?$expand=_Elements($select=ID)) --> too many closing parentheses!
        const dataReq = dataRequestor.getList<any>('/RootElement');
        dataReq.expand({ _Elements: { select: ['ID)'] } });

        const response = await dataReq.execute();
        expect(response.body).toMatchInlineSnapshot(`"Too many closing parentheses: _Elements($select=ID))"`);
    });
    it('can get some data after changing the watch mode', async () => {
        let dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        let dataRes = await dataRequestor.getList<any>('/RootElement').execute();
        expect(dataRes.body.length).toBe(4);
        expect(dataRes.body[0].Prop1).toBe('First Prop');
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
            dataRes = await dataRequestor.getList<any>('/RootElement').execute();
            expect(dataRes.body.length).toBe(4);
            expect(dataRes.body[0].Prop1).toBe('SomethingElse');
            resolveFn();
        }, 1000);
        return myPromise;
    });

    it('ChangeSet failure with single error', async () => {
        const response = await fetch('http://localhost:33331/sap/fe/core/mock/action/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: multipart/mixed;boundary=changeset_id-1719917686303-235

--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST RootElement(ID=2,IsActiveEntity=true)/sap.fe.core.ActionVisibility.boundActionChangeSet?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:1.0

POST RootElement(ID=3,IsActiveEntity=true)/sap.fe.core.ActionVisibility.boundActionChangeSet?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235--
--batch_id-1719917686303-234--
Group ID: $auto`
        });
        const responseStr = await response.text();
        expect(responseStr).toMatchInlineSnapshot(`
            "--batch_id-1719917686303-234
            Content-Type: application/http
            Content-Transfer-Encoding: binary
            Content-ID: 1.0

            HTTP/1.1 500 Internal Server Error
            sap-tenantid: tenant-default
            content-type: application/json;odata.metadata=minimal;IEEE754Compatible=true
            odata-version: 4.0

            {"error":{"code":500,"message":"Bound transition error","transition":true,"@Common.numericSeverity":4,"target":"self","details":[{"code":"500","message":"Unable to execute the action due to a error. ID: 3","@Common.numericSeverity":4,"transition":true,"target":"self/Prop1","@Core.ContentID":"1.0"}],"@Core.ContentID":"1.0"}}
            --batch_id-1719917686303-234--
            "
        `);
        const responseJson: any = getJsonFromMultipartContent(responseStr);
        expect(responseJson[0].error.code).toEqual(500);
    });

    it('get a 412 warning for a single selected context', async () => {
        const dataRequestor = new ODataV4Requestor('http://localhost:33331/sap/fe/core/mock/action');
        const dataRes = await dataRequestor.callAction(
            '/RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action',
            {}
        );
        dataRes.headers['Prefer'] = 'handling=strict';
        const result: any = await dataRes.execute();
        expect(result.status).toEqual(412);
        expect(result.body.error.details.length).toBe(1);
    });

    it('get 412 warnings for multiple selected contexts', async () => {
        const response = await fetch('http://localhost:33331/sap/fe/core/mock/action/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: multipart/mixed;boundary=changeset_id-1719917686303-235

--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:1.0

POST RootElement(ID=2,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235--
--batch_id-1719917686303-234--
Group ID: $auto`
        });
        const expectedResponse =
            '--batch_id-1719917686303-234\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nHTTP/1.1 412 Precondition Failed\r\nsap-tenantid: tenant-default\r\nPreference-Applied: handling=strict\r\ncontent-type: application/json;odata.metadata=minimal;IEEE754Compatible=true\r\nodata-version: 4.0\r\n\r\n\r\n{"error":{"code":412,"message":"Unable to execute the action due to a warning.","details":[{"code":"null","message":"Unable to execute the action due to a warning.","@Core.ContentID":"0.0"},{"code":"null","message":"Unable to execute the action due to a warning.","@Core.ContentID":"1.0"}]}}\r\n--batch_id-1719917686303-234--\r\n';
        const responseStr = await response.text();
        const responseJson: any = getJsonFromMultipartContent(responseStr);
        expect(responseStr).toEqual(expectedResponse);
        expect(responseJson[0].error.code).toEqual(412);
        expect(responseJson[0].error.details.length).toBe(2);
    });

    it('get 412 warnings with unbound transition error with multiple contexts selected', async () => {
        const response = await fetch('http://localhost:33331/sap/fe/core/mock/action/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: multipart/mixed;boundary=changeset_id-1719917686303-235

--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:1.0

POST RootElement(ID=2,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:1.0

POST RootElement(ID=3,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound412Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{}
--changeset_id-1719917686303-235--
--batch_id-1719917686303-234--
Group ID: $auto`
        });
        const responseStr = await response.text();
        const responseJson: any = getJsonFromMultipartContent(responseStr);
        expect(responseJson[0].error.code).toEqual(412);
        expect(responseJson[0].error.details.length).toBe(2);
    });

    it('get a 503 error for a selected context for a request', async () => {
        const response = await fetch('http://localhost:33331/sap/fe/core/mock/action/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: multipart/mixed;boundary=changeset_id-1719917686303-235

--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound503Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"globalError": false}
--changeset_id-1719917686303-235--
--batch_id-1719917686303-234--
Group ID: $auto`
        });
        expect(response.status).toEqual(200);
        const responseStr = await response.text();
        const responseInfos: any = getStatusAndHeadersFromMultipartContent(responseStr);
        expect(responseInfos[0].status).toEqual(503);
        expect(responseInfos[0].headers['Retry-After']).toEqual('some date');
    });

    it('get a 503 error for a selected context for the batch', async () => {
        const response = await fetch('http://localhost:33331/sap/fe/core/mock/action/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: multipart/mixed;boundary=changeset_id-1719917686303-235

--changeset_id-1719917686303-235
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST RootElement(ID=1,IsActiveEntity=true)/sap.fe.core.ActionVisibility.bound503Action?$select=HasActiveEntity HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
X-CSRF-Token:0504-71383
Prefer:handling=strict
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"globalError": true}
--changeset_id-1719917686303-235--
--batch_id-1719917686303-234--
Group ID: $auto`
        });
        expect(response.status).toEqual(503);
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

describe('services from ValueListReferences', () => {
    async function createServer(resolveValueListReferences: boolean, port: number): Promise<Server> {
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, 'v4', 'services', 'parametrizedSample', 'metadata.xml'),
                    mockdataPath: path.join(__dirname, 'v4', 'services', 'parametrizedSample'),
                    urlPath: '/sap/fe/core/mock/sticky',
                    watch: false,
                    generateMockData: true,
                    resolveValueListReferences
                }
            ],
            annotations: [],
            plugins: [],
            contextBasedIsolation: true
        });
        await mockServer.isReady;
        const server = http.createServer(function onRequest(req, res) {
            mockServer.getRouter()(req, res, finalHandler(req, res));
        });
        server.listen(port);
        return server;
    }
    describe('resolveValueListReferences = true', () => {
        let server: Server;
        let loadFileSpy: jest.SpyInstance;
        beforeAll(async function () {
            const loadFile = FileSystemLoader.prototype.loadFile;
            const exists = FileSystemLoader.prototype.exists;
            jest.spyOn(FileSystemLoader.prototype, 'exists').mockImplementation((path): Promise<boolean> => {
                if (path.includes('i_companycodestdvh') && path.includes('metadata.xml')) {
                    return Promise.resolve(true);
                } else {
                    return exists(path);
                }
            });
            loadFileSpy = jest
                .spyOn(FileSystemLoader.prototype, 'loadFile')
                .mockImplementation((path): Promise<string> => {
                    if (path.includes('i_companycodestdvh') && path.includes('metadata.xml')) {
                        return Promise.resolve(`<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
        <edmx:DataServices>
            <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local">
            </Schema>
        </edmx:DataServices>
    </edmx:Edmx>`);
                    } else {
                        return loadFile(path);
                    }
                });
            server = await createServer(true, 33332);
        });
        afterAll((done) => {
            server.close(done);
        });

        it('call service from ValueListReferences', async () => {
            const response = await fetch(
                `http://localhost:33332/sap/srvd_f4/sap/i_companycodestdvh/0001;ps=%27srvd-zrc_arcustomer_definition-0001%27;va=%27com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-parameterz_arcustomer2.p_companycode%27/$metadata`
            );

            expect(response.status).toEqual(200);
            expect(loadFileSpy).toHaveBeenNthCalledWith(
                2,
                path.join(
                    __dirname,
                    'v4',
                    'services',
                    'parametrizedSample',
                    'srvd_f4',
                    'sap',
                    'i_companycodestdvh',
                    '0001',
                    'CustomerParameters',
                    'P_CompanyCode',
                    'metadata.xml'
                )
            );
            expect(loadFileSpy).not.toHaveBeenCalledWith(
                path.join(
                    __dirname,
                    'v4',
                    'services',
                    'parametrizedSample',
                    'srvd_f4',
                    'sap',
                    'i_customer_vh',
                    '0001',
                    'CustomerType',
                    'Customer',
                    'metadata.xml'
                )
            );
        });
    });
    describe('resolveValueListReferences = false', () => {
        let server: Server;
        beforeAll(async function () {
            server = await createServer(false, 33333);
        });
        afterAll((done) => {
            server.close(done);
        });
        it('call service from ValueListReferences', async () => {
            const response = await fetch(
                `http://localhost:33333/sap/srvd_f4/sap/i_companycodestdvh/0001;ps=%27srvd-zrc_arcustomer_definition-0001%27;va=%27com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-parameterz_arcustomer2.p_companycode%27/$metadata`
            );

            expect(response.status).toEqual(404);
        });
    });
});

describe('V2', function () {
    let server: Server;
    beforeAll(async function () {
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData/v2/dummy_product', 'metadata.xml'),
                    mockdataPath: path.join(__dirname, '__testData/v2/dummy_product'),
                    urlPath: '/test/v2/dummy_product',
                    debug: true,
                    watch: true
                }
            ],
            annotations: [],
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

    it('Test Batch query with headers', async () => {
        const response = await fetch('http://localhost:33331/test/v2/dummy_product/$batch', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'multipart/mixed; boundary=batch_id-1719917686303-234',
                accept: 'multipart/mixed'
            }),
            body: `--batch_id-1719917686303-234
Content-Type: application/http
Content-Transfer-Encoding: binary

GET SEPMRA_C_PD_Product?$skip=0&$top=3 HTTP/1.1
sap-cancel-on-close: true
sap-contextid-accept: header
Accept: application/json
Accept-Language: de
DataServiceVersion: 2.0
MaxDataServiceVersion: 2.0
X-Requested-With: XMLHttpRequest

--batch_id-1719917686303-234--`
        });
        const responseStr = await response.text();
        expect(responseStr.replace(/\/Date\([^)]+\)/g, '/Date()')).toMatchSnapshot();
    });

    it('can create a mock middleware for services with special characters', async () => {
        const config: MockserverConfiguration = {
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath:
                        "/dmo/i_customer_stdvh/0001;ps='srvd-*dmo*ui_travel_d_d-0001';va='et-*dmo*c_booking_d_d.customerid'",
                    watch: true,
                    validateETag: true
                }
            ],
            annotations: [],
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds',
                options: {}
            }
        };

        let mockServer = new FEMockserver({ ...config, contextBasedIsolation: true });
        await expect(mockServer.isReady).resolves.toBeUndefined();

        mockServer = new FEMockserver({ ...config, contextBasedIsolation: false });
        await expect(mockServer.isReady).resolves.toBeUndefined();
    });
});
