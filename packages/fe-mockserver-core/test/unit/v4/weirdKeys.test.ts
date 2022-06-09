import { readFileSync } from 'fs';
import { join } from 'path';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';

jest.setTimeout(3600000);
describe('Data Access with weird keys', () => {
    let dataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    const baseUrl = '/WeirdKeys';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'weirdKeys');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));

        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    test('Item with various keys', async () => {
        let odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/A(ID='A-0',BoolKey=true,DateKey=2022-02-02,GuidKey=guid'18589449-7082-4361-9d27-51363c2f3bcd')"
            },
            dataAccess
        );
        let data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
        odataRequest = new ODataRequest(
            {
                method: 'GET',
                url: "/A(ID='A-0',BoolKey=false,DateKey=2022-02-02,GuidKey=guid'18589449-7082-4361-9d27-51363c2f3bcd')"
            },
            dataAccess
        );
        data = await dataAccess.getData(odataRequest);
        expect(data).toMatchSnapshot();
    });
});
