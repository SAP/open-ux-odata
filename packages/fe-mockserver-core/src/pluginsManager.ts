import * as path from 'path';
import type { IFileLoader, IMetadataProcessor } from './index';

/**
 * Get the metadata processor for the given name.
 *
 * @param fileLoader The file loader used to load the metadata processor class
 * @param name The name of the metadata processor class
 * @param options The options for the metadata processor
 * @returns The metadata processor
 */
export async function getMetadataProcessor(
    fileLoader: IFileLoader,
    name: string | undefined,
    options?: unknown
): Promise<IMetadataProcessor> {
    const MetadataProcessorClass = (
        await fileLoader.loadJS(name || path.resolve(__dirname, './plugins/metadataProvider'))
    ).default;

    return new MetadataProcessorClass(fileLoader, options) as IMetadataProcessor;
}
