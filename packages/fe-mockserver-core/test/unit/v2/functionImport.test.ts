import { join } from 'path';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';

describe('Function Import', () => {
    let metadata, dataAccess: DataAccess;
    let dataAccessNoOverride: DataAccess;
    let dataAccessWrongJS: DataAccess;
    const baseUrl = '/test';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'FunctionImport');
        const baseDirNoOverride = join(__dirname, 'services', 'FunctionImportNoOverride');
        const baseDirWrongJS = join(__dirname, 'services', 'FunctionImportWrongJS');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'metadata.xml'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        dataAccessNoOverride = new DataAccess(
            { mockdataPath: baseDirNoOverride } as ServiceConfig,
            metadata,
            fileLoader
        );
        dataAccessWrongJS = new DataAccess({ mockdataPath: baseDirWrongJS } as ServiceConfig, metadata, fileLoader);
    });
    test('are parsed properly', async () => {
        const requestUrl = '/DecisionOptions?SAP__Origin=%27QM7CLNT910_BWF%27&InstanceID=%27000007298690%27';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccess);
        expect(request.queryPath).toMatchSnapshot();
        const actionData = await dataAccess.performAction(request);
        expect(actionData).toBeTruthy();
    });

    test('will fail by default', async () => {
        const requestUrl = '/DecisionOptions?SAP__Origin=%27QM7CLNT910_BWF%27&InstanceID=%27000007298690%27';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccessNoOverride);
        expect(request.queryPath).toMatchSnapshot();
        let error = null;
        try {
            await dataAccessNoOverride.performAction(request);
        } catch (e) {
            error = e;
        }
        expect(error).not.toBeNull();
        expect(error).toMatchSnapshot();
    });
    test('will fail for wrong JS', async () => {
        const requestUrl = '/DecisionOptions?SAP__Origin=%27QM7CLNT910_BWF%27&InstanceID=%27000007298690%27';

        const request = new ODataRequest({ method: 'POST', url: requestUrl }, dataAccessWrongJS);
        expect(request.queryPath).toMatchSnapshot();
        let error = null;
        try {
            await dataAccessWrongJS.performAction(request);
        } catch (e) {
            error = e;
        }
        expect(error).not.toBeNull();
        expect(error).toMatchSnapshot();
    });
});
