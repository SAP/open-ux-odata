import type { ILogger } from '@ui5/logger';
import etag from 'etag';
import type { IncomingMessage, ServerResponse } from 'http';
import type { IRouter } from 'router';
import Router from 'router';
import type { MockserverConfiguration, ServiceConfig, ServiceConfigEx } from '../api';
import type { IFileLoader, IMetadataProcessor } from '../index';
import { getLogger } from '../logger';
import { getMetadataProcessor } from '../pluginsManager';
import { catalogServiceRouter } from '../router/catalogServiceRouter';
import { serviceRouter } from '../router/serviceRouter';
import type { DataAccessInterface } from './common';
import { DataAccess } from './dataAccess';
import { ODataMetadata } from './metadata';

export type ServiceRegistration = {
    service: ServiceConfigEx;
    handler: IRouter;
};

/**
 * Escape the path provided for the annotation URL so that they can fit the regex pattern from Router.
 *
 * @param strValue
 * @returns the encoded string
 */
function escapeRegex(strValue: string) {
    return strValue.replace(/[-\\^$+?()|[\]{}]/g, '\\$&');
}

/**
 * Encode single quotes and asterisks in the string.
 *
 * @param str the string to encode
 * @returns the encoded string
 */
function encode(str: string) {
    return str.replaceAll("'", '%27').replaceAll('*', '%2A');
}

async function loadMetadata(service: ServiceConfigEx, metadataProcessor: IMetadataProcessor) {
    const edmx = await metadataProcessor.loadMetadata(service.metadataPath);
    if (!service.noETag) {
        service.ETag = etag(edmx, { weak: true });
    }
    return ODataMetadata.parse(edmx, service.urlPath + '/$metadata', service.ETag);
}

/**
 * Registry for managing services in the mockserver.
 * Handles service creation, middleware setup, and registration on app routers.
 * Also manages cross-service communication by allowing services to access entity interfaces from other services.
 */
export class ServiceRegistry {
    private readonly services: Map<string, DataAccessInterface> = new Map();
    private readonly aliases: Map<string, string> = new Map();
    private readonly registrations: Map<string, ServiceRegistration> = new Map();
    private config: MockserverConfiguration;

    constructor(
        private readonly fileLoader: IFileLoader,
        private readonly metadataProcessor: IMetadataProcessor,
        private readonly app: IRouter
    ) {}
    /**
     * Load and prepare services from MockserverConfiguration.
     * This replaces the createServiceMiddlewares function logic.
     *
     * @param config the mockserver configuration
     */
    public async loadDefaultServices(config: MockserverConfiguration): Promise<void> {
        this.config = config;

        const log = config.logger ?? getLogger('server:ux-fe-mockserver', !!config.debug);

        if (config.services.length === 0) {
            log.info('No services configured. Skipping mockserver setup.');
            return;
        }

        await Promise.all(config.services.map((config) => this.createServiceRegistration(config, log)));
    }

    public async loadServices(serviceConfigs: ServiceConfig[]): Promise<void> {
        const log = this.config.logger ?? getLogger('server:ux-fe-mockserver', !!this.config.debug);

        if (serviceConfigs.length === 0) {
            log.info('No services configured. Skipping mockserver setup.');
            return;
        }

        await Promise.all(serviceConfigs.map((config) => this.createServiceRegistration(config, log)));
    }

    /**
     * Create a service registration for a given service configuration.
     * This includes loading metadata, setting up data access, and registering the service handler.
     * @param mockServiceIn the service configuration to register
     * @param log the logger instance to use for logging
     */
    private async createServiceRegistration(mockServiceIn: ServiceConfig, log: ILogger): Promise<void> {
        const mockService = mockServiceIn as ServiceConfigEx;
        const splittedPath = mockService.urlPath.split('/');
        mockService._internalName = splittedPath[splittedPath.length - 1];

        if (mockService.watch) {
            log.info(`Service ${mockService.urlPath} is running in watch mode`);
        }

        try {
            let processor: IMetadataProcessor = this.metadataProcessor;

            // handle service-specific metadata processor override
            if (mockService.metadataProcessor) {
                log.info(
                    `Loading service-specific metadata processor for ${mockService.urlPath}: ${JSON.stringify(
                        mockService.metadataProcessor
                    )}`
                );
                processor = await getMetadataProcessor(
                    this.fileLoader,
                    mockService.metadataProcessor.name,
                    mockService.metadataProcessor.options,
                    mockServiceIn.i18nPath
                );
            } else {
                processor.addI18nPath(mockServiceIn.i18nPath);
            }

            let metadata = await loadMetadata(mockService, processor);
            const dataAccess = new DataAccess(mockService, metadata, this.fileLoader, this.config.logger, this);

            // Register this service for cross-service access
            this.registerService(mockService.urlPath, dataAccess, mockService.alias);

            if (mockService.watch) {
                const watchPath = [mockService.mockdataPath];
                if (mockService.metadataPath) {
                    watchPath.push(mockService.metadataPath);
                }
                const chokidar = await import('chokidar');
                chokidar
                    .watch(watchPath, {
                        ignoreInitial: true
                    })
                    .on('all', async function (event, path) {
                        log.info(`Change detected for service ${mockService.urlPath}... restarting`);
                        if (mockService.debug) {
                            log.info(`${event} on ${path}`);
                        }
                        metadata = await loadMetadata(mockService, processor);
                        dataAccess.reloadData(metadata);
                        log.info(`Service ${mockService.urlPath} restarted`);
                    });
            }

            const oDataHandlerInstance = await serviceRouter(mockService, dataAccess);
            if (mockService.debug) {
                log.info(`Mockdata location: ${mockService.mockdataPath}`);
                log.info(`Service path: ${mockService.urlPath}`);
            }

            const registration = { service: mockService, handler: oDataHandlerInstance } as ServiceRegistration;
            this.registrations.set(mockService.urlPath, registration);
        } catch (e) {
            log.error(e as any);
            throw new Error('Failed to start ' + JSON.stringify(mockService, null, 4));
        }
    }

