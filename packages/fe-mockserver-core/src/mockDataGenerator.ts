import { join } from 'path';
import { performance } from 'perf_hooks';
import type {
    ExistingMockData,
    IFileLoader,
    IMockDataGenerator,
    MockDataGenerationContext,
    MockDataGenerationResult,
    MockDataGenerationService,
    MockDataGenerationTarget,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorJsonValue,
    MockDataGeneratorLogger,
    MockDataRow
} from './api';

const MAX_JSON_DEPTH = 32;
const MAX_JSON_NODES = 100_000;
const MAX_RESULT_BYTES = 64 * 1024 * 1024;
const MAX_ROWS_PER_RESOURCE = 10_000;
const MAX_DIAGNOSTICS = 100;
const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 1_024;
const MAX_FINGERPRINTS = 32;
const MAX_FINGERPRINT_KEY_LENGTH = 64;
const MAX_FINGERPRINT_VALUE_LENGTH = 256;
const MAX_PROVIDER_LOG_MESSAGE_LENGTH = 1_024;
const MAX_PROVIDER_LOG_EVENTS = 100;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

interface ValidationState {
    nodes: number;
    bytes: number;
    ancestors: Set<object>;
    deadline?: number;
    timeoutMs?: number;
    abort?: () => void;
}

function timeoutError(state: ValidationState): Error {
    state.abort?.();
    return new Error(`Mock data generator timed out after ${state.timeoutMs} ms`);
}

function checkLimits(state: ValidationState, depth: number): void {
    state.nodes += 1;
    if (state.deadline !== undefined && performance.now() >= state.deadline) {
        throw timeoutError(state);
    }
    if (state.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
        throw new TypeError('Mock data generator result exceeds the JSON complexity limit');
    }
    if (state.bytes > MAX_RESULT_BYTES) {
        throw new TypeError('Mock data generator result exceeds 64 MiB');
    }
}

function addBytes(state: ValidationState, value: string): void {
    state.bytes += Buffer.byteLength(value, 'utf8');
    if (state.bytes > MAX_RESULT_BYTES) {
        throw new TypeError('Mock data generator result exceeds 64 MiB');
    }
}

function* dataEntries(value: object, state?: ValidationState): IterableIterator<readonly [string, unknown]> {
    const keys = Reflect.ownKeys(value);
    if (state && keys.length > MAX_JSON_NODES - state.nodes) {
        throw new TypeError('Mock data generator result exceeds the JSON complexity limit');
    }
    for (const key of keys) {
        if (state?.deadline !== undefined && performance.now() >= state.deadline) {
            throw timeoutError(state);
        }
        if (typeof key !== 'string') {
            throw new TypeError('Mock data generator values must not contain symbol keys');
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || descriptor.get || descriptor.set || !('value' in descriptor)) {
            throw new TypeError('Mock data generator values must not contain accessors');
        }
        if (descriptor.enumerable) {
            yield [key, descriptor.value];
        }
    }
}

