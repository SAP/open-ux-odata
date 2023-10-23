import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import { ServiceConfig } from '../../../src';
import { EntitySetInterface } from '../../../src/data/common';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import { FileBasedMockData } from '../../../src/mockdata/fileBasedMockData';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';
describe('Function Based Mock Data', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'mockdata');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    let myEntitySet: EntitySetInterface;
    let myOtherEntitySet: EntitySetInterface;
    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        myEntitySet = await dataAccess.getMockEntitySet('MyRootEntity');
        myOtherEntitySet = await dataAccess.getMockEntitySet('MySecondEntity');
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
        expect(allEntries).toMatchSnapshot();
        expect(allEntries[0].Value.length).toBeLessThan(5);
        expect(allEntries[0].complexComputedNotNullProperty.textDescription.length).toBeLessThan(6);
    });
});
