import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { MockDataEntitySet } from '../../../src/data/entitySets/entitySet';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import { parseFilter } from '../../../src/request/filterParser';
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
            )!;
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
            const v4SimpleLambda = parseFilter('ArrayData/any()')!;
            filteredData = myEntitySet.checkFilter(mockData[0], v4SimpleLambda, 'default', fakeRequest);
            expect(filteredData).toBe(true);
        });
        it('works on deep lambda expression with methods', async () => {
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
                "((ArrayData/any(t:t/SubArray/any(a0:contains(a0/Name,'Something') and a0/SubSubArray/any(a1:a1/Value ge '20220600') and a0/SubSubArray/any(a1:a1/Value le '20220603'))))) and (BaseData eq 'FirstCheck')"
            )!;
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
            expect(filteredData).toBe(true);
            filteredData = myEntitySet.checkFilter(mockData[3], v4ComplexLambda, 'default', fakeRequest);
            expect(filteredData).toBe(false);
        });
        it('works on `in` operator', async () => {
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
            const v4InFilter = parseFilter("Value in ('20220601','20220608')")!;
            const fakeRequest = new ODataRequest(
                {
                    method: 'GET',
                    url: 'MyEntityData'
                },
                dataAccess
            );
            const mockData = myEntitySet.getMockData('default').getAllEntries(fakeRequest) as any;
            let filteredData = myEntitySet.checkFilter(mockData[0], v4InFilter, 'default', fakeRequest);
            expect(filteredData).toBe(true);
            filteredData = myEntitySet.checkFilter(mockData[1], v4InFilter, 'default', fakeRequest);
            expect(filteredData).toBe(false);
            filteredData = myEntitySet.checkFilter(mockData[2], v4InFilter, 'default', fakeRequest);
            expect(filteredData).toBe(true);
            filteredData = myEntitySet.checkFilter(mockData[3], v4InFilter, 'default', fakeRequest);
            expect(filteredData).toBe(false);
        });
    });
});
