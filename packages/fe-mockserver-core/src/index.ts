import type { IRouter } from 'router';
import Router from 'router';
import type { IFileLoader, IMetadataProcessor, IMockserverPlugin, MockserverConfiguration } from './api';
import { ServiceRegistry } from './data/serviceRegistry';
import { getMetadataProcessor, getPluginDefinition } from './pluginsManager';
import ODataRequest from './request/odataRequest';

export type { Action, NavigationProperty } from '@sap-ux/vocabularies-types';
export * from './api';
export type { PartialReferentialConstraint } from './data/common';
export { ServiceRegistry } from './data/serviceRegistry';
export { MockDataContributor } from './mockdata/functionBasedMockData';
export { MockEntityContainerContributor } from './mockdata/mockEntityContainer';
export { ODataRequest };

export default class FEMockserver {
    isReady: Promise<void>;
    private fileLoader: IFileLoader;
    private metadataProvider: IMetadataProcessor;
    private readonly mainRouter: IRouter;
    private serviceRegistry: ServiceRegistry;
    private plugins: IMockserverPlugin[] = [];

    constructor(private configuration: MockserverConfiguration) {
        this.mainRouter = new Router();
        this.isReady = this.initialize(configuration.tsConfigPath);
    }

    private async initialize(tsConfigPath?: string) {
        const FileLoaderClass =
            (this.configuration.fileLoader as any) || (await import('./plugins/fileSystemLoader')).default;
        this.fileLoader = new FileLoaderClass(tsConfigPath) as IFileLoader;

        this.metadataProvider = await getMetadataProcessor(
            this.fileLoader,
            this.configuration.metadataProcessor?.name,
            this.configuration.metadataProcessor?.options,
            this.configuration.metadataProcessor?.i18nPath
        );
        this.serviceRegistry = new ServiceRegistry(this.fileLoader, this.metadataProvider, this.mainRouter);
        // Load services into the registry
        await this.serviceRegistry.loadDefaultServices(this.configuration);

        if (this.configuration.plugins) {
            this.plugins = await Promise.all(
                this.configuration.plugins?.map((plugin) => {
                    return getPluginDefinition(this.fileLoader, plugin);
                })
            );
            for (const plugin of this.plugins) {
                await this.serviceRegistry.loadServices(plugin.services);
            }
        }
        // Open the registry to register all services on the main router
        this.serviceRegistry.open();
    }

    getServiceRegistry() {
        return this.serviceRegistry;
    }

    getRouter() {
        return this.mainRouter;
    }
}
