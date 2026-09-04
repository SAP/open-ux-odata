# Mock data generator provider contract

**Status:** Proposed for maintainer acceptance

**Contract version:** 1

**Owning repository:** `SAP/open-ux-odata`

**Host baseline:** `d94d8d3c31bb770e267784e0011aee5fb7e361a6`

**Provider baseline:** `SAP/open-ux-tools` `6879d47df9097421fd98edf0800eb13c2c513aa9`

## Purpose

The `mockDataGenerator` service-provider interface lets the standard Fiori
elements mockserver request mock rows for the entity sets that do not already
have developer-authored data. The interface is generic: the host neither
depends on a particular generator nor imports an ML or model runtime.

The provider runs as part of service initialization. It is not called from an
HTTP request path and it does not register another UI5 middleware.

## Why the CDS plugin is not this extension point

`@sap-ux/fe-mockserver-plugin-cds` implements `IMetadataProcessor`. It reads a
CDS source and returns resolved EDMX before `DataAccess` is created. The
existing general plugin contract contributes additional service definitions.
Neither contract can provide rows to an already configured service, express
row-source precedence, or participate in service reload and disposal. A
separate service-scoped provider contract is therefore required.

## Public configuration

The same field is accepted globally and on an individual service:

```ts
export type MockDataGeneratorJsonPrimitive = string | number | boolean | null;
export type MockDataGeneratorJsonValue =
    | MockDataGeneratorJsonPrimitive
    | ReadonlyArray<MockDataGeneratorJsonValue>
    | { readonly [key: string]: MockDataGeneratorJsonValue };

export interface MockDataGeneratorConfig {
    name: string;
    timeoutMs?: number;
    options?: Readonly<Record<string, MockDataGeneratorJsonValue>>;
}

export type MockDataGeneratorSetting = MockDataGeneratorConfig | false;
```

Resolution rules are intentionally simple:

1. A service-owned configuration object replaces the global configuration.
   Provider options are not deep-merged.
2. A service-owned value of `false` disables an inherited global provider.
3. If the service does not own the field, it inherits the global setting.
4. If neither level configures a provider, behavior is unchanged.
5. Services discovered only through external metadata references do not
   inherit the global provider. They remain generation-disabled unless a user
   configures them as an explicit service.
6. Services contributed by the existing plugin API follow the same inheritance
   rules as user-configured services and may set `false` explicitly.

`generateMockData` continues to control the built-in generator. It does not
silently enable or disable an explicitly configured provider. Set
`mockDataGenerator: false` when a service must not use an inherited provider.

`name` is a package export specifier in application configuration. Absolute
paths are reserved for host contract tests and injected test loaders; the
configuration writer never emits them. Relative paths and URL-like specifiers
are rejected. `timeoutMs` defaults to and is capped at 60,000 milliseconds; a
smaller positive integer is allowed. It bounds the whole generation epoch from
immediately before `generate` through complete-result validation, defensive
copying/freezing, and the atomic publication check; it is not cleared when the
provider promise resolves.

## Provider module and instance scope

The module named by `MockDataGeneratorConfig.name` exports a constructable
provider as its default or CommonJS export. The host creates a distinct
instance for each configured service registration, passes the validated,
deeply copied options object to its constructor, and reuses that instance for
serialized reload epochs until service-registry disposal. A global setting
shares configuration, never a mutable provider instance. Module import and
construction must be fast and side-effect-free; downloads, model loading, and
generation begin only inside `generate`.

```ts
export interface IMockDataGenerator {
    readonly apiVersion: 1;
    generate(context: MockDataGenerationContext): Promise<MockDataGenerationResult>;
    dispose?(): void | Promise<void>;
}

export interface MockDataGeneratorConstructor {
    new (options?: Readonly<Record<string, MockDataGeneratorJsonValue>>): IMockDataGenerator;
}
```

The loader uses the existing `IFileLoader.loadJS` module-resolution boundary,
but provider constructors do not receive `IFileLoader` or another host
implementation object.

The host checks `apiVersion` before invoking the provider. A missing or
unsupported version is a provider contract failure and follows the normal host
fallback path.

## Generation context

The versioned context is immutable from the provider's perspective and
contains only host-neutral data:

