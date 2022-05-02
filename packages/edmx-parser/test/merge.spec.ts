import { loadFixture } from './fixturesHelper';
import { parse, merge } from '../src';
import type { RawMetadata } from '@sap-ux/vocabularies-types';

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
