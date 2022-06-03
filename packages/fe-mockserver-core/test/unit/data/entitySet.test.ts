import { MockDataEntitySet } from '../../../src/data/entitySets/entitySet';
import { parseFilter } from '../../../src/request/filterParser';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import type { ServiceConfig } from '../../../src';
import ODataRequest from '../../../src/request/odataRequest';

let metadata!: ODataMetadata;
const baseUrl = '/sap/fe/mock';
describe('EntitySet', () => {
    const fileLoader = new FileSystemLoader();
    const baseDir = join(__dirname, 'data');
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    let dataAccess: DataAccess;
    beforeAll(async () => {
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
    });
    describe('filtering', () => {
        it('works on deep lambda expression', async () => {
            const myEntitySet = new MockDataEntitySet(
                baseDir,
                {
                    name: 'MyEntityData',
                    entityType: {
                        entityProperties: []
                    },
                    _type: 'EntitySet'
                } as any,
                dataAccess,
                false,
                true
            );
            await myEntitySet.readyPromise;
            const v4ComplexLambda = parseFilter(
                "((ArrayData/any(t:t/SubArray/any(a0:a0/Name eq 'Something' and a0/SubSubArray/any(a1:a1/Value ge '20220600') and a0/SubSubArray/any(a1:a1/Value le '20220603'))))) and (BaseData eq 'FirstCheck')"
            );
            const fakeRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: 'MyEntityData'
                },
                dataAccess
            );
            const mockData = myEntitySet.getMockData('default').getAllEntries(fakeRequest) as any;
            let filteredData = myEntitySet.checkFilter(mockData[0], v4ComplexLambda, 'default', fakeRequest);
            expect(filteredData).toBe(true);
            filteredData = myEntitySet.checkFilter(mockData[1], v4ComplexLambda, 'default', fakeRequest);
            expect(filteredData).toBe(true);
            filteredData = myEntitySet.checkFilter(mockData[2], v4ComplexLambda, 'default', fakeRequest);
            expect(filteredData).toBe(false);
            filteredData = myEntitySet.checkFilter(mockData[3], v4ComplexLambda, 'default', fakeRequest);
            expect(filteredData).toBe(false);
        });
    });
});