function copyAndFreeze(value: unknown, state: ValidationState, depth: number): MockDataGeneratorJsonValue {
    checkLimits(state, depth);
    if (value === null) {
        addBytes(state, 'null');
        return null;
    }
    if (typeof value === 'string') {
        addBytes(state, JSON.stringify(value));
        return value;
    }
    if (typeof value === 'boolean') {
        addBytes(state, value ? 'true' : 'false');
        return value;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError('Mock data generator result contains a non-finite number');
        }
        addBytes(state, JSON.stringify(value));
        return value;
    }
    if (typeof value !== 'object') {
        throw new TypeError('Mock data generator result must be JSON-compatible');
    }
    if (state.ancestors.has(value)) {
        throw new TypeError('Mock data generator values must be acyclic');
    }
    state.ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype) {
                throw new TypeError('Mock data generator arrays must use the standard prototype');
            }
            const entries = new Map(dataEntries(value, state));
            if ([...entries.keys()].some((key) => key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key))) {
                throw new TypeError('Mock data generator arrays must not contain named properties');
            }
            const result: MockDataGeneratorJsonValue[] = [];
            addBytes(state, '[');
            for (let index = 0; index < value.length; index += 1) {
                if (!entries.has(String(index))) {
                    throw new TypeError('Mock data generator arrays must not be sparse');
                }
                if (index > 0) {
                    addBytes(state, ',');
                }
                result.push(copyAndFreeze(entries.get(String(index)), state, depth + 1));
            }
            addBytes(state, ']');
            return Object.freeze(result);
        }
        if (!isPlainObject(value)) {
            throw new TypeError('Mock data generator values must contain only plain objects');
        }
        const result = Object.create(null) as Record<string, MockDataGeneratorJsonValue>;
        addBytes(state, '{');
        let index = 0;
        for (const [key, entry] of dataEntries(value, state)) {
            if (index > 0) {
                addBytes(state, ',');
            }
            addBytes(state, `${JSON.stringify(key)}:`);
            Object.defineProperty(result, key, {
                value: copyAndFreeze(entry, state, depth + 1),
                enumerable: true,
                configurable: false,
                writable: false
            });
            index += 1;
        }
        addBytes(state, '}');
        return Object.freeze(result);
    } finally {
        state.ancestors.delete(value);
    }
}

function validationState(overrides: Partial<ValidationState> = {}): ValidationState {
    return { nodes: 0, bytes: 0, ancestors: new Set(), ...overrides };
}

function boundedLogger(logger: MockDataGeneratorLogger): MockDataGeneratorLogger {
    let events = 0;
    const sanitize = (message: unknown): string => {
        const input = typeof message === 'string' ? message : '[invalid provider log message]';
        let result = '';
        for (const character of input) {
            if (result.length >= MAX_PROVIDER_LOG_MESSAGE_LENGTH) {
                break;
            }
            const code = character.charCodeAt(0);
            result += code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? ' ' : character;
        }
        return result.slice(0, MAX_PROVIDER_LOG_MESSAGE_LENGTH);
    };
    const forward = (sink: (message: string) => void, message: string): void => {
        if (events >= MAX_PROVIDER_LOG_EVENTS) {
            return;
        }
        events += 1;
        sink(sanitize(message));
    };
    return Object.freeze({
        debug: (message: string) => forward(logger.debug, message),
        info: (message: string) => forward(logger.info, message),
        warn: (message: string) => forward(logger.warn, message)
    });
}

/** Create an immutable defensive copy of a JSON-compatible value. */
export function copyAndFreezeJsonValue(value: MockDataGeneratorJsonValue): MockDataGeneratorJsonValue {
    return copyAndFreeze(value, validationState(), 0);
}

/** Create an immutable defensive copy of provider options. */
export function copyAndFreezeOptions(
    options?: Readonly<Record<string, MockDataGeneratorJsonValue>>
): Readonly<Record<string, MockDataGeneratorJsonValue>> | undefined {
    return options
        ? (copyAndFreeze(options, validationState(), 0) as Readonly<Record<string, MockDataGeneratorJsonValue>>)
        : undefined;
}

export interface MockDataGenerationContextInput {
    service: MockDataGenerationService;
    metadata: string;
    targets: ReadonlyArray<MockDataGenerationTarget>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    logger: MockDataGeneratorLogger;
    signal: AbortSignal;
}

export type MockDataGenerationRunInput = Omit<MockDataGenerationContextInput, 'signal'> & { signal?: AbortSignal };

export interface PreparedMockDataSource {
    contributor?: unknown;
    jsonRows?: ReadonlyArray<Readonly<Record<string, MockDataGeneratorJsonValue>>>;
}

export interface MockDataSourceInspection {
    targets: MockDataGenerationTarget[];
    existingData: Record<string, ExistingMockData>;
    preparedSources: Readonly<Record<string, PreparedMockDataSource>>;
}

