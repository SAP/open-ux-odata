import { fileExist, loadFixture } from './fixturesHelper';
import { parse, merge } from '../src';
import type { RawMetadata } from '@sap-ux/vocabularies-types';

describe('Parser', function () {
    jest.setTimeout(30000);
    it('can parse an edmx file', async () => {
        const xmlFile = await loadFixture('v4/sdMeta.xml');
        const schema: RawMetadata = parse(xmlFile);
        const annoFile = await loadFixture('v4/sdAnno.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(schema, annoSchema);
        expect(mergeSchema).toMatchSnapshot();
    });

    it('can convertTypes an v3 edmx file', async () => {
        const xmlFile = await loadFixture('northwind.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can convertTypes the worklist edmx file', async () => {
        const xmlFile = await loadFixture('v2/worklist.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can convertTypes a v2 edmx file with function import', async () => {
        const xmlFile = await loadFixture('v2/metadataFunctionImport.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can convertTypes a weird edmx file', async () => {
        const xmlFile = await loadFixture('weirdCollection.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can convertTypes a trippin metadata', async () => {
        const xmlFile = await loadFixture('v4/trippin/metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        const annoFile = await loadFixture('v4/trippin/annotation.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(schema, annoSchema);
        expect(mergeSchema).toMatchSnapshot();
    });
    it('can convertTypes a metadata with a typedef', async () => {
        const xmlFile = await loadFixture('v4/withTypeDef.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can convertTypes an edmx file', async () => {
        const xmlFile = await loadFixture('salesOrder.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse all edmx file', async () => {
        const indexFile = JSON.parse(await loadFixture('v2/index.json'));
        await indexFile.reduce(async (previousPromise: Promise<void>, serviceName: string) => {
            await previousPromise;
            const xmlFile = await loadFixture(`v2/${serviceName}/metadata.xml`);
            const outputs = [];
            outputs.push(parse(xmlFile));

            const manifestFile = JSON.parse(await loadFixture(`v2/${serviceName}/webapp/manifest.json`));
            if (manifestFile['sap.app'].dataSources.mainService) {
                const annotations: string[] =
                    manifestFile['sap.app'].dataSources.mainService.settings.annotations || [];
                for (const annotation of annotations) {
                    if (manifestFile['sap.app'].dataSources[annotation].uri.startsWith('/sap/opu/odata/')) {
                        if (fileExist(`v2/${serviceName}/${annotation}.annotation.xml`)) {
                            const annotationFile = await loadFixture(`v2/${serviceName}/${annotation}.annotation.xml`);
                            outputs.push(parse(annotationFile));
                        }
                    }
                }
            }
            const mergedOutput: RawMetadata = merge(...outputs);
            expect(mergedOutput).toBeDefined();
        });
    });
});
