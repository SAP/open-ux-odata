import * as path from 'path';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import MetadataProvider from '../../../src/plugins/metadataProvider';

describe('MetadataProvider', () => {
    const myFSLoader = new FileSystemLoader();
    const myMetadataProvider = new MetadataProvider(myFSLoader);
    it('can load metadata files', async () => {
        const metadataXml = await myMetadataProvider.loadMetadata(path.join(__dirname, 'fixtures', 'valid.xml'));
        expect(metadataXml).toMatchSnapshot();
    });
});