export interface PreparedMockDataGeneration {
    resources?: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    preparedSources?: Readonly<Record<string, PreparedMockDataSource>>;
}

export type MockDataGeneratorDisposalStatus = 'disposed' | 'failed' | 'timed-out';

/**
 * Dispose a provider behind a host-owned deadline without exposing provider failures.
 *
 * @param provider provider instance to dispose
 * @param timeoutMs maximum cleanup duration
 * @returns bounded disposal status
 */
export async function disposeMockDataGenerator(
    provider: IMockDataGenerator,
    timeoutMs: number
): Promise<MockDataGeneratorDisposalStatus> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
        throw new TypeError('Mock data generator disposal timeout must be a positive integer no greater than 60000');
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const disposal = Promise.resolve()
        .then(() => provider.dispose?.())
        .then(
            () => 'disposed' as const,
            () => 'failed' as const
        );
    const deadline = new Promise<'timed-out'>((resolve) => {
        timeout = setTimeout(() => resolve('timed-out'), timeoutMs);
    });
    try {
        return await Promise.race([disposal, deadline]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

function contributorHasInitialData(contributor: unknown): boolean {
    if (typeof contributor !== 'object' && typeof contributor !== 'function') {
        return false;
    }
    if (contributor !== null && 'getInitialDataSet' in contributor) {
        return typeof contributor.getInitialDataSet === 'function';
    }
    if (typeof contributor === 'function' && contributor.prototype) {
        return typeof (contributor.prototype as { getInitialDataSet?: unknown }).getInitialDataSet === 'function';
    }
    return false;
}

function parseJsonRows(
    content: string,
    targetName: string
): ReadonlyArray<Readonly<Record<string, MockDataGeneratorJsonValue>>> {
    const parsed: unknown = content.length === 0 ? [] : JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.some((row) => !isPlainObject(row))) {
        throw new TypeError(`Authored JSON for ${targetName} must contain an array of row objects`);
    }
    return copyAndFreeze(parsed, validationState(), 0) as ReadonlyArray<
        Readonly<Record<string, MockDataGeneratorJsonValue>>
    >;
}

/** Inspect initial data ownership before deciding whether a provider is needed. */
export async function inspectMockDataSources(
    fileLoader: IFileLoader,
    mockDataRootFolder: string,
    candidateTargets: ReadonlyArray<MockDataGenerationTarget>
): Promise<MockDataSourceInspection> {
    const typescriptEnabled = fileLoader.isTypescriptEnabled?.() === true;
    const targets: MockDataGenerationTarget[] = [];
    const existingData: Record<string, ExistingMockData> = {};
    const preparedSources: Record<string, PreparedMockDataSource> = {};

    for (const target of candidateTargets) {
        const jsonPath = join(mockDataRootFolder, target.name) + '.json';
        const jsPath = join(mockDataRootFolder, target.name) + '.js';
        const tsPath = join(mockDataRootFolder, target.name) + '.ts';
        const [jsonExists, jsExists, tsExists] = await Promise.all([
            fileLoader.exists(jsonPath),
            fileLoader.exists(jsPath),
            typescriptEnabled ? fileLoader.exists(tsPath) : Promise.resolve(false)
        ]);
        let contributorPath: string | undefined;
        if (tsExists) {
            contributorPath = tsPath;
        } else if (jsExists) {
            contributorPath = jsPath;
        }
        const contributor = contributorPath ? await fileLoader.loadJS(contributorPath) : undefined;
        const hasContributorInitialData = contributorHasInitialData(contributor);
        const jsonRows = jsonExists ? parseJsonRows(await fileLoader.loadFile(jsonPath), target.name) : undefined;

        preparedSources[target.name] = { contributor, jsonRows };
        if (hasContributorInitialData) {
            existingData[target.name] = {
                contributor: { present: true, hasInitialData: true },
                initialRows: { source: 'contributor', present: true, enumerable: false }
            };
        } else if (jsonRows !== undefined) {
            existingData[target.name] = {
                contributor: contributor === undefined ? { present: false } : { present: true, hasInitialData: false },
                initialRows: { source: 'json', present: true, rows: jsonRows }
            };
        } else {
            existingData[target.name] = {
                contributor: contributor === undefined ? { present: false } : { present: true, hasInitialData: false },
                initialRows: { source: 'none', present: false }
            };
            targets.push(target);
        }
    }

    return { targets, existingData, preparedSources: Object.freeze(preparedSources) };
}

/**
 * Build the provider context without leaking mutable host state. Logging is
 * bounded by a forwarding facade and cancellation remains a live capability.
 */
export function createMockDataGenerationContext(input: MockDataGenerationContextInput): MockDataGenerationContext {
    return Object.freeze({
        contractVersion: 1,
        service: Object.freeze({
            urlPath: input.service.urlPath,
            ...(input.service.alias === undefined ? {} : { alias: input.service.alias }),
            odataVersion: input.service.odataVersion
        }),
        metadata: input.metadata,
        targets: copyAndFreeze(input.targets, validationState(), 0) as unknown as ReadonlyArray<
            Readonly<MockDataGenerationTarget>
        >,
        existingData: copyAndFreeze(input.existingData, validationState(), 0) as unknown as Readonly<
            Record<string, ExistingMockData>
        >,
        logger: boundedLogger(input.logger),
        signal: input.signal
    });
}

function validateDiagnostics(
    value: unknown,
    state: ValidationState
): ReadonlyArray<MockDataGeneratorDiagnostic> | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        throw new TypeError('Mock data generator diagnostics must be an array');
    }
    if (value.length > MAX_DIAGNOSTICS) {
        throw new TypeError(`Mock data generator may return at most ${MAX_DIAGNOSTICS} diagnostics`);
    }
    const diagnostics = copyAndFreeze(value, state, 1) as unknown as ReadonlyArray<MockDataGeneratorDiagnostic>;
    for (const diagnostic of diagnostics) {
        if (
            !isPlainObject(diagnostic) ||
            typeof diagnostic.code !== 'string' ||
            diagnostic.code.length === 0 ||
            diagnostic.code.length > 64 ||
            !/^[A-Za-z0-9_.-]+$/.test(diagnostic.code) ||
            !['info', 'warning', 'error'].includes(String(diagnostic.severity)) ||
            typeof diagnostic.message !== 'string' ||
            (diagnostic.target !== undefined &&
                (typeof diagnostic.target !== 'string' || diagnostic.target.length > 256))
        ) {
            throw new TypeError('Mock data generator returned an invalid diagnostic');
        }
        if (Array.from(diagnostic.message).length > MAX_DIAGNOSTIC_MESSAGE_LENGTH) {
            throw new TypeError(
                `Mock data generator diagnostic message exceeds ${MAX_DIAGNOSTIC_MESSAGE_LENGTH} characters`
            );
        }
    }
    return diagnostics;
}

