import type { ILogger } from '@ui5/logger';
import type { FSWatcher } from 'chokidar';
import etag from 'etag';
import type { IncomingMessage, ServerResponse } from 'http';
import type { IRouter } from 'router';
import Router from 'router';
import type {
    IMockDataGenerator,
    MockDataGenerationTarget,
    MockDataGeneratorSetting,
    MockserverConfiguration,
    ServiceConfig,
    ServiceConfigEx
} from '../api';
import type { IFileLoader, IMetadataProcessor } from '../index';
import { getLogger } from '../logger';
import type { PreparedMockDataGeneration } from '../mockDataGenerator';
import { disposeMockDataGenerator, inspectMockDataSources, runMockDataGenerator } from '../mockDataGenerator';
import { getMetadataProcessor, getMockDataGenerator } from '../pluginsManager';
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

function boundedLogText(value: string): string {
    let result = '';
    for (const character of value) {
        if (result.length >= 1_024) {
            break;
        }
        const code = character.charCodeAt(0);
        result += code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? ' ' : character;
    }
    return result.slice(0, 1_024);
}

function mockDataGeneratorLog(event: string, message: string): string {
    return boundedLogText(`mock-data-generator:${event} ${message}`);
}

const MOCK_DATA_GENERATOR_DISPOSAL_TIMEOUT_MS = 5_000;