```ts
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

export type MockDataContributorPresence =
    | { present: false }
    | { present: true; hasInitialData: boolean };

export type ExistingInitialRows =
    | { source: 'none'; present: false }
    | { source: 'json'; present: true; rows: ReadonlyArray<MockDataRow> }
    | { source: 'contributor'; present: true; enumerable: false }
    | {
          source: 'contributor';
          present: true;
          enumerable: true;
          rows: ReadonlyArray<MockDataRow>;
      };

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
```

`metadata` is the resolved EDMX string returned by the effective metadata
processor, including when the source service was CDS. Both entity sets and
singletons are eligible. `targets` contains only resources whose initial rows
may come from the provider; resources with contributor-owned initial rows or a
JSON file, including an intentionally empty JSON array, are excluded.

OData V4 `ContainsTarget` navigation data is not a separate target. A provider
may return it as an inline subgraph beneath a provider-owned top-level entity
set or singleton: collection-valued containment uses an array and to-one
containment uses an object or `null`. The host recursively validates, copies,
freezes, and serves those nested values. Contract version 1 does not enrich or
merge containment beneath an authoritative contributor or JSON parent row. A
future authored-parent enrichment contract would require parent-instance
identity, canonical containment paths, cardinality, and merge-only semantics;
adding another target kind alone would be insufficient.

Contributor presence is separate from initial-row ownership because a hook-only
JS/TS contributor remains active while its initial rows fall through to JSON,
provider, built-in generation, or empty data. A contributor-owned initial data
source is marked `enumerable: false` and omits `rows` when it cannot be evaluated
safely during initialization. The provider must not invent relationships to
unknown values.

The host recursively validates, copies, and freezes the data-bearing `service`,
`targets`, `existingData`, and `options` values, then freezes the outer context
object. The metadata string is immutable. The host passes a narrow logger
wrapper and the original live `AbortSignal` by reference so logging and
cancellation keep working during generation. It exposes no metadata path,
mock-data path, metadata-processor options, internal flags, or host logger
object. Tenant-specific sources are not flattened into the initialization
context; they retain request-time precedence over every generated source.

## Result and validation

```ts
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
```

The host stages and validates the complete result before publishing any part of
it. Unknown extra resource names are ignored with one bounded diagnostic, and a
missing requested key intentionally continues to that resource's built-in or
empty fallback. If any supplied known resource or row is malformed, the whole
provider result for that generation epoch is rejected so partial acceptance
cannot break cross-resource relationships. Domain and referential-integrity
validation remains the provider's responsibility; the host remains
generator-agnostic.

A provider may create cross-resource references only from usable metadata
constraints or a provider-owned subgraph whose two sides it validates. When
neither is available it must abstain; semantic plausibility alone is not
referential-integrity evidence.

Options and results must be acyclic plain JSON-compatible data. The host rejects
functions, symbols, bigint values, accessors, custom prototypes, cycles,
non-finite numbers, and values over these version-1 limits: 10,000 rows per
resource, nesting depth 32, 64 MiB serialized result, 100 diagnostics, and 1,024
characters per diagnostic message. Fingerprints are limited to 32 entries with
ASCII keys up to 64 characters and ASCII values up to 256 characters. Accepted
rows are deeply copied into an immutable service snapshot and copied again for
each mutable request context.

The host keeps the monotonic epoch deadline active during bounded validation,
copying, and freezing, checks it incrementally during traversal, and checks it
again immediately before publication. A provider that resolves before the
deadline does not succeed if host processing crosses it; the stale epoch is
aborted, rejected as a whole, and cannot publish.

Diagnostics may contain stable codes, counts, timings, and fingerprints. They
must not contain raw metadata, generated values, prompts, credentials, or
model inputs. The host emits sanitized diagnostics and fingerprints through its
existing logger with a fixed `mock-data-generator:` prefix and bounded one-line
fields so local/BAS verification can capture them. It never logs provider
options or raw thrown error messages.

## Per-entity-set precedence

The host resolves initial rows for every entity set or singleton in this order:

1. A TS contributor module before a JS contributor module when both exist.
2. Initial rows returned by that contributor's `getInitialDataSet`, when
   present and valid.