function validateFingerprints(value: unknown, state: ValidationState): Readonly<Record<string, string>> | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new TypeError('Mock data generator fingerprints must be a string record');
    }
    const entries: Array<readonly [string, unknown]> = [];
    for (const entry of dataEntries(value, state)) {
        if (entries.length >= MAX_FINGERPRINTS) {
            throw new TypeError(`Mock data generator may return at most ${MAX_FINGERPRINTS} fingerprints`);
        }
        entries.push(entry);
    }
    if (
        entries.some(
            ([key, fingerprint]) =>
                key.length === 0 ||
                key.length > MAX_FINGERPRINT_KEY_LENGTH ||
                !/^[\x20-\x7E]+$/.test(key) ||
                typeof fingerprint !== 'string' ||
                fingerprint.length > MAX_FINGERPRINT_VALUE_LENGTH ||
                !/^[\x20-\x7E]*$/.test(fingerprint)
        )
    ) {
        throw new TypeError('Mock data generator returned an invalid fingerprint');
    }
    return copyAndFreeze(value, state, 1) as Readonly<Record<string, string>>;
}

function validateResult(
    value: unknown,
    targetNames: ReadonlySet<string>,
    logger: MockDataGeneratorLogger,
    state: ValidationState
): MockDataGenerationResult {
    if (!isPlainObject(value)) {
        throw new TypeError('Mock data generator result must contain a resources object');
    }
    const fields = new Map<string, unknown>();
    for (const [name, field] of dataEntries(value, state)) {
        if (!['resources', 'diagnostics', 'fingerprints'].includes(name)) {
            throw new TypeError(`Mock data generator result contains unsupported field ${name}`);
        }
        fields.set(name, field);
    }
    const resourcesValue = fields.get('resources');
    if (!isPlainObject(resourcesValue)) {
        throw new TypeError('Mock data generator result must contain a resources object');
    }
    const resources = Object.create(null) as Record<
        string,
        ReadonlyArray<Readonly<Record<string, MockDataGeneratorJsonValue>>>
    >;
    for (const [name, rows] of dataEntries(resourcesValue, state)) {
        checkLimits(state, 1);
        if (!targetNames.has(name)) {
            logger.warn(`Mock data generator returned unknown resource "${name}"; ignoring it`);
            continue;
        }
        if (!Array.isArray(rows)) {
            throw new TypeError(`Mock data generator resource ${name} must contain only plain row objects`);
        }
        if (rows.length > MAX_ROWS_PER_RESOURCE) {
            throw new TypeError(
                `Mock data generator resource ${name} may contain at most ${MAX_ROWS_PER_RESOURCE} rows`
            );
        }
        for (const [, row] of dataEntries(rows, state)) {
            if (!isPlainObject(row)) {
                throw new TypeError(`Mock data generator resource ${name} must contain only plain row objects`);
            }
        }
        const copiedRows = copyAndFreeze(rows, state, 1) as ReadonlyArray<
            Readonly<Record<string, MockDataGeneratorJsonValue>>
        >;
        if (copiedRows.some((row) => !isPlainObject(row))) {
            throw new TypeError(`Mock data generator resource ${name} must contain only plain row objects`);
        }
        Object.defineProperty(resources, name, {
            value: copiedRows,
            enumerable: true,
            configurable: false,
            writable: false
        });
    }
    const result: MockDataGenerationResult = {
        resources: Object.freeze(resources),
        diagnostics: validateDiagnostics(fields.get('diagnostics'), state),
        fingerprints: validateFingerprints(fields.get('fingerprints'), state)
    };
    if (state.deadline !== undefined && performance.now() >= state.deadline) {
        throw timeoutError(state);
    }
    return Object.freeze(result);
}

