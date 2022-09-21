import { parseBatch, BatchContent } from '../../../src/router/batchParser';

describe('Batch Parser', () => {
    it('can parse correct batch content', () => {
        const ymBatch = `--boundary111
Content-Type:application/http
Content-Transfer-Encoding:binary

GET YOLO
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true
--boundary111--
`;
        const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        expect(myBatch).toMatchSnapshot();
    });
    it('can parse correct batch content with search & search-focus', () => {
        const ymBatch = `--boundary111
Content-Type:application/http
Content-Transfer-Encoding:binary

GET YOLO?$skip=0&$top=10&search=foo&search-focus=bar
sap-cancel-on-close: true
sap-contextid-accept: header
Accept:application/json
Accept-Language:en

--boundary111--
`;
        const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        expect(myBatch).toMatchSnapshot();
    });
    it('can parse correct batch content with changeset', () => {
        const ymBatch = `--batch_id-1653467757956-971
Content-Type: multipart/mixed;boundary=changeset_id-1653467757956-972

--changeset_id-1653467757956-972
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:0.0

POST LineItems(ID=1,IsActiveEntity=true)/sap.fe.manageitems.TechnicalTestingService.testInvocationGroupingChangeSet HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
If-Match:W/"2022-05-25T07:18:11.527Z"
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"myParameter":"23"}
--changeset_id-1653467757956-972
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:1.0

POST LineItems(ID=2,IsActiveEntity=true)/sap.fe.manageitems.TechnicalTestingService.testInvocationGroupingChangeSet HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
If-Match:W/"2022-05-25T07:18:11.527Z"
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"myParameter":"23"}
--changeset_id-1653467757956-972
Content-Type:application/http
Content-Transfer-Encoding:binary
Content-ID:2.0

POST LineItems(ID=3,IsActiveEntity=true)/sap.fe.manageitems.TechnicalTestingService.testInvocationGroupingChangeSet HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
If-Match:W/"2022-05-25T07:18:11.527Z"
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true

{"myParameter":"23"}
--changeset_id-1653467757956-972--
--batch_id-1653467757956-971
Content-Type:application/http
Content-Transfer-Encoding:binary

GET LineItems?$select=ID,IsActiveEntity,updatedValue&$filter=ID%20eq%201%20and%20IsActiveEntity%20eq%20true HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true


--batch_id-1653467757956-971
Content-Type:application/http
Content-Transfer-Encoding:binary

GET LineItems?$select=ID,IsActiveEntity,updatedValue&$filter=ID%20eq%202%20and%20IsActiveEntity%20eq%20true HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true


--batch_id-1653467757956-971
Content-Type:application/http
Content-Transfer-Encoding:binary

GET LineItems?$select=ID,IsActiveEntity,updatedValue&$filter=ID%20eq%203%20and%20IsActiveEntity%20eq%20true HTTP/1.1
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true


--batch_id-1653467757956-971--
Group ID: $auto
`;
        const myBatch = parseBatch(new BatchContent(ymBatch), 'batch_id-1653467757956-971');
        expect(myBatch).toMatchSnapshot();
    });
    it('will fail on incorrect batch parse correct batch content - missing content type', () => {
        const ymBatch = `--boundary111
Content-Transfer-Encoding:binary

GET YOLO
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true
--boundary111--
`;
        try {
            const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        } catch (e) {
            expect(e).toMatchSnapshot();
        }
    });
    it('will fail on incorrect batch parse correct batch content - missing content type 2', () => {
        const ymBatch = `--boundary111
Content-Type:application/http
Content-Transfer-Encoding:binary

GET YOLO
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true
--boundary111--
`;
        try {
            const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        } catch (e) {
            expect(e).toMatchSnapshot();
        }
    });
    it('will fail on incorrect batch parse correct batch content - incorrect batch ', () => {
        const ymBatch = `--boundary111
Content-Type:application/http
Content-Transfer-Encoding:binary

GET YOLO
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
--boundary1131--
`;
        try {
            const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        } catch (e) {
            expect(e).toMatchSnapshot();
        }
    });
    it('will fail on incorrect batch parse correct batch content - incorrect batch boundary ', () => {
        const ymBatch = `--boundary11331
Content-Type:application/http
Content-Transfer-Encoding:binary

GET YOLO
Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true
Accept-Language:en
--boundary1131--
`;
        try {
            const myBatch = parseBatch(new BatchContent(ymBatch), 'boundary111');
        } catch (e) {
            expect(e).toMatchSnapshot();
        }
    });
});