async function loadMetadata(service: ServiceConfigEx, metadataProcessor: IMetadataProcessor) {
    const edmx = await metadataProcessor.loadMetadata(service.metadataPath);
    const metadataETag = service.noETag ? undefined : etag(edmx, { weak: true });
    return ODataMetadata.parse(edmx, service.urlPath + '/$metadata', metadataETag);
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
    private readonly watchers: FSWatcher[] = [];
    private readonly mockDataGenerators: Set<IMockDataGenerator> = new Set();
    private readonly mockDataGenerationControllers: Set<AbortController> = new Set();
    private readonly activeMockDataGenerations: Set<Promise<unknown>> = new Set();
    private readonly mockDataGeneratorDisposals: Map<IMockDataGenerator, Promise<void>> = new Map();
    private config: MockserverConfiguration;
    private isOpened: boolean = false;
    private disposed: boolean = false;
    private disposePromise?: Promise<void>;

    constructor(
        private readonly fileLoader: IFileLoader,
        private readonly metadataProcessor: IMetadataProcessor,
        private readonly app: IRouter
    ) {}

    private disposeProvider(provider: IMockDataGenerator, log?: ILogger, servicePath?: string): Promise<void> {
        const activeDisposal = this.mockDataGeneratorDisposals.get(provider);
        if (activeDisposal) {
            return activeDisposal;
        }
        this.mockDataGenerators.delete(provider);
        const disposal = disposeMockDataGenerator(provider, MOCK_DATA_GENERATOR_DISPOSAL_TIMEOUT_MS)
            .then((status) => {
                if (status !== 'disposed' && log && servicePath) {
                    log.error(mockDataGeneratorLog('dispose', `service=${servicePath} status=${status}`));
                }
            })
            .finally(() => {
                if (this.mockDataGeneratorDisposals.get(provider) === disposal) {
                    this.mockDataGeneratorDisposals.delete(provider);
                }
            });
        this.mockDataGeneratorDisposals.set(provider, disposal);
        return disposal;
    }

    /**
     * Load and prepare services from MockserverConfiguration.
     * This replaces the createServiceMiddlewares function logic.
     *
     * @param config the mockserver configuration
     */
    public async loadDefaultServices(config: MockserverConfiguration): Promise<void> {
        this.config = config;

        if (this.disposed) {
            return;
        }

        const log = config.logger ?? getLogger('server:ux-fe-mockserver', !!config.debug);

        if (config.services.length === 0) {
            log.info('No services configured. Skipping mockserver setup.');
            return;
        }

        await Promise.all(config.services.map((config) => this.createServiceRegistration(config, log)));
    }

    public async loadServices(serviceConfigs: ServiceConfig[]): Promise<void> {
        if (this.disposed) {
            return;
        }
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
     *
     * @param mockServiceIn the service configuration to register
     * @param log the logger instance to use for logging
     */
    private async createServiceRegistration(
        mockServiceIn: ServiceConfig,
        log: ILogger,
        inheritGlobalMockDataGenerator = true
    ): Promise<void> {
        if (this.disposed) {
            return;
        }
        const mockService = mockServiceIn as ServiceConfigEx;
        let mockDataGenerator: MockDataGeneratorSetting | undefined;
        if (Object.prototype.hasOwnProperty.call(mockServiceIn, 'mockDataGenerator')) {
            mockDataGenerator = mockServiceIn.mockDataGenerator;
        } else if (inheritGlobalMockDataGenerator) {
            mockDataGenerator = this.config.mockDataGenerator;
        }
        if (mockService.logRequests === undefined && this.config.logRequests !== undefined) {
            mockService.logRequests = this.config.logRequests;
            mockService.logResponses = this.config.logResponses;
        }
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
            let metadata: ODataMetadata;
            if (!mockService.metadataPath && !mockService.__captureAndSimulate) {
                throw new Error(`No metadata path provided for service ${mockService.urlPath}`);
            } else if (mockService.__captureAndSimulate) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                metadata = new ODataMetadata(
                    {
                        entitySets: [],
                        entityTypes: []
                    },
                    {},
                    '',
                    ''
                ); // Metadata will be captured at runtime
            } else {
                metadata = await loadMetadata(mockService, processor);
            }

            if (this.disposed) {
                return;
            }

            const prepareMockDataGeneration = async (
                currentMetadata: ODataMetadata,
                signal?: AbortSignal
            ): Promise<PreparedMockDataGeneration> => {
                if (!mockDataGenerator || this.disposed) {
                    return {};
                }
                const epochController = new AbortController();
                const abortFromParent = (): void => epochController.abort(signal?.reason);
                signal?.addEventListener('abort', abortFromParent, { once: true });
                if (signal?.aborted || this.disposed) {
                    abortFromParent();
                }
                this.mockDataGenerationControllers.add(epochController);
                try {
                    const candidateTargets: MockDataGenerationTarget[] = [
                        ...currentMetadata.getEntitySets().map((entitySet) => ({
                            name: entitySet.name,
                            kind: 'entity-set' as const
                        })),
                        ...currentMetadata.getSingletons().map((singleton) => ({
                            name: singleton.name,
                            kind: 'singleton' as const
                        }))
                    ];
                    if (candidateTargets.length === 0 || epochController.signal.aborted) {
                        return {};
                    }
                    const inspection = await inspectMockDataSources(
                        this.fileLoader,
                        mockService.mockdataPath,
                        candidateTargets
                    );
                    if (epochController.signal.aborted) {
                        return {};
                    }
                    if (inspection.targets.length === 0) {
                        return { preparedSources: inspection.preparedSources };
                    }
                    const provider = await getMockDataGenerator(this.fileLoader, mockDataGenerator);
                    this.mockDataGenerators.add(provider);
                    try {
                        if (epochController.signal.aborted) {
                            return {};
                        }
                        const providerStartedAt = performance.now();
                        const generation = runMockDataGenerator(
                            provider,
                            {
                                service: {
                                    urlPath: mockService.urlPath,
                                    alias: mockService.alias,
                                    odataVersion: currentMetadata.getVersion() === '2.0' ? '2.0' : '4.0'
                                },
                                metadata: currentMetadata.getEdmx(),
                                targets: inspection.targets,
                                existingData: inspection.existingData,
                                signal: epochController.signal,
                                logger: {
                                    debug: (message) => {
                                        if (mockService.debug) {
                                            log.info(mockDataGeneratorLog('debug', message));
                                        }
                                    },
                                    info: (message) => log.info(mockDataGeneratorLog('info', message)),
                                    warn: (message) => log.error(mockDataGeneratorLog('warning', message))
                                }
                            },
                            mockDataGenerator.timeoutMs ?? 60_000
                        );
                        this.activeMockDataGenerations.add(generation);
                        const result = await generation.finally(() => {
                            this.activeMockDataGenerations.delete(generation);
                        });
                        result.diagnostics?.forEach((diagnostic) => {
                            const message = mockDataGeneratorLog(
                                'diagnostic',
                                `code=${diagnostic.code} severity=${diagnostic.severity}${
                                    diagnostic.target === undefined ? '' : ` target=${diagnostic.target}`
                                } message=${diagnostic.message}`
                            );
                            if (diagnostic.severity === 'error' || diagnostic.severity === 'warning') {
                                log.error(message);
                            } else {
                                log.info(message);
                            }
                        });
                        log.info(
                            mockDataGeneratorLog(
                                'complete',
                                `service=${mockService.urlPath} durationMs=${Math.max(
                                    0,
                                    performance.now() - providerStartedAt
                                ).toFixed(3)}`
                            )
                        );
                        return { resources: result.resources, preparedSources: inspection.preparedSources };
                    } finally {
                        await this.disposeProvider(provider, log, mockService.urlPath);
                    }
                } catch (error) {
                    if (epochController.signal.aborted) {
                        return {};
                    }
                    log.error(
                        mockDataGeneratorLog(
                            'fallback',
                            `service=${mockService.urlPath} code=GENERATION_FAILED deterministicFallback=true`
                        )
                    );
                    throw error;
                } finally {
                    signal?.removeEventListener('abort', abortFromParent);
                    this.mockDataGenerationControllers.delete(epochController);
                }
            };
            let initialMockDataGeneration: PreparedMockDataGeneration;
            try {
                initialMockDataGeneration = await prepareMockDataGeneration(metadata);
            } catch {
                initialMockDataGeneration = {};
            }

            if (this.disposed) {
                return;
            }

            const dataAccess = new DataAccess(
                mockService,
                metadata,
                this.fileLoader,
                this.config.logger,
                this,
                initialMockDataGeneration.resources,
                initialMockDataGeneration.preparedSources,
                prepareMockDataGeneration
            );
            if (this.disposed) {
                await dataAccess.dispose();
                return;
            }
            if (mockServiceIn.resolveExternalServiceReferences === true && metadata) {
                const references = metadata.getExternalServices(mockService.metadataPath);
                await Promise.allSettled(
                    references.map(async (reference) => {
                        const exists = await this.fileLoader.exists(reference.localPath);
                        if (!exists) {
                            log.info(
                                `External service metadata file not found at "${reference.localPath}". Service "${reference.externalServiceMetadataPath}" will not be provided.`
                            );
                            return undefined;
                        }
                        return this.createServiceRegistration(
                            {
                                metadataPath: reference.localPath,
                                urlPath: reference.externalServiceMetadataPath,
                                generateMockData: false,
                                mockdataPath: reference.dataPath,
                                watch: false
                            },
                            log,
                            false
                        );
                    })
                );
            }
            await dataAccess.readyPromise;

            if (this.disposed) {
                await dataAccess.dispose();
                return;
            }

            // Register this service for cross-service access
            this.registerService(mockService.urlPath, dataAccess, mockService.alias);

            if (mockService.watch) {
                const watchPath = [mockService.mockdataPath];
                if (mockService.metadataPath) {
                    watchPath.push(mockService.metadataPath);
                }
                const chokidar = await import('chokidar');
                if (this.disposed) {
                    await dataAccess.dispose();
                    return;
                }
                const watcher = chokidar
                    .watch(watchPath, {
                        ignoreInitial: true
                    })
                    .on('all', async (event, path) => {
                        if (this.disposed) {
                            return;
                        }
                        try {
                            log.info(`Change detected for service ${mockService.urlPath}... restarting`);
                            if (mockService.debug) {
                                log.info(`${event} on ${path}`);
                            }
                            const nextMetadata = await loadMetadata(mockService, processor);
                            if (this.disposed) {
                                return;
                            }
                            await dataAccess.reloadData(nextMetadata);
                            metadata = nextMetadata;
                            log.info(`Service ${mockService.urlPath} restarted`);
                        } catch {
                            log.error(
                                `Service ${mockService.urlPath} reload failed; retaining the active metadata and data snapshot`
                            );
                        }
                    });
                this.watchers.push(watcher);
            }

            const oDataHandlerInstance = await serviceRouter(mockService, dataAccess);
            if (this.disposed) {
                await dataAccess.dispose();
                return;
            }
            if (mockService.debug) {
                log.info(`Mockdata location: ${mockService.mockdataPath}`);
                log.info(`Service path: ${mockService.urlPath}`);
            }

            const registration = { service: mockService, handler: oDataHandlerInstance } as ServiceRegistration;
            if (this.isOpened) {
                this.attachServiceHandler(registration, log);
            }

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
        if (this.disposed) {
            return;
        }
        if (!this.config || !this.fileLoader) {
            throw new Error('ServiceRegistry must be loaded with services before opening');
        }

        const log = this.config.logger ?? getLogger('server:ux-fe-mockserver', !!this.config.debug);

        // Register each service on the app
        for (const registration of this.registrations.values()) {
            this.attachServiceHandler(registration, log);
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
        this.isOpened = true;
    }

    private attachServiceHandler(registration: ServiceRegistration, log: ILogger) {
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

    /**
     * Get all service registrations for backward compatibility.
     *
     * @returns Array of service registrations
     */
    public getRegistrations(): ServiceRegistration[] {
        return Array.from(this.registrations.values());
    }

    /**
     * Register a service with its DataAccess instance.
     *
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
     *
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
     *
     * @returns Array of service names
     */
    public getServiceNames(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Get all registered service aliases.
     *
     * @returns Array of service aliases
     */
    public getServiceAliases(): string[] {
        return Array.from(this.aliases.keys());
    }

    /**
     * Get a formatted list of all services with their aliases (if any).
     *
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
    public dispose(): Promise<void> {
        this.disposePromise ??= this.disposeInternal();
        return this.disposePromise;
    }

    private async disposeInternal(): Promise<void> {
        this.disposed = true;
        for (const controller of this.mockDataGenerationControllers) {
            controller.abort(new Error('Service registry disposed'));
        }
        await Promise.allSettled(this.watchers.splice(0).map((watcher) => watcher.close()));
        await Promise.allSettled(Array.from(this.services.values()).map((dataAccess) => dataAccess.dispose?.()));
        await Promise.allSettled(Array.from(this.activeMockDataGenerations));
        await Promise.allSettled(Array.from(this.mockDataGenerators).map((provider) => this.disposeProvider(provider)));
        await Promise.allSettled(Array.from(this.mockDataGeneratorDisposals.values()));
        this.mockDataGenerationControllers.clear();
        this.activeMockDataGenerations.clear();
        this.mockDataGenerators.clear();
        this.services.clear();
        this.aliases.clear();
        this.registrations.clear();
    }
}
