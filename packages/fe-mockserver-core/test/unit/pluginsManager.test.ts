import FileSystemLoader from '../../src/plugins/fileSystemLoader';
import MetadataProvider from '../../src/plugins/metadataProvider';
import { getMetadataProcessor } from '../../src/pluginsManager';

describe('getMetadataProcessor', () => {
    const fileLoader = new FileSystemLoader();

    it('should return the default processor if there is no name', async () => {
        const processor = await getMetadataProcessor(fileLoader, undefined);
        expect(processor).toEqual(new MetadataProvider(fileLoader));
    });

    it('should return a new instance every time', async () => {
        // this is because options might be different!
        const processor1 = await getMetadataProcessor(fileLoader, undefined, { a: 1 });
        const processor2 = await getMetadataProcessor(fileLoader, undefined, { a: 2 });
        expect(processor1).not.toBe(processor2);
    });
});

describe('getPluginDefinition', () => {
    const fileLoader = new FileSystemLoader();

    it('should throw an error when no name is provided and default plugin does not exist', async () => {
        const { getPluginDefinition } = await import('../../src/pluginsManager');

        await expect(getPluginDefinition(fileLoader, undefined)).rejects.toThrow();
    });

    it('should throw an error when plugin file does not exist', async () => {
        const { getPluginDefinition } = await import('../../src/pluginsManager');

        await expect(getPluginDefinition(fileLoader, './non-existent-plugin')).rejects.toThrow();
    });

    it('should load a valid plugin and return its definition', async () => {
        const { getPluginDefinition } = await import('../../src/pluginsManager');

        // Create a mock plugin file for testing
        const mockPlugin = {
            name: 'test-plugin',
            services: [
                {
                    urlPath: '/test',
                    metadataPath: '/metadata.xml',
                    mockdataPath: '/mockdata'
                }
            ]
        };

        // Mock the fileLoader.loadJS method to return our mock plugin
        const originalLoadJS = fileLoader.loadJS;
        fileLoader.loadJS = jest.fn().mockResolvedValue(mockPlugin);

        try {
            const plugin = await getPluginDefinition(fileLoader, './test-plugin');

            expect(plugin).toEqual(mockPlugin);
            expect(plugin.name).toBe('test-plugin');
            expect(plugin.services).toHaveLength(1);
            expect(plugin.services[0].urlPath).toBe('/test');
            expect(fileLoader.loadJS).toHaveBeenCalledWith('./test-plugin');
        } finally {
            // Restore original method
            fileLoader.loadJS = originalLoadJS;
        }
    });

    it('should return the plugin definition structure correctly', async () => {
        const { getPluginDefinition } = await import('../../src/pluginsManager');

        const mockPlugin = {
            name: 'multi-service-plugin',
            services: [
                {
                    urlPath: '/service1',
                    metadataPath: '/service1/metadata.xml',
                    mockdataPath: '/service1/mockdata',
                    alias: 'service1'
                },
                {
                    urlPath: '/service2',
                    metadataPath: '/service2/metadata.xml',
                    mockdataPath: '/service2/mockdata',
                    generateMockData: true,
                    debug: false
                }
            ]
        };

        const originalLoadJS = fileLoader.loadJS;
        fileLoader.loadJS = jest.fn().mockResolvedValue(mockPlugin);

        try {
            const plugin = await getPluginDefinition(fileLoader, './multi-service-plugin');

            expect(plugin.name).toBe('multi-service-plugin');
            expect(plugin.services).toHaveLength(2);
            expect(plugin.services[0].alias).toBe('service1');
            expect(plugin.services[1].generateMockData).toBe(true);
            expect(plugin.services[1].debug).toBe(false);
        } finally {
            fileLoader.loadJS = originalLoadJS;
        }
    });
});
