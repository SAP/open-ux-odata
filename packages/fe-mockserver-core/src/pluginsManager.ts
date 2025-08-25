import * as path from 'path';
import type { IFileLoader, IMetadataProcessor, IMockserverPlugin } from './index';

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
    const MetadataProcessorClass = (
        await fileLoader.loadJS(name || path.resolve(__dirname, './plugins/metadataProvider'))
    ).default;

    return new MetadataProcessorClass(fileLoader, options, i18nPath) as IMetadataProcessor;
}

export async function getPluginDefinition(
    fileLoader: IFileLoader,
    name: string | undefined
): Promise<IMockserverPlugin> {
    const PluginClass = await fileLoader.loadJS(name || path.resolve(__dirname, './plugins/pluginDefinition'));
    return PluginClass;
}