3. Existing JSON, including an intentionally empty file.
4. Valid rows returned by the provider.
5. Existing built-in generation when `generateMockData` is enabled.
6. Empty data.

A hook-only contributor does not own initial rows. Its request/action hooks
remain active around JSON, provider, built-in, or empty rows. Tenant-specific
authored data overrides every generated source without disabling contributor
hooks.

An empty provider array is a valid provider result and does not request
built-in replacement. A missing provider key or a rejected provider value
continues to the built-in/empty fallback. Existing data files are read-only and
are never created, rewritten, or deleted by the host. Source presence is stored
explicitly; array length is never used to distinguish absent data from authored
or provider-owned empty data.

## Lifecycle and atomicity

For each service initialization or reload epoch, the host:

1. Resolves and parses metadata.
2. Determines authoritative existing-data presence.
3. Acquires the service-scoped provider instance and creates one
   `AbortController` when at least one resource is eligible.
4. Starts the configured monotonic deadline and calls `generate` at most once
   for the whole service epoch.
5. Validates and stages the result while the same deadline remains active.
6. Checks the deadline again and publishes one complete service snapshot only
   after initialization completes.

A single serialized reload coordinator owns file-watch reload,
`POST /$metadata/reload`, and capture-and-simulate metadata arrival. It
coalesces concurrent events, assigns monotonically increasing epochs, serves the
previous complete snapshot while a replacement is prepared, and atomically
swaps metadata, ETag, resolved initial sources, and provider rows. The router
remains stable. Supersession marks the old epoch stale, aborts its signal, and
prevents a late result from publishing.

Final `FEMockserver.dispose()` closes file watchers, aborts and drains active
generation epochs under their configured generation deadlines, then awaits
each service-scoped provider's `dispose()` once. A provider implementation must
therefore keep its own disposal bounded and handle partially initialized
state. Host cleanup is idempotent and safe after partial initialization.

## Failure behavior

Provider resolution, construction, API-version mismatch, end-to-end epoch
deadline, generation rejection, and result validation errors are isolated per
service and logged as sanitized structured warnings. They do not prevent
initial service opening; a reload failure retains the last complete snapshot.
On timeout or supersession the host marks the epoch stale, aborts it, attaches
rejection handling to any late promise, and prevents the failed or stale result
from publishing even if the provider ignores its signal. Missing provider rows
during initial startup proceed to the built-in generator when enabled,
otherwise to empty data. Expected reload or shutdown cancellation does not
replace an active snapshot.

Provider absence must be behavior-neutral, including startup, watch mode,
plugin services, external-service discovery, and final disposal.

## Compatibility boundary

The host packages support the Node versions declared by their own package
manifests. The production provider publishes a conditional CommonJS-compatible
`/fe-mockserver` entry because the current filesystem loader uses `require`.
The host never imports `@sap-ux/mockserver-data-generator` and never gains an
ML/runtime dependency.

A contract-version-1 host diagnoses a provider whose `apiVersion` is missing or
unsupported. A host released before this SPI cannot promise a diagnostic for an
unknown option because its middleware may drop that field before core startup.
Minimum-host checks therefore belong to the configuration writer, development
installer, and generator package compatibility metadata.

The contract is additive for configuration and package APIs. The intentional
correction that an authored empty JSON file remains authoritative is covered
as a behavior change in tests and release notes.

## Acceptance record

Host implementation proceeds test-first on the isolated feature branch. The
following entries must be accepted before merge:

| Decision | Owner | Acceptance evidence |
| --- | --- | --- |
| Generic SPI and lifecycle | TBD `open-ux-odata` maintainer | Pending |
| Configuration and compatibility | TBD mockserver CODEOWNER | Pending |
| Provider contract and adapter ownership | Proposed `@SAP/ux-tools-app-generators-and-deploy`; accepting delegate TBD | Pending |

Any accepted change to this contract must be mirrored in the provider-side
contract and its cross-repository fixtures before merge.

This host contract does not authorize copying or publishing pilot artifacts,
training data, or learned weights. It does not block implementation of the
generic host or local development of the classifier and SFT runtime in their
approved feature branches.
The proposed provider team is inferred from the adjacent
`mockserver-config-writer` CODEOWNERS entry in `SAP/open-ux-tools` and remains
subject to explicit acceptance.
