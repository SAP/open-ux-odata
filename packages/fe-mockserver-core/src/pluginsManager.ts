import * as path from 'path';
import type {
    IFileLoader,
    IMetadataProcessor,
    IMockDataGenerator,
    IMockserverPlugin,
    MockDataGeneratorConfig,
    MockDataGeneratorJsonValue
} from './index';
import { copyAndFreezeOptions } from './mockDataGenerator';

/**
 * Get the metadata processor for the given name.
 *
 * @param fileLoader The file loader used to load the metadata processor class
 * @param name The name of the metadata processor class
 * @param options The options for the metadata processor
 * @param i18nPath The path to the i18n files
 * @returns The metadata processor
 */
export async function getMetadataProcessor(
    fileLoader: IFileLoader,
    name: string | undefined,
    options?: unknown,
    i18nPath?: string[]
): Promise<IMetadataProcessor> {
    const MetadataProcessorClass = await fileLoader.loadJS(
        name || path.resolve(__dirname, './plugins/metadataProvider')
    );

    return new MetadataProcessorClass(fileLoader, options, i18nPath) as IMetadataProcessor;
}

export async function getPluginDefinition(
    fileLoader: IFileLoader,
    name: string | undefined
): Promise<IMockserverPlugin> {
    const PluginClass = await fileLoader.loadJS(name || path.resolve(__dirname, './plugins/pluginDefinition'));
    return PluginClass;
}

/**
 * Load and instantiate a mock data generator provider.
 *
 * @param fileLoader Module loader used by the host
 * @param config Provider configuration
 * @returns A validated provider instance
 */
export async function getMockDataGenerator(
    fileLoader: IFileLoader,
    config: MockDataGeneratorConfig
): Promise<IMockDataGenerator> {
    const Provider = (await fileLoader.loadJS(config.name)) as new (
        options?: Readonly<Record<string, MockDataGeneratorJsonValue>>
    ) => { readonly apiVersion?: unknown; generate?: unknown; dispose?: unknown };
    if (typeof Provider !== 'function') {
        throw new TypeError(`Mock data generator "${config.name}" does not export a constructor`);
    }
    const provider = new Provider(copyAndFreezeOptions(config.options));
    if (provider.apiVersion !== 1) {
        throw new Error(`Unsupported mock data generator API version from "${config.name}"`);
    }
    if (typeof provider.generate !== 'function') {
        throw new TypeError(`Mock data generator "${config.name}" does not implement generate`);
    }
    if (provider.dispose !== undefined && typeof provider.dispose !== 'function') {
        throw new TypeError(`Mock data generator "${config.name}" has an invalid dispose member`);
    }
    return provider as IMockDataGenerator;
}
