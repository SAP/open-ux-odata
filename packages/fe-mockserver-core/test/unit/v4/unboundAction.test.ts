import { join } from 'path';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';

describe('Unbound Action', () => {
    let metadata, dataAccess: DataAccess;
    const baseUrl = '/test';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'unboundAction');
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    test('can be called', async () => {
        const requestUrl = '/unboundAction';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccess);
        expect(request.queryPath).toMatchSnapshot();
        const actionData = await dataAccess.performAction(request);
        expect(actionData).toMatchSnapshot();
    });

    test('can call the base interface', async () => {
        const requestUrl = '/unboundActionThatFetchData';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccess);
        expect(request.queryPath).toMatchSnapshot();
        const actionData = await dataAccess.performAction(request);
        expect(actionData).toMatchSnapshot();
    });

    test('can call the base interface for an incorrect entity   ', async () => {
        const requestUrl = '/unboundActionThatFetchDataOnUnknownEntity';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccess);
        expect(request.queryPath).toMatchSnapshot();
        expect(async () => await dataAccess.performAction(request)).rejects.toThrow();
    });

    test('does not catch all', async () => {
        const requestUrl = '/unboundActionThatIDontknow';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccess);
        const actionData = await dataAccess.performAction(request);
        expect(actionData).toBeNull();
    });
});
