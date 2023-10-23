import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import { FileBasedMockData, isPathExpression, isPropertyPathExpression } from '../../../src/mockdata/fileBasedMockData';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';
describe('File Based Mock Data', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'mockdata');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    it('can generate data', () => {
        const mockData: any = [];
        mockData.__generateMockData = true;
        const fileBasedData = new FileBasedMockData(
            mockData,
            metadata.getEntityType('MyRootEntity')!,
            {} as any,
            'default'
        );
        const allEntries = fileBasedData.getAllEntries({} as any);
        expect(allEntries[0].Value.length).toBeLessThan(5);
        expect(allEntries[0].complexComputedNotNullProperty.textDescription.length).toBeLessThan(6);
    });
    it('can recognize propertyPaths', () => {
        expect(isPropertyPathExpression(undefined)).toBe(false);
        expect(isPropertyPathExpression({})).toBe(false);
        expect(isPropertyPathExpression({ type: 'PropertyPath' })).toBe(true);
    });
    it('can recognize paths', () => {
        expect(isPathExpression(undefined)).toBe(false);
        expect(isPathExpression({})).toBe(false);
        expect(isPathExpression({ type: 'Path' })).toBe(true);
    });
});
