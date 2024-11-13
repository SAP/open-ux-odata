import type { IncomingMessage, ServerResponse } from 'http';
import type { MockserverConfiguration, ServiceConfig, ServiceConfigEx } from './api';

import { getLogger } from '@ui5/logger';
import etag from 'etag';
import type { IRouter } from 'router';
import Router from 'router';
import { DataAccess } from './data/dataAccess';
import { ODataMetadata } from './data/metadata';
import type { IFileLoader, IMetadataProcessor } from './index';
import { getMetadataProcessor } from './pluginsManager';
import { catalogServiceRouter } from './router/catalogServiceRouter';
import { serviceRouter } from './router/serviceRouter';

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
 * Encore single quote as string element so that they cna be matched as well.
 *
 * @param str
 * @returns the encoded string
 */
function encode(str: string) {
    return str.replace(/'/g, '%27');
}
async function loadMetadata(service: ServiceConfigEx, metadataProcessor: IMetadataProcessor) {
    const edmx = await metadataProcessor.loadMetadata(service.metadataPath);
    if (!service.noETag) {
        service.ETag = etag(edmx, { weak: true });
    }
    return ODataMetadata.parse(edmx, service.urlPath + '/$metadata', service.ETag);
}

function prepareCatalogAndAnnotation(app: IRouter, newConfig: MockserverConfiguration, fileLoader: IFileLoader) {
    // Prepare the catalog service
    app.use('/sap/opu/odata/IWFND/CATALOGSERVICE;v=2', catalogServiceRouter(newConfig.services as ServiceConfigEx[]));
    // Prepare the annotation files
    for (const mockAnnotation of newConfig.annotations || []) {
        let escapedPath = escapeRegex(mockAnnotation.urlPath);
        if (escapedPath.endsWith('*')) {
            escapedPath += 'rest';
        }
        app.get(escapedPath, async (_req: IncomingMessage, res: ServerResponse) => {
            try {
                const data = await fileLoader.loadFile(mockAnnotation.localPath);
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
 * Creates and configure the different middleware for each mocked service.
 *
 * @param newConfig
 * @param app
 * @param fileLoader
 * @param metadataProcessor
 */
export async function createMockMiddleware(
    newConfig: MockserverConfiguration,
    app: IRouter,
    fileLoader: IFileLoader,
    metadataProcessor: IMetadataProcessor
): Promise<void> {
    const log = getLogger('server:ux-fe-mockserver');

    const oDataHandlerPromises = newConfig.services.map(async (mockServiceIn: ServiceConfig) => {
        const mockService = mockServiceIn as ServiceConfigEx;
        const splittedPath = mockService.urlPath.split('/');
        mockService._internalName = splittedPath[splittedPath.length - 1];
        if (mockService.watch) {
            log.info(`Service ${mockService.urlPath} is running in watch mode`);
        }
        try {
            let processor: IMetadataProcessor = metadataProcessor;

            // handle service-specific metadata processor override
            if (mockService.metadataProcessor) {
                log.info(
                    `Loading service-specific metadata processor for ${mockService.urlPath}: ${JSON.stringify(
                        mockService.metadataProcessor
                    )}`
                );
                processor = await getMetadataProcessor(
                    fileLoader,
                    mockService.metadataProcessor.name,
                    mockService.metadataProcessor.options,
                    mockServiceIn.i18nPath
                );
            }

            let metadata = await loadMetadata(mockService, processor);
            const dataAccess = new DataAccess(mockService, metadata, fileLoader);

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
            if (mockService.contextBasedIsolation || newConfig.contextBasedIsolation) {
                const subRouter = new Router();
                subRouter.use(`${mockService.urlPath}`, oDataHandlerInstance);
                subRouter.use(`${encode(mockService.urlPath)}`, oDataHandlerInstance);
                app.use(/^\/tenant-(\d{1,3})/, subRouter);
            }
            if (mockService.debug) {
                log.info(`Mockdata location: ${mockService.mockdataPath}`);
                log.info(`Service path: ${mockService.urlPath}`);
            }
            app.use(`${mockService.urlPath}`, oDataHandlerInstance);
            app.use(`${encode(mockService.urlPath)}`, oDataHandlerInstance);
        } catch (e) {
            log.error(e as any);
            throw new Error('Failed to start ' + JSON.stringify(mockService, null, 4));
        }
    });
    prepareCatalogAndAnnotation(app, newConfig, fileLoader);

    await Promise.all(oDataHandlerPromises);
}
