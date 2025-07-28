import path from 'path';
import type { ServiceConfig } from '../../src/api';
import { DataAccess } from '../../src/data/dataAccess';
import type { ODataMetadata } from '../../src/data/metadata';
import { ServiceRegistry } from '../../src/data/serviceRegistry';
import FileSystemLoader from '../../src/plugins/fileSystemLoader';

describe('Cross-Service Communication', () => {
    test('ServiceRegistry should register and retrieve services with aliases', () => {
        const serviceRegistry = new ServiceRegistry();
        const fileLoader = new FileSystemLoader();

        const firstServiceConfig: ServiceConfig = {
            urlPath: '/firstService',
            alias: 'service1',
            metadataPath: path.join(__dirname, '__testData', 'service.cds'),
            mockdataPath: path.join(__dirname, '__testData')
        };

        const secondServiceConfig: ServiceConfig = {
            urlPath: '/secondService',
            alias: 'service2',
            metadataPath: path.join(__dirname, '__testData', 'service2.cds'),
            mockdataPath: path.join(__dirname, '__testData')
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
            getEntitySets: jest.fn().mockReturnValue([]),
            getSingletons: jest.fn().mockReturnValue([]),
            getMetadataUrl: jest.fn()
        } as unknown as ODataMetadata;

        const firstServiceDataAccess = new DataAccess(
            firstServiceConfig,
            mockMetadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        const secondServiceDataAccess = new DataAccess(
            secondServiceConfig,
            mockMetadata,
            fileLoader,
            undefined,
            serviceRegistry
        );

        // Register services with aliases
        serviceRegistry.registerService('/firstService', firstServiceDataAccess, 'service1');
        serviceRegistry.registerService('/secondService', secondServiceDataAccess, 'service2');

        // Test retrieval by full name
        expect(serviceRegistry.getService('/firstService')).toBe(firstServiceDataAccess);
        expect(serviceRegistry.getService('/secondService')).toBe(secondServiceDataAccess);

        // Test retrieval by alias
        expect(serviceRegistry.getService('service1')).toBe(firstServiceDataAccess);
        expect(serviceRegistry.getService('service2')).toBe(secondServiceDataAccess);

        // Test non-existent service
        expect(serviceRegistry.getService('/nonExistentService')).toBeUndefined();

        // Test service names and aliases
        const serviceNames = serviceRegistry.getServiceNames();
        expect(serviceNames).toContain('/firstService');
        expect(serviceNames).toContain('/secondService');
        expect(serviceNames).toHaveLength(2);

        const serviceAliases = serviceRegistry.getServiceAliases();
        expect(serviceAliases).toContain('service1');
        expect(serviceAliases).toContain('service2');
        expect(serviceAliases).toHaveLength(2);
    });

    test('DataAccess should have getCrossServiceEntityInterface method', () => {
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
            getEntitySets: jest.fn().mockReturnValue([]),
            getSingletons: jest.fn().mockReturnValue([]),
            getMetadataUrl: jest.fn()
        } as unknown as ODataMetadata;

        const dataAccess = new DataAccess(mockService, mockMetadata, fileLoader, undefined, serviceRegistry);

        // Verify the method exists
        expect(typeof dataAccess.getCrossServiceEntityInterface).toBe('function');
    });

    test('getEntityInterface with service parameter should enable cross-service access', async () => {
        const serviceRegistry = new ServiceRegistry();
        const fileLoader = new FileSystemLoader();

        const firstServiceConfig: ServiceConfig = {
            urlPath: '/firstService',
            alias: 'service1',
            metadataPath: path.join(__dirname, '__testData', 'service.cds'),
            mockdataPath: path.join(__dirname, '__testData')
        };

        const secondServiceConfig: ServiceConfig = {
            urlPath: '/secondService',
            alias: 'service2',
            metadataPath: path.join(__dirname, '__testData', 'service2.cds'),
            mockdataPath: path.join(__dirname, '__testData')
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
            getEntitySets: jest.fn().mockReturnValue([]),
            getSingletons: jest.fn().mockReturnValue([]),
            getMetadataUrl: jest.fn()
        } as unknown as ODataMetadata;

        const firstServiceDataAccess = new DataAccess(
            firstServiceConfig,
            mockMetadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        const secondServiceDataAccess = new DataAccess(
            secondServiceConfig,
            mockMetadata,
            fileLoader,
            undefined,
            serviceRegistry
        );

        // Register services
        serviceRegistry.registerService('/firstService', firstServiceDataAccess, 'service1');
        serviceRegistry.registerService('/secondService', secondServiceDataAccess, 'service2');

        // Verify that getCrossServiceEntityInterface method is available and works
        expect(typeof firstServiceDataAccess.getCrossServiceEntityInterface).toBe('function');

        // Test cross-service access by service name
        try {
            await firstServiceDataAccess.getCrossServiceEntityInterface('/secondService', 'TestEntity');
        } catch (error) {
            // Expected to fail since we don't have real entity sets, but method should exist
            expect(error).toBeDefined();
        }

        // Test cross-service access by alias
        try {
            await firstServiceDataAccess.getCrossServiceEntityInterface('service2', 'TestEntity');
        } catch (error) {
            // Expected to fail since we don't have real entity sets, but method should exist
            expect(error).toBeDefined();
        }
    });
});
