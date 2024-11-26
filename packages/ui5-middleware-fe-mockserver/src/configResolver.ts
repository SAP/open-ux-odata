import type {
    ConfigAnnotation,
    ConfigService,
    FileBasedServerConfig,
    FolderBasedServerConfig,
    MockserverConfiguration,
    ServerConfig,
    ServiceConfig
} from '@sap-ux/fe-mockserver-core';
import fs from 'fs';
import path from 'path';

function isFolderBasedConfig(serverConfig: ServerConfig): serverConfig is FolderBasedServerConfig {
    return (serverConfig as FolderBasedServerConfig).mockFolder !== undefined;
}

function isAnnotationConfig(serverConfig: ConfigAnnotation | ConfigService): serverConfig is ConfigAnnotation {
    return (serverConfig as ConfigAnnotation).type?.toLowerCase() === 'annotation';
}

function prepareFolderBasedConfig(
    currentBasePath: string,
    inAnnotations: ConfigAnnotation[],
    inServices: ConfigService[]
) {
    let mockConfig;
    if (fs.existsSync(path.join(currentBasePath, 'config.js'))) {
        mockConfig = require(path.join(currentBasePath, 'config.js'));
    } else {
        mockConfig = JSON.parse(fs.readFileSync(path.join(currentBasePath, 'config.json')).toString('utf-8'));
    }
    mockConfig.forEach((mockConfigEntry: ConfigAnnotation | ConfigService) => {
        if (isAnnotationConfig(mockConfigEntry)) {
            delete mockConfigEntry.type;
            inAnnotations.push(mockConfigEntry);
        } else {
            inServices.push(mockConfigEntry);
        }
    });
}

function prepareFileBasedConfig(inConfig: FileBasedServerConfig) {
    let inServiceFromConfig = inConfig.service ? inConfig.service : inConfig.services;
    if (!Array.isArray(inServiceFromConfig) && inServiceFromConfig !== undefined) {
        inServiceFromConfig = [inServiceFromConfig];
    } else if (inServiceFromConfig === undefined) {
        inServiceFromConfig = [];
    }
    const inServices = inServiceFromConfig as ConfigService[];
    let inAnnotationsFromConfig = inConfig.annotations;
    if (!Array.isArray(inAnnotationsFromConfig) && inAnnotationsFromConfig !== undefined) {
        inAnnotationsFromConfig = [inAnnotationsFromConfig];
    } else if (inAnnotationsFromConfig === undefined) {
        inAnnotationsFromConfig = [];
    }

    const inAnnotations = inAnnotationsFromConfig as ConfigAnnotation[];
    inAnnotations.forEach((annotationConfig: ConfigAnnotation) => annotationConfig.type === 'Annotation');
    return { inServices, inAnnotations };
}

/**
 * Ensure that each service configuration is properly resolved including all file path.
 *
 * @param inServices
 * @param currentBasePath
 * @param inConfig
 * @returns an up to date configuration for one service
 */
function processServicesConfig(
    inServices: ConfigService[],
    currentBasePath: string,
    inConfig: FileBasedServerConfig | FolderBasedServerConfig
) {
    return inServices.map((inService) => {
        const myServiceConfig: ServiceConfig = {
            watch: inService.watch,
            urlPath: inService.urlPath,
            noETag: inService.noETag,
            validateETag: inService.validateETag,
            logger: inService.logger,
            debug: inService.debug,
            strictKeyMode: inService.strictKeyMode,
            generateMockData: inService.generateMockData,
            contextBasedIsolation: inService.contextBasedIsolation,
            forceNullableValuesToNull: inService.forceNullableValuesToNull,
            metadataProcessor: inService.metadataProcessor,
            i18nPath: inService.i18nPath
        } as any;
        const metadataPath = inService.metadataPath || inService.metadataXmlPath || inService.metadataCdsPath;
        if (metadataPath) {
            myServiceConfig.metadataPath = path.resolve(currentBasePath, metadataPath);
        }
        const mockDataPath = inService.mockdataPath || inService.mockdataRootPath;
        if (mockDataPath) {
            myServiceConfig.mockdataPath = path.resolve(currentBasePath, mockDataPath);
        } else {
            // we default to the folder of the metadata
            myServiceConfig.mockdataPath = path.dirname(myServiceConfig.metadataPath);
        }

        if (!inService.urlPath) {
            myServiceConfig.urlPath = inService.urlBasePath + '/' + inService.name;
        }

        if (inConfig.watch && !inService.hasOwnProperty('watch')) {
            myServiceConfig.watch = inConfig.watch;
        }
        if (inConfig.noETag && !inService.hasOwnProperty('noETag')) {
            myServiceConfig.noETag = inConfig.noETag;
        }
        if (inConfig.debug && !inService.hasOwnProperty('debug')) {
            myServiceConfig.debug = inConfig.debug;
        }
        if (inConfig.logger && !inService.hasOwnProperty('logger')) {
            myServiceConfig.logger = inConfig.logger;
        }
        if (inConfig.strictKeyMode && !inService.hasOwnProperty('strictKeyMode')) {
            myServiceConfig.strictKeyMode = inConfig.strictKeyMode;
        }
        if (inConfig.contextBasedIsolation && !inService.hasOwnProperty('contextBasedIsolation')) {
            myServiceConfig.contextBasedIsolation = inConfig.contextBasedIsolation;
        }
        if (inConfig.generateMockData && !inService.hasOwnProperty('generateMockData')) {
            myServiceConfig.generateMockData = inConfig.generateMockData;
        }
        if (inConfig.forceNullableValuesToNull && !inService.hasOwnProperty('forceNullableValuesToNull')) {
            myServiceConfig.forceNullableValuesToNull = inConfig.forceNullableValuesToNull;
        }
        if (inConfig.validateETag && !inService.hasOwnProperty('validateETag')) {
            myServiceConfig.validateETag = inConfig.validateETag;
        }

        return myServiceConfig;
    });
}

export function resolveConfig(inConfig: ServerConfig, basePath: string): MockserverConfiguration {
    let inServices: ConfigService[] = [];
    let inAnnotations: ConfigAnnotation[] = [];
    let currentBasePath: string = basePath;
    if (isFolderBasedConfig(inConfig)) {
        inConfig.mockFolder = path.resolve(basePath, inConfig.mockFolder);
        currentBasePath = inConfig.mockFolder;
        prepareFolderBasedConfig(currentBasePath, inAnnotations, inServices);
    } else {
        const __ret = prepareFileBasedConfig(inConfig);
        inServices = __ret.inServices;
        inAnnotations = __ret.inAnnotations;
    }
    const annotations = inAnnotations.map((inAnnotation) => {
        inAnnotation.localPath = path.resolve(currentBasePath, inAnnotation.localPath);
        return inAnnotation;
    });
    const services = processServicesConfig(inServices, currentBasePath, inConfig);

    return {
        contextBasedIsolation: !!inConfig.contextBasedIsolation,
        watch: !!inConfig.watch,
        strictKeyMode: !!inConfig.strictKeyMode,
        debug: !!inConfig.debug,
        logger: inConfig.logger,
        generateMockData: !!inConfig.generateMockData,
        annotations: annotations,
        services: services,
        fileLoader: inConfig.fileLoader,
        metadataProcessor: inConfig.metadataProcessor
    };
}
