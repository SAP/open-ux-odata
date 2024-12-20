import type { IFileLoader, IMetadataProcessor } from '../index';

export default class MetadataProvider implements IMetadataProcessor {
    constructor(private fileLoader: IFileLoader) {}

    async loadMetadata(filePath: string): Promise<string> {
        return this.fileLoader.loadFile(filePath);
    }

    addI18nPath(_i18Path?: string[]): void {
        // do nothing
    }
}
