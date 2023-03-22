import type { RawMetadata } from '@sap-ux/vocabularies-types';
import { merge, parse } from '../src';
import { loadFixture } from './fixturesHelper';

describe('Merger', function () {
    it('can parse an edmx file', async () => {
        const xmlFile = await loadFixture('merge/metadata.xml');
        const schema: RawMetadata = parse(xmlFile);
        const annoFile = await loadFixture('merge/annotations.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(schema, annoSchema);
        expect(mergeSchema).toMatchSnapshot();
    });
});
