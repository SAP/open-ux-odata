import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

jest.setTimeout(3600000);
describe('Data Access with $expand spanning multiple levels', () => {
    let dataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    const baseUrl = '/MultiLevelExpand';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'multiLevelExpand');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    test('List: root level only', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: root level only (with $select)', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$select=ID,value' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:1', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toOne' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:1 (with $select)', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toOne($select=value)' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toMany' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n (with $select)', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toMany($select=value)' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n (with $filter)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: "/A?$expand=_toMany($filter=value eq 'B2')" },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n (with $orderby)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($orderby=value desc)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n with no ref constraints', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toComposition' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 1 level, 1:n with no ref constraints (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toComposition($select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });

    test('List: 2 levels, 1:1 --> 1:1', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toOne($expand=_toOne)' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n --> 1:1', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toMany($expand=_toOne)' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 --> 1:n', async () => {
        const odataRequest = new ODataRequest({ method: 'GET', url: '/A?$expand=_toOne($expand=_toMany)' }, dataAccess);
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n --> 1:n', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toMany)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 (with $select) --> 1:1', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toOne;$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n (with $select) --> 1:1', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toOne;$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 (with $select) --> 1:n', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toMany;$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n (with $select) --> 1:n', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toMany;$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 --> 1:1 (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toOne($select=value))' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n --> 1:1 (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toOne($select=value))' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 --> 1:n (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toMany($select=value))' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n --> 1:n (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toMany($select=value))' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 (with $select) --> 1:1 (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toOne($select=value);$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n (with $select) --> 1:1 (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toOne($select=value);$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:1 (with $select) --> 1:n (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toOne($expand=_toMany($select=value);$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
    test('List: 2 levels, 1:n (with $select) --> 1:n (with $select)', async () => {
        const odataRequest = new ODataRequest(
            { method: 'GET', url: '/A?$expand=_toMany($expand=_toMany($select=value);$select=value)' },
            dataAccess
        );
        const data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
});
