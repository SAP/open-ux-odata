import * as fs from 'fs';
import * as path from 'path';
import CDSMetadataProvider from '../src';
import type { IFileLoader } from '@sap-ux/fe-mockserver-core';

describe('FE Mockserver CDS Plugin', () => {
    const fakeFileLoader = {
        loadFile: async (filePath: string) => {
            return (await fs.promises.readFile(filePath)).toString('utf-8');
        }
    } as IFileLoader;
    const myCDSProvider = new CDSMetadataProvider(fakeFileLoader);
    const myV2CDSProvider = new CDSMetadataProvider(fakeFileLoader, { odataVersion: 'v2' });
    const cdsDataPath = path.join(__dirname, 'cds');
    const xmlDataPath = path.join(__dirname, 'xml');
    it('can compile valid CDS file', async () => {
        const edmx = await myCDSProvider.loadMetadata(path.join(cdsDataPath, 'valid.cds'));
        expect(edmx).toMatchSnapshot();
    });
    it('can compile valid CDS file using common stuff', async () => {
        const edmx = await myCDSProvider.loadMetadata(path.join(cdsDataPath, 'valid-withCommon.cds'));
        expect(edmx).toMatchSnapshot();
    });
    it('can compile valid CDS file using more common stuff', async () => {
        const edmx = await myCDSProvider.loadMetadata(path.join(cdsDataPath, 'valid-withmorecommon.cds'));
        expect(edmx).toMatchSnapshot();
    });
    it('can compile valid CDS file using more files', async () => {
        const edmx = await myCDSProvider.loadMetadata(path.join(cdsDataPath, 'valid-withUsing.cds'));
        expect(edmx).toMatchSnapshot();
    });
    it('can also load XML files', async () => {
        const edmx = await myCDSProvider.loadMetadata(path.join(xmlDataPath, 'valid.xml'));
        expect(edmx).toMatchSnapshot();
    });
    it('will throw while processing invalid CDS - syntax Error', async () => {
        await expect(myCDSProvider.loadMetadata(path.join(cdsDataPath, 'invalid-syntaxError.cds'))).rejects
            .toMatchInlineSnapshot(`
                    [Error: CDS compilation failed
                    string.cds:5:15-17: Error: Extraneous ‹Identifier›, expecting ‘:’, ‘{’, ‘@’, ‘=’]
                `);
    });
    it('will throw while processing invalid CDS - multiple Services', async () => {
        await expect(
            myCDSProvider.loadMetadata(path.join(cdsDataPath, 'invalid-multipleServices.cds'))
        ).rejects.toMatchInlineSnapshot(`[Error: Compilation failed, you can only define one service, found 2]`);
    });
    it('can compile valid CDS file in V2', async () => {
        const edmx = await myV2CDSProvider.loadMetadata(path.join(cdsDataPath, 'valid.cds'));
        expect(edmx).toMatchSnapshot();
    });
    it('can compile valid CDS file using common stuff in V2', async () => {
        const edmx = await myV2CDSProvider.loadMetadata(path.join(cdsDataPath, 'valid-withCommon.cds'));
        expect(edmx).toMatchSnapshot();
    });
});
