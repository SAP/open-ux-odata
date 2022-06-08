import type { IncomingMessage } from 'http';

export interface Service {
    urlBasePath?: string;
    urlPath?: string;
    name?: string;
    metadataXmlPath?: string;
    mockdataRootPath?: string;
    generateMockData?: boolean;
    metadataCdsPath?: string;
    cdsServiceName?: string;
    debug?: boolean;
    contextBasedIsolation?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean;
    noETag?: boolean;
}
export interface ConfigService {
    urlBasePath?: string;
    name?: string;
    urlPath?: string;
    metadataXmlPath?: string;
    mockdataRootPath?: string;
    mockdataPath?: string;
    generateMockData?: boolean;
    metadataCdsPath?: string;
    metadataPath?: string;
    cdsServiceName?: string;
    debug: boolean;
    noETag: boolean;
    contextBasedIsolation: boolean;
    strictKeyMode: boolean;
    watch: boolean;
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

export interface BaseServerConfig {
    strictKeyMode?: boolean;
    debug?: boolean;
    watch?: boolean;
    noETag?: boolean;
    contextBasedIsolation?: boolean;
    generateMockData?: boolean;
    fileLoader?: string;
    /** Name of the package to use for the metadata provider **/
    metadataProcessor?: {
        name: string;
        options?: any;
    };
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
    metadataPath: string;
    mockdataPath: string;
    generateMockData?: boolean;
    debug?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean; // should be forced to false in browser
    noETag?: boolean; // should be forced to true in browser
    contextBasedIsolation?: boolean;
};

export type ServiceConfigEx = ServiceConfig & {
    ETag: string;
    _internalName: string; // last part of the urlPath
};

export interface MockserverConfiguration {
    debug?: boolean;
    contextBasedIsolation?: boolean;
    generateMockData?: boolean;
    watch?: boolean;
    strictKeyMode?: boolean;
    annotations?: AnnotationConfig[];
    services: ServiceConfig[];
    /** Name of the package to use for the file loader **/
    fileLoader?: string;
    /** Name of the package to use for the metadata provider **/
    metadataProcessor?: {
        name: string;
        options?: any;
    };
}

export type MockServerMessage = IncomingMessage & {
    body: string;
};
