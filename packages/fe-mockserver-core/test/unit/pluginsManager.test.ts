import FileSystemLoader from '../../src/plugins/fileSystemLoader';
import MetadataProvider from '../../src/plugins/metadataProvider';
import { getMetadataProcessor } from '../../src/pluginsManager';

describe('getMetadataProcessor', () => {
    const fileLoader = new FileSystemLoader();

    it('should return the default processor if there is no name', async () => {
        const processor = await getMetadataProcessor(fileLoader, undefined);
        expect(processor).toEqual(new MetadataProvider(fileLoader));
    });

    it('should return a new instance every time', async () => {
        // this is because options might be different!
        const processor1 = await getMetadataProcessor(fileLoader, undefined, { a: 1 });
        const processor2 = await getMetadataProcessor(fileLoader, undefined, { a: 2 });
        expect(processor1).not.toBe(processor2);
    });
});
