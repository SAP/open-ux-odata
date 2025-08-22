import type { IRouter } from 'router';
import Router from 'router';
import type { MockserverConfiguration, ServiceConfig } from './api';
import { ServiceRegistry } from './data/serviceRegistry';
import { getMetadataProcessor, getPluginDefinition } from './pluginsManager';

export interface IFileLoader {
    loadFile(filePath: string): Promise<string>;
    loadFileSync(filePath: string): string;
    exists(filePath: string): Promise<boolean>;
    existsSync(filePath: string): boolean;
    syncSupported(): boolean;
    loadJS(filePath: string): Promise<any>;
}
export interface IMetadataProcessor {
    loadMetadata(filePath: string): Promise<string>;
    addI18nPath(i18Path?: string[]): void;
}

export interface IMockserverPlugin {
    name: string;
    services: ServiceConfig[];
}

export * from './api';
export { ServiceRegistry } from './data/serviceRegistry';
export { MockDataContributor } from './mockdata/functionBasedMockData';

export default class FEMockserver {
    isReady: Promise<void>;
    private fileLoader: IFileLoader;
    private metadataProvider: IMetadataProcessor;
    private readonly mainRouter: IRouter;
    private serviceRegistry: ServiceRegistry;
    private plugins: IMockserverPlugin[] = [];

    constructor(private configuration: MockserverConfiguration) {
        this.mainRouter = new Router();
        this.isReady = this.initialize();
    }

    private async initialize() {
        const FileLoaderClass =
            (this.configuration.fileLoader as any) || (await import('./plugins/fileSystemLoader')).default;
        this.fileLoader = new FileLoaderClass() as IFileLoader;

        this.metadataProvider = await getMetadataProcessor(
            this.fileLoader,
            this.configuration.metadataProcessor?.name,
            this.configuration.metadataProcessor?.options,
            this.configuration.metadataProcessor?.i18nPath
        );
        this.serviceRegistry = new ServiceRegistry(this.fileLoader, this.metadataProvider, this.mainRouter);
        // Load services into the registry
        await this.serviceRegistry.loadServices(this.configuration);

        if (this.configuration.plugins) {
            this.plugins = await Promise.all(
                this.configuration.plugins?.map((plugin) => {
                    return getPluginDefinition(this.fileLoader, plugin);
                })
            );
            for (const plugin of this.plugins) {
                await this.serviceRegistry.loadService(plugin.services);
            }
        }
        // Open the registry to register all services on the main router
        this.serviceRegistry.open();
    }

    getRouter() {
        return this.mainRouter;
    }
}
