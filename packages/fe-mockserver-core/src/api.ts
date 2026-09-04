import type { ILogger } from '@ui5/logger';
import type { IncomingMessage } from 'http';

export type MockDataGeneratorJsonPrimitive = string | number | boolean | null;
export type MockDataGeneratorJsonValue =
    | MockDataGeneratorJsonPrimitive
    | ReadonlyArray<MockDataGeneratorJsonValue>
    | { readonly [key: string]: MockDataGeneratorJsonValue };

/** Configuration for a service-scoped mock data generator provider. */
export interface MockDataGeneratorConfig {
    /** Package export specifier for the provider implementation. */
    name: string;
    /** Maximum duration of one generation epoch in milliseconds. */
    timeoutMs?: number;
    /** Provider-specific, JSON-compatible options. */
    options?: Readonly<Record<string, MockDataGeneratorJsonValue>>;
}

/** A provider configuration, or an explicit opt-out from an inherited provider. */
export type MockDataGeneratorSetting = MockDataGeneratorConfig | false;

export type MockDataRow = Readonly<Record<string, MockDataGeneratorJsonValue>>;

export interface MockDataGenerationService {
    urlPath: string;
    alias?: string;
    odataVersion: '2.0' | '4.0';
}

export interface MockDataGenerationTarget {
    name: string;
    kind: 'entity-set' | 'singleton';
}

export type MockDataContributorPresence = { present: false } | { present: true; hasInitialData: boolean };

export type ExistingInitialRows =
    | { source: 'none'; present: false }
    | { source: 'json'; present: true; rows: ReadonlyArray<MockDataRow> }
    | { source: 'contributor'; present: true; enumerable: false }
    | { source: 'contributor'; present: true; enumerable: true; rows: ReadonlyArray<MockDataRow> };

export interface ExistingMockData {
    contributor: MockDataContributorPresence;
    initialRows: ExistingInitialRows;
}

export interface MockDataGeneratorLogger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
}

export interface MockDataGenerationContext {
    contractVersion: 1;
    service: Readonly<MockDataGenerationService>;
    metadata: string;
    targets: ReadonlyArray<Readonly<MockDataGenerationTarget>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    logger: MockDataGeneratorLogger;
    signal: AbortSignal;
}

export interface MockDataGeneratorDiagnostic {
    code: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    target?: string;
}

export interface MockDataGenerationResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics?: ReadonlyArray<MockDataGeneratorDiagnostic>;
    fingerprints?: Readonly<Record<string, string>>;
}

export interface IMockDataGenerator {
    readonly apiVersion: 1;
    generate(context: MockDataGenerationContext): Promise<MockDataGenerationResult>;
    dispose?(): void | Promise<void>;
}

export interface MockDataGeneratorConstructor {
    new (options?: Readonly<Record<string, MockDataGeneratorJsonValue>>): IMockDataGenerator;
}

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
    logRequests?: boolean;
    logResponses?: boolean;
    contextBasedIsolation?: boolean;
    resolveExternalServiceReferences?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean;
    noETag?: boolean;
    metadataProcessor?: MetadataProcessorConfig;
    mockDataGenerator?: MockDataGeneratorSetting;
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
    logRequests?: boolean;
    logResponses?: boolean;
    logger?: ILogger;
    noETag: boolean;
    validateETag: boolean;
    contextBasedIsolation: boolean;
    forceNullableValuesToNull: boolean;
    allowInlineNull: boolean;
    strictKeyMode: boolean;
    watch: boolean;
    i18nPath: string[];
    metadataProcessor?: MetadataProcessorConfig;
    mockDataGenerator?: MockDataGeneratorSetting;
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
    logRequests?: boolean;
    logResponses?: boolean;
    watch?: boolean;
    noETag?: boolean;
    logger?: ILogger;
    validateETag?: boolean;
    contextBasedIsolation?: boolean;
    resolveExternalServiceReferences?: boolean;
    generateMockData?: boolean;
    forceNullableValuesToNull?: boolean;
    allowInlineNull?: boolean;
    fileLoader?: string;
    /** Name of the package to use for the metadata provider */
    metadataProcessor?: MetadataProcessorConfig;
    /** Mock data generator inherited by services that do not override it. */
    mockDataGenerator?: MockDataGeneratorSetting;
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
    allowInlineNull?: boolean;
    resolveExternalServiceReferences?: boolean;
    debug?: boolean;
    logRequests?: boolean;
    logResponses?: boolean;
    strictKeyMode?: boolean;
    watch?: boolean; // should be forced to false in browser
    noETag?: boolean; // should be forced to true in browser
    contextBasedIsolation?: boolean;
    validateETag?: boolean;
    metadataProcessor?: MetadataProcessorConfig;
    mockDataGenerator?: MockDataGeneratorSetting;
    __captureAndSimulate?: boolean; // experimental, internal use only
};

export type ServiceConfigEx = ServiceConfig & {
    ETag: string;
    _internalName: string; // last part of the urlPath
};

export interface MockserverConfiguration {
    tsConfigPath?: string;
    debug?: boolean;
    logRequests?: boolean;
    logResponses?: boolean;
    logger?: ILogger;
    contextBasedIsolation?: boolean;
    generateMockData?: boolean;
    watch?: boolean;
    strictKeyMode?: boolean;
    annotations?: AnnotationConfig[];
    services: ServiceConfig[];
    /** Name of the package to use for the file loader */
    fileLoader?: string;
    /** Name of the package to use for the metadata provider */
    metadataProcessor?: MetadataProcessorConfig;
    /** Mock data generator inherited by services that do not override it. */
    mockDataGenerator?: MockDataGeneratorSetting;

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