/** Run one provider generation epoch under the host deadline. */
export async function runMockDataGenerator(
    provider: IMockDataGenerator,
    input: MockDataGenerationRunInput,
    timeoutMs: number
): Promise<MockDataGenerationResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
        throw new TypeError('Mock data generator timeout must be a positive integer no greater than 60000');
    }
    const abortController = new AbortController();
    const abortFromParent = (): void => abortController.abort(input.signal?.reason);
    input.signal?.addEventListener('abort', abortFromParent, { once: true });
    if (input.signal?.aborted) {
        abortFromParent();
    }
    const context = createMockDataGenerationContext({ ...input, signal: abortController.signal });
    const deadline = performance.now() + timeoutMs;
    const state = validationState({
        deadline,
        timeoutMs,
        abort: () => abortController.abort()
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
            abortController.abort();
            reject(new Error(`Mock data generator timed out after ${timeoutMs} ms`));
        }, timeoutMs);
    });
    const generationPromise = Promise.resolve()
        .then(() => provider.generate(context))
        .then((result) =>
            validateResult(result, new Set(context.targets.map((target) => target.name)), context.logger, state)
        );
    try {
        return await Promise.race([generationPromise, timeoutPromise]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
        input.signal?.removeEventListener('abort', abortFromParent);
    }
}