    /**
     * Open the service registry by registering all loaded services on the provided app router.
     * This replaces the registerServiceMiddlewares and prepareCatalogAndAnnotation function logic.
     */
    public open(): void {
        if (!this.config || !this.fileLoader) {
            throw new Error('ServiceRegistry must be loaded with services before opening');
        }

        const log = this.config.logger ?? getLogger('server:ux-fe-mockserver', !!this.config.debug);

        // Register each service on the app
        for (const registration of this.registrations.values()) {
            const mockService = registration.service;
            const oDataHandlerInstance = registration.handler;

            if (mockService.contextBasedIsolation || this.config.contextBasedIsolation) {
                const subRouter = new Router();
                try {
                    subRouter.use(mockService.urlPath, oDataHandlerInstance);
                } catch {
                    // Can happen if the URL contains asterisks. As the encoded path is registered below, this might not
                    // be a problem since clients usually call the encoded path.
                    log.error(`Could not register service path: ${mockService.urlPath}`);
                }
                subRouter.use(encode(mockService.urlPath), oDataHandlerInstance);
                this.app.use(/^\/tenant-(\d{1,3})/, subRouter);
            }
            try {
                this.app.use(mockService.urlPath, oDataHandlerInstance);
            } catch {
                // Can happen if the URL contains asterisks. As the encoded path is registered below, this might not
                // be a problem since clients usually call the encoded path.
                log.error(`Could not register path: ${mockService.urlPath}`);
            }
            this.app.use(encode(mockService.urlPath), oDataHandlerInstance);
        }

        // Prepare the catalog service
        this.app.use(
            '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2',
            catalogServiceRouter(this.config.services as ServiceConfigEx[])
        );

        // Prepare the annotation files
        for (const mockAnnotation of this.config.annotations || []) {
            let escapedPath = escapeRegex(mockAnnotation.urlPath);
            if (escapedPath.endsWith('*')) {
                escapedPath += 'rest';
            }
            this.app.get(escapedPath, async (_req: IncomingMessage, res: ServerResponse) => {
                try {
                    const data = await this.fileLoader.loadFile(mockAnnotation.localPath);
                    res.setHeader('Content-Type', 'application/xml');
                    res.write(data);
                    res.end();
                } catch (error) {
                    console.error(error);
                }
            });
        }
    }

    /**
     * Get all service registrations for backward compatibility.
     * @returns Array of service registrations
     */
    public getRegistrations(): ServiceRegistration[] {
        return Array.from(this.registrations.values());
    }

    /**
     * Register a service with its DataAccess instance.
     * @param serviceName - The name/path of the service
     * @param dataAccess - The DataAccess instance for this service
     * @param alias - Optional alias for easier reference
     */
    public registerService(serviceName: string, dataAccess: DataAccessInterface, alias?: string): void {
        this.services.set(serviceName, dataAccess);
        if (alias) {
            this.aliases.set(alias, serviceName);
        }
    }

    /**
     * Get a DataAccess instance for a specific service.
     * @param serviceNameOrAlias - The name/path or alias of the service
     * @returns The DataAccess instance or undefined if not found
     */
    public getService(serviceNameOrAlias: string): DataAccessInterface | undefined {
        // First try to get by alias
        const serviceName = this.aliases.get(serviceNameOrAlias);
        if (serviceName) {
            return this.services.get(serviceName);
        }
        // Fallback to direct service name lookup
        return this.services.get(serviceNameOrAlias);
    }

    public getServices(): ServiceConfig[] {
        return Array.from(this.registrations.values()).map((reg) => reg.service);
    }

    /**
     * Get all registered service names.
     * @returns Array of service names
     */
    public getServiceNames(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Get all registered service aliases.
     * @returns Array of service aliases
     */
    public getServiceAliases(): string[] {
        return Array.from(this.aliases.keys());
    }

    /**
     * Get a formatted list of all services with their aliases (if any).
     * @returns String showing all services and their aliases
     */
    public getServicesWithAliases(): string {
        const serviceNames = Array.from(this.services.keys());
        return serviceNames
            .map((serviceName) => {
                // Find alias for this service
                const alias = Array.from(this.aliases.entries()).find(([, name]) => name === serviceName)?.[0];
                return alias ? `${serviceName} (alias: ${alias})` : serviceName;
            })
            .join(', ');
    }
}
