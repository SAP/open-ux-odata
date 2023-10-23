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
    it('can find the source reference', () => {
        const mockData: any = [];
        mockData.__generateMockData = true;
        const myEntityType = metadata.getEntityType('MyRootEntity')!;
        const fileBasedData = new FileBasedMockData(mockData, myEntityType, {} as any, 'default');
        expect(() => {
            fileBasedData.getSourceReference({ ParentNavigationProperty: { value: 'myNavProp' } } as any);
        }).toThrowError();

        expect(
            fileBasedData.getSourceReference({
                ParentNavigationProperty: { value: 'myNavProp', $target: myEntityType.navigationProperties[0] }
            } as any)
        ).toBe('myNavProp_ID');
    });
    it('get hierarchy definition', () => {
        const mockData: any = [];
        mockData.__generateMockData = true;
        const myEntityType = metadata.getEntityType('MyRootEntity')!;
        myEntityType.annotations.Aggregation = {} as any;
        myEntityType.annotations.Hierarchy = {} as any;
        const fileBasedData = new FileBasedMockData(mockData, myEntityType, {} as any, 'default');
        myEntityType.annotations.Aggregation!['RecursiveHierarchy#MyFunHierarchy'] = {
            ParentNavigationProperty: { value: 'myNavProp', $target: myEntityType.navigationProperties[0] }
        } as any;
        myEntityType.annotations.Hierarchy!['RecursiveHierarchy#MyFunHierarchy'] = {} as any;
        const myObj = fileBasedData.getHierarchyDefinition('MyFunHierarchy');
        expect(myObj).toEqual({
            distanceFromRootProperty: false,
            drillStateProperty: false,
            limitedDescendantCountProperty: false,
            matchedDescendantCountProperty: false,
            matchedProperty: false,
            sourceReference: 'myNavProp_ID'
        });
    });
});
