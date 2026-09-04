import path from 'path';
import type {
    ExistingMockData,
    IMockDataGenerator,
    MockDataGenerationService,
    MockDataGenerationTarget,
    MockDataGeneratorLogger
} from '../../src/api';
import type { DataAccess } from '../../src/data/dataAccess';
import FEMockserver from '../../src/index';
import { createMockDataGenerationContext, runMockDataGenerator } from '../../src/mockDataGenerator';
import FileSystemLoader from '../../src/plugins/fileSystemLoader';
import ODataRequest from '../../src/request/odataRequest';

describe('mock data generator host contract', () => {
    const createRunInput = (logger: MockDataGeneratorLogger) => ({
        service: {
            urlPath: '/sap/opu/odata/example',
            alias: 'example',
            odataVersion: '4.0' as const
        },
        metadata: '<edmx />',
        targets: [{ name: 'Products', kind: 'entity-set' as const }],
        existingData: {
            Products: {
                contributor: { present: false as const },
                initialRows: { source: 'none' as const, present: false as const }
            }
        },
        logger
    });

    it('copies data, preserves cancellation, and bounds provider log messages', () => {
        const service: MockDataGenerationService = {
            urlPath: '/sap/opu/odata/example',
            alias: 'example',
            odataVersion: '4.0'
        };
        const targets: MockDataGenerationTarget[] = [{ name: 'Products', kind: 'entity-set' }];
        const existingData: Record<string, ExistingMockData> = {
            Products: {
                contributor: { present: false },
                initialRows: {
                    source: 'json',
                    present: true,
                    rows: [{ ID: 1, Name: 'Existing' }]
                }
            }
        };
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const abortController = new AbortController();

        const context = createMockDataGenerationContext({
            service,
            metadata: '<edmx />',
            targets,
            existingData,
            logger,
            signal: abortController.signal
        });

        service.alias = 'changed';
        targets[0].name = 'Changed';
        const originalRows = existingData.Products.initialRows;
        if (originalRows.present && originalRows.source === 'json') {
            (originalRows.rows[0] as { Name: string }).Name = 'Changed';
        }

        expect(context.service.alias).toBe('example');
        expect(context.targets[0].name).toBe('Products');
        expect(context.existingData.Products.initialRows).toMatchObject({
            rows: [{ ID: 1, Name: 'Existing' }]
        });
        expect(Object.isFrozen(context)).toBe(true);
        expect(Object.isFrozen(context.service)).toBe(true);
        expect(Object.isFrozen(context.targets)).toBe(true);
        expect(Object.isFrozen(context.targets[0])).toBe(true);
        expect(Object.isFrozen(context.existingData.Products)).toBe(true);
        const unsafeMessage = `line one\nline two ${'x'.repeat(2_000)}`;
        context.logger.info(unsafeMessage);
        for (let index = 0; index < 150; index += 1) {
            context.logger.info(`event ${index}`);
        }
        expect(logger.info).toHaveBeenCalledTimes(100);
        const forwardedMessage = (logger.info as jest.Mock).mock.calls[0][0] as string;
        expect(forwardedMessage).not.toMatch(/[\r\n]/);
        expect(forwardedMessage.length).toBeLessThanOrEqual(1_024);
        expect(context.logger).not.toBe(logger);
        expect(context.signal).toBe(abortController.signal);

        abortController.abort();
        expect(context.signal.aborted).toBe(true);
    });

    it('validates and freezes a complete provider result while ignoring unknown resources', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const rows = [{ ID: 1, Name: 'Generated' }];
        const provider: IMockDataGenerator = {
            apiVersion: 1,
            generate: jest.fn().mockResolvedValue({
                resources: {
                    Products: rows,
                    Unknown: [{ ID: 9 }]
                }
            })
        };

        const result = await runMockDataGenerator(provider, createRunInput(logger), 1_000);
        rows[0].Name = 'Changed';

        expect(result.resources).toEqual({ Products: [{ ID: 1, Name: 'Generated' }] });
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.resources)).toBe(true);
        expect(Object.isFrozen(result.resources.Products)).toBe(true);
        expect(Object.isFrozen(result.resources.Products[0])).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
            'Mock data generator returned unknown resource "Unknown"; ignoring it'
        );
    });

    it('rejects the entire result when a known resource is malformed', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const provider = {
            apiVersion: 1,
            generate: jest.fn().mockResolvedValue({
                resources: {
                    Products: [{ ID: 1 }, new Date()]
                }
            })
        } as unknown as IMockDataGenerator;

        await expect(runMockDataGenerator(provider, createRunInput(logger), 1_000)).rejects.toThrow(
            'Products must contain only plain row objects'
        );
    });

    it('enforces row, diagnostic, and fingerprint result bounds', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const cases: Array<{ label: string; result: unknown; error: string }> = [
            {
                label: 'rows',
                result: { resources: { Products: Array.from({ length: 10_001 }, (_, ID) => ({ ID })) } },
                error: 'at most 10000 rows'
            },
            {
                label: 'diagnostics',
                result: {
                    resources: {},
                    diagnostics: Array.from({ length: 101 }, () => ({ code: 'TEST', severity: 'info', message: 'x' }))
                },
                error: 'at most 100 diagnostics'
            },
            {
                label: 'diagnostic message',
                result: {
                    resources: {},
                    diagnostics: [{ code: 'TEST', severity: 'info', message: 'x'.repeat(1_025) }]
                },
                error: 'message exceeds 1024 characters'
            },
            {
                label: 'fingerprints',
                result: {
                    resources: {},
                    fingerprints: Object.fromEntries(
                        Array.from({ length: 33 }, (_, index) => [`fingerprint-${index}`, 'a'.repeat(64)])
                    )
                },
                error: 'at most 32 fingerprints'
            }
        ];

        for (const testCase of cases) {
            const provider = {
                apiVersion: 1,
                generate: jest.fn().mockResolvedValue(testCase.result)
            } as unknown as IMockDataGenerator;
            await expect(runMockDataGenerator(provider, createRunInput(logger), 1_000)).rejects.toThrow(testCase.error);
        }
    });

    it.each([
        ['bigint', BigInt(1)],
        ['symbol', Symbol('unsafe')],
        ['function', () => 'unsafe'],
        ['non-finite number', Number.NaN]
    ])('rejects a non-JSON %s provider value', async (_label, unsafeValue) => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const provider = {
            apiVersion: 1,
            generate: jest.fn().mockResolvedValue({ resources: { Products: [{ unsafeValue }] } })
        } as unknown as IMockDataGenerator;

        await expect(runMockDataGenerator(provider, createRunInput(logger), 1_000)).rejects.toThrow(
            /JSON-compatible|non-finite/
        );
    });

    it('rejects accessor properties without invoking them', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const getter = jest.fn(() => 'must not run');
        const row = { ID: 1 } as Record<string, unknown>;
        Object.defineProperty(row, 'unsafe', { enumerable: true, get: getter });
        const provider = {
            apiVersion: 1,
            generate: jest.fn().mockResolvedValue({ resources: { Products: [row] } })
        } as unknown as IMockDataGenerator;

        await expect(runMockDataGenerator(provider, createRunInput(logger), 1_000)).rejects.toThrow('accessors');
        expect(getter).not.toHaveBeenCalled();
    });

    it('copies __proto__ as inert data without changing result prototypes', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const row = Object.create(null) as Record<string, unknown>;
        row.ID = 1;
        Object.defineProperty(row, '__proto__', {
            value: { polluted: true },
            enumerable: true
        });
        const provider = {
            apiVersion: 1,
            generate: jest.fn().mockResolvedValue({ resources: { Products: [row] } })
        } as unknown as IMockDataGenerator;

        const result = await runMockDataGenerator(provider, createRunInput(logger), 1_000);

        expect(Object.getPrototypeOf(result.resources)).toBeNull();
        expect(Object.getPrototypeOf(result.resources.Products[0])).toBeNull();
        expect(Object.prototype.hasOwnProperty.call(result.resources.Products[0], '__proto__')).toBe(true);
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it('rejects a provider that returns only after the monotonic host deadline', async () => {
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        const provider: IMockDataGenerator = {
            apiVersion: 1,
            generate: jest.fn(async () => {
                const deadline = performance.now() + 10;
                while (performance.now() < deadline) {
                    // Deliberately block the timer to prove the monotonic check is independent of timer scheduling.
                }
                return { resources: {} };
            })
        };

        await expect(runMockDataGenerator(provider, createRunInput(logger), 1)).rejects.toThrow('timed out after 1 ms');
    });

    it('aborts generation at the host deadline', async () => {
        jest.useFakeTimers();
        const logger: MockDataGeneratorLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        let observedSignal: AbortSignal | undefined;
        const provider: IMockDataGenerator = {
            apiVersion: 1,
            generate: jest.fn().mockImplementation(
                (context) =>
                    new Promise((resolve) => {
                        observedSignal = context.signal;
                        context.signal.addEventListener('abort', () => resolve({ resources: {} }));
                    })
            )
        };

        try {
            const resultPromise = runMockDataGenerator(provider, createRunInput(logger), 100);
            const timeoutExpectation = expect(resultPromise).rejects.toThrow('timed out after 100 ms');
            await jest.advanceTimersByTimeAsync(100);

            await timeoutExpectation;
            expect(observedSignal?.aborted).toBe(true);
        } finally {
            jest.useRealTimers();
        }
    });

    it('generates missing service rows before the service becomes ready', async () => {
        const hostLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        const generate = jest.fn().mockResolvedValue({
            resources: {
                RootElement: [
                    {
                        ID: 77,
                        Prop1: 'Realistic product',
                        Prop2: 'Generated for this service'
                    }
                ]
            }
        });
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-mock-data-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-provider-data'),
                    urlPath: '/sap/fe/mock-data-generator',
                    mockDataGenerator: {
                        name: '@sap-ux/test-mock-data-generator',
                        timeoutMs: 1_000
                    }
                }
            ],
            annotations: [],
            logger: hostLogger as never,
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds'
            },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            const dataAccess = mockServer.getServiceRegistry().getService('/sap/fe/mock-data-generator');
            expect(dataAccess).toBeDefined();
            if (!dataAccess) {
                throw new Error('Expected generated service data access');
            }
            const rootEntitySet = await dataAccess.getMockEntitySet('RootElement');
            const request = new ODataRequest(
                {
                    method: 'GET',
                    url: 'RootElement'
                },
                dataAccess as DataAccess
            );
            const rows = await rootEntitySet.getMockData('tenant-default').getAllEntries(request);

            expect(generate).toHaveBeenCalledTimes(1);
            expect(generate.mock.calls[0][0].targets).toEqual(
                expect.arrayContaining([{ name: 'RootElement', kind: 'entity-set' }])
            );
            expect(rows).toEqual([
                expect.objectContaining({
                    ID: 77,
                    Prop1: 'Realistic product'
                })
            ]);
            expect(hostLogger.info).toHaveBeenCalledWith(
                expect.stringMatching(
                    /^mock-data-generator:complete service=\/sap\/fe\/mock-data-generator durationMs=\d+\.\d{3}$/u
                )
            );
        } finally {
            await mockServer.dispose();
        }
    });

    it('inherits a global provider, honors a service opt-out, and disposes the created instance', async () => {
        const generate = jest.fn().mockResolvedValue({ resources: {} });
        const dispose = jest.fn();
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;
            readonly dispose = dispose;
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-global-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-inherited-data'),
                    urlPath: '/sap/fe/inherited-generator'
                },
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-disabled-data'),
                    urlPath: '/sap/fe/disabled-generator',
                    mockDataGenerator: false
                }
            ],
            annotations: [],
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds'
            },
            mockDataGenerator: {
                name: '@sap-ux/test-global-generator',
                timeoutMs: 1_000
            },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            expect(generate).toHaveBeenCalledTimes(1);
            expect(generate.mock.calls[0][0].service.urlPath).toBe('/sap/fe/inherited-generator');
        } finally {
            await mockServer.dispose();
        }
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('does not load a provider when every target already has authored initial data', async () => {
        const providerLoad = jest.fn();
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = jest.fn().mockResolvedValue({ resources: {} });
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                if (filePath === '@sap-ux/test-unused-generator') {
                    providerLoad();
                    return Provider;
                }
                return super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, 'plugins', 'fixtures', 'valid.xml'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/authored-data',
                    mockDataGenerator: {
                        name: '@sap-ux/test-unused-generator',
                        timeoutMs: 1_000
                    }
                }
            ],
            annotations: [],
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            expect(providerLoad).not.toHaveBeenCalled();
        } finally {
            await mockServer.dispose();
        }
    });

    it('sanitizes and bounds provider failures before logging them', async () => {
        const hostLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            async generate(context: Parameters<IMockDataGenerator['generate']>[0]): Promise<never> {
                context.logger.info(`unsafe\nprovider message ${'y'.repeat(2_000)}`);
                throw new Error(`unsafe\nprovider failure ${'x'.repeat(2_000)}`);
            }
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-unsafe-log-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-unsafe-log-data'),
                    urlPath: '/sap/fe/unsafe-log-generator',
                    mockDataGenerator: { name: '@sap-ux/test-unsafe-log-generator', timeoutMs: 1_000 }
                }
            ],
            annotations: [],
            logger: hostLogger as never,
            metadataProcessor: { name: '@sap-ux/fe-mockserver-plugin-cds' },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            const failureMessage = hostLogger.error.mock.calls
                .flat()
                .find(
                    (message): message is string =>
                        typeof message === 'string' && message.startsWith('mock-data-generator:fallback ')
                );
            expect(failureMessage).toBeDefined();
            expect(failureMessage).not.toMatch(/[\r\n]/);
            expect(failureMessage?.length).toBeLessThanOrEqual(1_200);
            expect(failureMessage).not.toContain('provider failure');
            const providerMessage = hostLogger.info.mock.calls
                .flat()
                .find(
                    (message): message is string =>
                        typeof message === 'string' && message.startsWith('mock-data-generator:info ')
                );
            expect(providerMessage).toBeDefined();
            expect(providerMessage).not.toMatch(/[\r\n]/);
            expect(providerMessage?.length).toBeLessThanOrEqual(1_024);
        } finally {
            await mockServer.dispose();
        }
    });

    it('regenerates an atomic provider snapshot on every service reload without recreating the provider', async () => {
        const construct = jest.fn();
        const generate = jest
            .fn()
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 77, Prop1: 'First snapshot' }] } })
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 88, Prop1: 'Reloaded snapshot' }] } });
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;

            constructor() {
                construct();
            }
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-reload-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-reload-data'),
                    urlPath: '/sap/fe/reload-generator',
                    mockDataGenerator: {
                        name: '@sap-ux/test-reload-generator',
                        timeoutMs: 1_000
                    }
                }
            ],
            annotations: [],
            metadataProcessor: { name: '@sap-ux/fe-mockserver-plugin-cds' },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            const dataAccess = mockServer.getServiceRegistry().getService('/sap/fe/reload-generator') as DataAccess;
            expect(dataAccess).toBeDefined();

            await dataAccess.reloadData();
            const entitySet = await dataAccess.getMockEntitySet('RootElement');
            const rows = await entitySet
                .getMockData('tenant-default')
                .getAllEntries(new ODataRequest({ method: 'GET', url: 'RootElement' }, dataAccess));

            expect(construct).toHaveBeenCalledTimes(1);
            expect(generate).toHaveBeenCalledTimes(2);
            expect(rows).toEqual([expect.objectContaining({ ID: 88, Prop1: 'Reloaded snapshot' })]);
        } finally {
            await mockServer.dispose();
        }
    });

    it('keeps the last known-good snapshot when generation fails during reload', async () => {
        const generate = jest
            .fn()
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 77, Prop1: 'Initial snapshot' }] } })
            .mockRejectedValueOnce(new Error('reload generation failed'));
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-failed-reload-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-failed-reload-data'),
                    urlPath: '/sap/fe/failed-reload-generator',
                    mockDataGenerator: {
                        name: '@sap-ux/test-failed-reload-generator',
                        timeoutMs: 1_000
                    }
                }
            ],
            annotations: [],
            metadataProcessor: { name: '@sap-ux/fe-mockserver-plugin-cds' },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            const dataAccess = mockServer
                .getServiceRegistry()
                .getService('/sap/fe/failed-reload-generator') as DataAccess;

            await expect(dataAccess.reloadData()).rejects.toThrow('reload generation failed');
            const entitySet = await dataAccess.getMockEntitySet('RootElement');
            const rows = await entitySet
                .getMockData('tenant-default')
                .getAllEntries(new ODataRequest({ method: 'GET', url: 'RootElement' }, dataAccess));

            expect(generate).toHaveBeenCalledTimes(2);
            expect(rows).toEqual([expect.objectContaining({ ID: 77, Prop1: 'Initial snapshot' })]);
        } finally {
            await mockServer.dispose();
        }
    });

    it('serializes concurrent reloads and keeps the active snapshot available while generation is pending', async () => {
        let resolveFirstReload!: (value: { resources: { RootElement: { ID: number; Prop1: string }[] } }) => void;
        const firstReloadResult = new Promise<{ resources: { RootElement: { ID: number; Prop1: string }[] } }>(
            (resolve) => {
                resolveFirstReload = resolve;
            }
        );
        const generate = jest
            .fn()
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 77, Prop1: 'Initial snapshot' }] } })
            .mockReturnValueOnce(firstReloadResult)
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 99, Prop1: 'Latest snapshot' }] } });
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-serialized-reload-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-serialized-reload-data'),
                    urlPath: '/sap/fe/serialized-reload-generator',
                    mockDataGenerator: {
                        name: '@sap-ux/test-serialized-reload-generator',
                        timeoutMs: 1_000
                    }
                }
            ],
            annotations: [],
            metadataProcessor: { name: '@sap-ux/fe-mockserver-plugin-cds' },
            fileLoader: TestFileLoader as unknown as string
        });

        try {
            await mockServer.isReady;
            const dataAccess = mockServer
                .getServiceRegistry()
                .getService('/sap/fe/serialized-reload-generator') as DataAccess;
            const firstReload = dataAccess.reloadData();
            while (generate.mock.calls.length < 2) {
                await new Promise((resolve) => setImmediate(resolve));
            }
            const secondReload = dataAccess.reloadData();
            await new Promise((resolve) => setTimeout(resolve, 25));

            expect(generate).toHaveBeenCalledTimes(2);
            const activeEntitySet = await dataAccess.getMockEntitySet('RootElement');
            const activeRows = await activeEntitySet
                .getMockData('tenant-default')
                .getAllEntries(new ODataRequest({ method: 'GET', url: 'RootElement' }, dataAccess));
            expect(activeRows).toEqual([expect.objectContaining({ ID: 77, Prop1: 'Initial snapshot' })]);

            resolveFirstReload({ resources: { RootElement: [{ ID: 88, Prop1: 'Intermediate snapshot' }] } });
            await Promise.all([firstReload, secondReload]);

            const latestEntitySet = await dataAccess.getMockEntitySet('RootElement');
            const latestRows = await latestEntitySet
                .getMockData('tenant-default')
                .getAllEntries(new ODataRequest({ method: 'GET', url: 'RootElement' }, dataAccess));
            expect(generate).toHaveBeenCalledTimes(3);
            expect(latestRows).toEqual([expect.objectContaining({ ID: 99, Prop1: 'Latest snapshot' })]);
        } finally {
            resolveFirstReload?.({ resources: { RootElement: [{ ID: 88, Prop1: 'Intermediate snapshot' }] } });
            await mockServer.dispose();
        }
    });

    it('aborts and drains active generation before disposing the provider', async () => {
        let activeSignal: AbortSignal | undefined;
        let resolveReload!: (value: { resources: { RootElement: { ID: number; Prop1: string }[] } }) => void;
        const reloadResult = new Promise<{ resources: { RootElement: { ID: number; Prop1: string }[] } }>((resolve) => {
            resolveReload = resolve;
        });
        const generate = jest
            .fn()
            .mockResolvedValueOnce({ resources: { RootElement: [{ ID: 77, Prop1: 'Initial snapshot' }] } })
            .mockImplementationOnce((context) => {
                activeSignal = context.signal;
                return reloadResult;
            });
        const disposeProvider = jest.fn();
        const Provider = class implements IMockDataGenerator {
            readonly apiVersion = 1 as const;
            readonly generate = generate;
            readonly dispose = disposeProvider;
        };
        class TestFileLoader extends FileSystemLoader {
            async loadJS(filePath: string): Promise<unknown> {
                return filePath === '@sap-ux/test-dispose-generator' ? Provider : super.loadJS(filePath);
            }
        }
        const mockServer = new FEMockserver({
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData', 'missing-dispose-data'),
                    urlPath: '/sap/fe/dispose-generator',
                    mockDataGenerator: {
                        name: '@sap-ux/test-dispose-generator',
                        timeoutMs: 10_000
                    }
                }
            ],
            annotations: [],
            metadataProcessor: { name: '@sap-ux/fe-mockserver-plugin-cds' },
            fileLoader: TestFileLoader as unknown as string
        });

        let disposing: Promise<void> | undefined;
        try {
            await mockServer.isReady;
            const dataAccess = mockServer.getServiceRegistry().getService('/sap/fe/dispose-generator') as DataAccess;
            const reload = dataAccess.reloadData();
            while (generate.mock.calls.length < 2) {
                await new Promise((resolve) => setImmediate(resolve));
            }

            disposing = mockServer.dispose();
            await new Promise((resolve) => setImmediate(resolve));

            expect(activeSignal?.aborted).toBe(true);
            expect(disposeProvider).not.toHaveBeenCalled();

            resolveReload({ resources: { RootElement: [{ ID: 88, Prop1: 'Discarded snapshot' }] } });
            await Promise.all([reload, disposing]);
            expect(disposeProvider).toHaveBeenCalledTimes(1);
        } finally {
            resolveReload?.({ resources: { RootElement: [{ ID: 88, Prop1: 'Discarded snapshot' }] } });
            await disposing?.catch(() => undefined);
        }
    });
});
