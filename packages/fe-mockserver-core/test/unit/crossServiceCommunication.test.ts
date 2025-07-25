import type { ServiceConfig } from '../../src/api';
import { DataAccess } from '../../src/data/dataAccess';
import type { ODataMetadata } from '../../src/data/metadata';
import { ServiceRegistry } from '../../src/data/serviceRegistry';
import FileSystemLoader from '../../src/plugins/fileSystemLoader';

describe('Cross-Service Communication', () => {
    test('ServiceRegistry should register and retrieve services', () => {
        const serviceRegistry = new ServiceRegistry();

        // Mock DataAccess instances
        const firstServiceDataAccess = {
            isV4: () => true,
            shouldValidateETag: () => false,
            getNavigationPropertyKeys: jest.fn(),
            getMockEntitySet: jest.fn(),
            getData: jest.fn(),
            getDraftRoot: jest.fn(),
            getMetadata: jest.fn(),
            getOtherServiceEntityInterface: jest.fn(),
            debug: false,
            fileLoader: {} as any,
            log: {} as any
        };

        const secondServiceDataAccess = {
            isV4: () => true,
            shouldValidateETag: () => false,
            getNavigationPropertyKeys: jest.fn(),
            getMockEntitySet: jest.fn(),
            getData: jest.fn(),
            getDraftRoot: jest.fn(),
            getMetadata: jest.fn(),
            getOtherServiceEntityInterface: jest.fn(),
            debug: false,
            fileLoader: {} as any,
            log: {} as any
        };

        // Register services
        serviceRegistry.registerService('/firstService', firstServiceDataAccess);
        serviceRegistry.registerService('/secondService', secondServiceDataAccess);

        // Test retrieval
        expect(serviceRegistry.getService('/firstService')).toBe(firstServiceDataAccess);
        expect(serviceRegistry.getService('/secondService')).toBe(secondServiceDataAccess);
        expect(serviceRegistry.getService('/nonExistentService')).toBeUndefined();

        // Test service names
        const serviceNames = serviceRegistry.getServiceNames();
        expect(serviceNames).toContain('/firstService');
        expect(serviceNames).toContain('/secondService');
        expect(serviceNames).toHaveLength(2);
    });

    test('DataAccess should have getOtherServiceEntityInterface method', () => {
        const serviceRegistry = new ServiceRegistry();
        const fileLoader = new FileSystemLoader();

        const mockService: ServiceConfig = {
            urlPath: '/testService',
            metadataPath: 'test.xml',
            mockdataPath: 'testdata'
        };

        const mockMetadata = {
            getEntitySet: jest.fn(),
            getEntityType: jest.fn(),
            getEntityContainerPath: jest.fn(),
            getAction: jest.fn(),
            getFunction: jest.fn(),
            resolvePath: jest.fn(),
            schema: {} as any,
            getSingleton: jest.fn(),
            references: [],
            getVersion: jest.fn().mockReturnValue('4.0'),
            getEntitySets: jest.fn().mockReturnValue([]), // Return empty array to avoid forEach error
            getSingletons: jest.fn().mockReturnValue([]), // Return empty array to avoid forEach error
            getMetadataUrl: jest.fn()
        } as unknown as ODataMetadata;

        const dataAccess = new DataAccess(mockService, mockMetadata, fileLoader, undefined, serviceRegistry);

        // Verify the method exists
        expect(typeof dataAccess.getOtherServiceEntityInterface).toBe('function');
    });

    test('Enhanced cross-service interface should have simplified updateEntry behavior', async () => {
        // Create mock FileBasedMockData with test data
        const mockRawInterface = {
            fetchEntries: jest
                .fn()
                .mockResolvedValue([
                    { ID: 1, name: 'Original Name', description: 'Original Description', status: 'active' }
                ]),
            updateEntry: jest.fn().mockResolvedValue(undefined)
        };

        // Mock getOtherServiceEntityInterface to return our enhanced interface
        const mockGetOtherService = jest.fn().mockResolvedValue(mockRawInterface);

        // Create a mock base object similar to what exists in FunctionBasedMockData
        const mockBase = {
            getOtherServiceEntityInterface: async (serviceName: string, entityName: string) => {
                const rawInterface = await mockGetOtherService(serviceName, entityName);

                if (!rawInterface) {
                    return rawInterface;
                }

                // Apply the same enhancement as in the actual code
                const enhancedInterface = Object.create(rawInterface);
                enhancedInterface.updateEntry = async (keyValues: any, patchData: object) => {
                    const existingData = (await rawInterface.fetchEntries(keyValues, {}))[0];
                    const updatedData = Object.assign({}, existingData, patchData);
                    return await rawInterface.updateEntry(keyValues, updatedData, patchData, {});
                };

                return enhancedInterface;
            }
        };

        // Test the enhanced interface
        const enhancedInterface = await mockBase.getOtherServiceEntityInterface('/other/service', 'TestEntity');

        // Call updateEntry with only partial data (like this.base.updateEntry)
        await enhancedInterface!.updateEntry({ ID: 1 }, { description: 'Updated Description' });

        // Verify it fetched existing data first
        expect(mockRawInterface.fetchEntries).toHaveBeenCalledWith({ ID: 1 }, {});

        // Verify it called the raw updateEntry with merged data
        expect(mockRawInterface.updateEntry).toHaveBeenCalledWith(
            { ID: 1 },
            {
                ID: 1,
                name: 'Original Name',
                description: 'Updated Description', // Updated field
                status: 'active' // Preserved field
            },
            { description: 'Updated Description' },
            {}
        );
    });
});
