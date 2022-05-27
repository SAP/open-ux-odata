import { compileSources, to } from '@sap/cds-compiler';
import { commonCDS } from './common.cds';
import type { IFileLoader, IMetadataProcessor } from '@sap-ux/fe-mockserver-core';

export type CDSMetadataProviderOptions = {
    odataVersion?: 'v2' | 'v4';
};

/**
 * Metadata Processor class dedicated to handling cds source files.
 */
export default class CDSMetadataProvider implements IMetadataProcessor {
    /**
     * Constructor for the CDSMetadataProvider.
     *
     * @param fileLoader the file loader injected by the mockserver
     * @param options a set of options for the plugin
     */
    constructor(private fileLoader: IFileLoader, private options?: CDSMetadataProviderOptions) {}

    /**
     * Load the metadata file (cds or xml) and process it accordingly.
     *
     * @param filePath The location of the file
     * @returns a promise with the EDMX content
     */
    async loadMetadata(filePath: string): Promise<string> {
        const cdsContent = await this.fileLoader.loadFile(filePath);
        if (filePath.endsWith('.xml')) {
            return cdsContent;
        }
        const csn = compileSources({ 'string.cds': cdsContent, 'common.cds': commonCDS }, {});
        const edmx = to.edmx.all(csn, {
            odataVersion: this.options?.odataVersion || 'v4',
            odataForeignKeys: true,
            odataContainment: false
        });
        if (Object.keys(edmx).length > 1) {
            throw new Error(`Compilation failed, you can only define one service, found ${Object.keys(edmx).length}`);
        }
        return edmx[Object.keys(edmx)[0]];
    }
}
