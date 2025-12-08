import type { ILogger } from '@ui5/logger';
import type { IncomingMessage } from 'http';

export interface Service {
    urlBasePath?: string;
    urlPath?: string;
    name?: string;
    alias?: string;
    metadataXmlPath?: string;
    mockdataRootPath?: string;
    generateMockData?: boolean;
    metadataCdsPath?: string;
    cdsServiceName?: string;
    debug?: boolean;
    contextBasedIsolation?: boolean;
    resolveExternalServiceReferences?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean;
    noETag?: boolean;
    metadataProcessor?: MetadataProcessorConfig;
}
export interface ConfigService {
    urlBasePath?: string;
    name?: string;
    alias?: string;
    urlPath?: string;
    metadataXmlPath?: string;
    mockdataRootPath?: string;
    mockdataPath?: string;
    generateMockData?: boolean;
    resolveExternalServiceReferences?: boolean;
    metadataCdsPath?: string;
    metadataPath?: string;
    cdsServiceName?: string;
    debug: boolean;
    logger?: ILogger;
    noETag: boolean;
    validateETag: boolean;
    contextBasedIsolation: boolean;
    forceNullableValuesToNull: boolean;
    strictKeyMode: boolean;
    watch: boolean;
    i18nPath: string[];
    metadataProcessor?: MetadataProcessorConfig;
    __captureAndSimulate?: boolean;
}

export interface ConfigAnnotation {
    urlPath: string;
    localPath: string;
    type?: string;
}

export interface StaticFiles {
    urlPath: string;
    localPath: string;
}

type MetadataProcessorConfig = {
    name: string;
    options?: any;
    i18nPath?: string[];
};

export interface BaseServerConfig {
    tsConfigPath?: string;
    strictKeyMode?: boolean;
    debug?: boolean;
    watch?: boolean;
    noETag?: boolean;
    logger?: ILogger;
    validateETag?: boolean;
    contextBasedIsolation?: boolean;
    resolveExternalServiceReferences?: boolean;
    generateMockData?: boolean;
    forceNullableValuesToNull?: boolean;
    fileLoader?: string;
    /** Name of the package to use for the metadata provider **/
    metadataProcessor?: MetadataProcessorConfig;
    plugins?: string[];
}
export interface FolderBasedServerConfig extends BaseServerConfig {
    mockFolder: string;
}
export interface FileBasedServerConfig extends BaseServerConfig {
    service?: Service | Service[];
    services?: Service[];
    annotations?: StaticFiles | StaticFiles[];
}
export type ServerConfig = FolderBasedServerConfig | FileBasedServerConfig;

export type AnnotationConfig = {
    urlPath: string;
    localPath: string;
};
export type ServiceConfig = {
    urlPath: string;
    alias?: string;
    logger?: ILogger;
    metadataPath: string;
    mockdataPath: string;
    i18nPath?: string[];
    generateMockData?: boolean;
    forceNullableValuesToNull?: boolean;
    resolveExternalServiceReferences?: boolean;
    debug?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean; // should be forced to false in browser
    noETag?: boolean; // should be forced to true in browser
    contextBasedIsolation?: boolean;
    validateETag?: boolean;
    metadataProcessor?: MetadataProcessorConfig;
    __captureAndSimulate?: boolean; // experimental, internal use only
};

export type ServiceConfigEx = ServiceConfig & {
    ETag: string;
    _internalName: string; // last part of the urlPath
};

export interface MockserverConfiguration {
    tsConfigPath?: string;
    debug?: boolean;
    logger?: ILogger;
    contextBasedIsolation?: boolean;
    generateMockData?: boolean;
    watch?: boolean;
    strictKeyMode?: boolean;
    annotations?: AnnotationConfig[];
    services: ServiceConfig[];
    /** Name of the package to use for the file loader **/
    fileLoader?: string;
    /** Name of the package to use for the metadata provider **/
    metadataProcessor?: MetadataProcessorConfig;

    /** List of plugins to load */
    plugins?: string[]; // List of plugins to load
}

export interface IFileLoader {
    isTypescriptEnabled?(): boolean;
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

export type MockServerMessage = IncomingMessage & {
    body: string;
};
