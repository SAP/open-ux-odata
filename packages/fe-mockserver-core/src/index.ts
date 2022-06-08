import type { MockserverConfiguration } from './api';
import Router from 'router';
import type { IRouter } from 'router';
import { createMockMiddleware } from './middleware';
import * as path from 'path';

export interface IFileLoader {
    loadFile(filePath: string): Promise<string>;
    exists(filePath: string): Promise<boolean>;
    loadJS(filePath: string): Promise<any>;
}
export interface IMetadataProcessor {
    loadMetadata(filePath: string): Promise<string>;
}
export * from './api';
export { MockDataContributor } from './mockdata/functionBasedMockData';

export default class FEMockserver {
    isReady: Promise<void>;
    private fileLoader: IFileLoader;
    private metadataProvider: IMetadataProcessor;
    private readonly mainRouter: IRouter;

    constructor(private configuration: MockserverConfiguration) {
        this.mainRouter = new Router();
        this.isReady = this.initialize();
    }

    private async initialize() {
        const FileLoaderClass =
            (this.configuration.fileLoader as any) || (await import('./plugins/fileSystemLoader')).default;
        this.fileLoader = new FileLoaderClass() as IFileLoader;

        const MetadataProviderClass = (
            await this.fileLoader.loadJS(
                this.configuration.metadataProcessor?.name || path.resolve(__dirname, './plugins/metadataProvider')
            )
        ).default;
        this.metadataProvider = new MetadataProviderClass(
            this.fileLoader,
            this.configuration.metadataProcessor?.options
        ) as IMetadataProcessor;
        await createMockMiddleware(this.configuration, this.mainRouter, this.fileLoader, this.metadataProvider);
    }

    getRouter() {
        return this.mainRouter;
    }
}
