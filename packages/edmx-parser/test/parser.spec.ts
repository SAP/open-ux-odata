import type { RawMetadata } from '@sap-ux/vocabularies-types';
import { merge, parse } from '../src';
import { fileExist, loadFixture, loadFixtureSync } from './fixturesHelper';

describe('Parser', function () {
    it('can parse an edmx file', async () => {
        const xmlFile = await loadFixture('v4/sdMeta.xml');
        const schema: RawMetadata = parse(xmlFile);
        const annoFile = await loadFixture('v4/sdAnno.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(schema, annoSchema);
        expect(mergeSchema).toMatchSnapshot();
    });

    it('can parse an v3 edmx file', async () => {
        const xmlFile = await loadFixture('northwind.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse the worklist edmx file', async () => {
        const xmlFile = await loadFixture('v2/worklist.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse a v2 edmx file with function import', async () => {
        const xmlFile = await loadFixture('v2/metadataFunctionImport.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });
    it('can parse a v2 edmx file with analytics', async () => {
        const xmlFile = await loadFixture('v2/metadata_analytics.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse a weird edmx file', async () => {
        const xmlFile = await loadFixture('weirdCollection.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse a trippin metadata', async () => {
        const xmlFile = await loadFixture('v4/trippin/metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        const annoFile = await loadFixture('v4/trippin/annotation.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(schema, annoSchema);
        expect(mergeSchema).toMatchSnapshot();
    });
    it('can parse a metadata with a typedef', async () => {
        const xmlFile = await loadFixture('v4/withTypeDef.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse an edmx file', async () => {
        const xmlFile = await loadFixture('salesOrder.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse actions and functions - unique names', async () => {
        const xmlFile = await loadFixture('v4/actions-and-functions.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('can parse actions and functions - overloads', async () => {
        const xmlFile = await loadFixture('v4/actions-and-functions-overload.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    describe('can parse all edmx file', () => {
        const indexFile = JSON.parse(loadFixtureSync('v2/index.json'));
        indexFile.forEach((serviceName: string) => {
            test(serviceName, async () => {
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
                                const annotationFile = await loadFixture(
                                    `v2/${serviceName}/${annotation}.annotation.xml`
                                );
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

    it('can parse an EDMX file with alias', async () => {
        const xmlFile = await loadFixture('v4/aliased.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });

    it('creates the correct fully-qualified names for functions and actions', async () => {
        const xmlFile = await loadFixture('v4/action-parameters.xml');
        const schema = parse(xmlFile);

        const fqns = schema.schema.actions.map((action) => action.fullyQualifiedName);
        expect(fqns).toMatchInlineSnapshot(`
            [
              "TestService.action(TestService.Entity1)",
              "TestService.action(TestService.Entity2)",
              "TestService.action()",
              "TestService.function(TestService.Entity1,Edm.String,Edm.String)",
              "TestService.function(TestService.Entity2,Edm.String,Edm.String)",
              "TestService.function(Edm.String,Edm.String)",
            ]
        `);
    });

    it('creates the correct fully-qualified names for functions and actions - odata version 4.01', async () => {
        const xmlFile = await loadFixture('v4/action-parameters_4.01.xml');
        const schema = parse(xmlFile);

        const fqns = schema.schema.actions.map((action) => action.fullyQualifiedName);
        expect(fqns).toMatchInlineSnapshot(`
            [
              "TestService.action(TestService.Entity1)",
              "TestService.action(TestService.Entity2)",
              "TestService.action()",
              "TestService.function(TestService.Entity1,Edm.String,Edm.String)",
              "TestService.function(TestService.Entity2,Edm.String,Edm.String)",
              "TestService.function(Edm.String,Edm.String)",
            ]
        `);
    });

    it('can parse an EDMX file with if / eq / ...', async () => {
        const xmlFile = await loadFixture('v4/edmJson.metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        expect(schema).toMatchSnapshot();
    });
});
