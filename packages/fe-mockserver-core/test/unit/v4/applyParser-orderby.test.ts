import { parseApply } from '../../../src/request/applyParser';

/**
 * Regression tests for: `$apply=orderby(<prop> asc)` throws
 * "Parsing errors detected".
 *
 * # What breaks
 *
 * `parseApply('orderby(compositionItemPosition asc)')` throws with:
 *
 *   MismatchedTokenException: Expecting token of type --> AscDesc <--
 *   but found --> 'asc' <--
 *
 * The lexer emits `SimpleIdentifier` for `asc` instead of `AscDesc`, then
 * `orderByTrafo` fails at `CONSUME(ASCDESC)`.
 *
 * # Why it breaks (asymmetry: asc fails, desc works)
 *
 * In `applyTokens` (applyParser.ts), `AS_TOKEN` is listed **before** `ASCDESC`:
 *
 *   AGGREGATE_TOKEN,
 *   WITH_TOKEN,
 *   AS_TOKEN,           // <-- pattern /as/, longer_alt: SIMPLEIDENTIFIER
 *   FROM_TOKEN,
 *   ...
 *   ASCDESC,            // <-- pattern /(?:asc|desc)/, longer_alt: SIMPLEIDENTIFIER
 *
 * For input `asc`:
 *   1. `AS_TOKEN` matches `as` (2 chars).
 *   2. Its `longer_alt` = `SIMPLEIDENTIFIER` (\w{1,128}) matches `asc` (3 chars
 *      — longer!) → chevrotain switches to `SimpleIdentifier`.
 *   3. `ASCDESC` is never tried.
 *
 * For input `desc`: `AS_TOKEN` doesn't match at all (no `as` prefix), so the
 * lexer walks down to `ASCDESC`, which emits `AscDesc` correctly. That's why
 * `desc` works and `asc` doesn't — the bug is a hidden interaction with the
 * `AS_TOKEN` used by `aggregate(... as <alias>)`.
 *
 * # Real-world trigger
 *
 * The v4 ODataModel folds a client-side `$orderby=<prop>` into
 * `$apply=orderby(<prop> asc)/TopLevels(...)` for any list binding with
 * `$$aggregation.hierarchyQualifier` set. Any UI5 hierarchical table that
 * sorts siblings crashes the mockserver with a 500.
 *
 * The original request that first surfaced this bug (500 from the mockserver):
 *
 *   GET SpecificationVersion(id=2a69f794-bbd4-444f-af2c-ebd865272375,IsActiveEntity=false)
 *       /propertyInstanceAssignments(
 *           specificationVersion_id=2a69f794-bbd4-444f-af2c-ebd865272375,
 *           property_id=d1234567-89ab-4def-0123-456789abcdef,
 *           instanceAssignmentPosition=0,
 *           IsActiveEntity=false)
 *       /propertyInstance/propertyCompositionItems
 *       ?$select=DistanceFromRoot,DrillState,IsActiveEntity,LimitedDescendantCount,
 *                allReleasedSpecCompositionVersion,baselineSpecCompositionVersion,
 *                comment,compositionItemPosition,compositionVersionBusinessStatusDescription,
 *                compositionVersionDisplayId,compositionVersionDisplayName,
 *                compositionVersionId,compositionVersionSpecificationTypeDisplayId,
 *                compositionVersionSpecificationTypeName,id,instanceAssignmentPosition,
 *                isMaximumBoundaryExclusive,isMinimumBoundaryExclusive,
 *                isSpecVersionEditable,maximumValue,minimumValue,parent_id,property_id,
 *                specVersionStatusType,specificationVersion_id,specification_id,
 *                targetValue,unitOfMeasure_code,value,version
 *       &$apply=orderby(compositionItemPosition%20asc)
 *              /com.sap.vocabularies.Hierarchy.v1.TopLevels(
 *                   HierarchyNodes=$root/SpecificationVersion(...)/propertyInstance
 *                                        /propertyCompositionItems,
 *                   HierarchyQualifier='PropertyCompositionItemHierarchy',
 *                   NodeProperty='id',
 *                   Levels=2)
 *       &$count=true&$skip=0&$top=84
 *
 * The `orderby(compositionItemPosition%20asc)` fragment is what parseApply
 * rejects — everything after it in the $apply chain is never reached.
 *
 * # Suggested fix
 *
 * Either move `ASCDESC` above `AS_TOKEN` in `applyTokens`, or drop
 * `AS_TOKEN.longer_alt` (aggregate parsing already forces `AS_TOKEN` via
 * `CONSUME` between two whitespace tokens, so the longer_alt isn't load-
 * bearing there).
 */
describe('applyParser — orderby direction (regression)', () => {
    test('orderby(<prop>) without explicit direction parses (baseline)', () => {
        expect(parseApply('orderby(compositionItemPosition)')).toEqual([
            {
                type: 'orderBy',
                orderBy: [{ name: 'compositionItemPosition', direction: 'asc' }]
            }
        ]);
    });

    // FAILS on 1.7.15.
    test('orderby(<prop> asc) with explicit ascending direction parses', () => {
        expect(parseApply('orderby(compositionItemPosition asc)')).toEqual([
            {
                type: 'orderBy',
                orderBy: [{ name: 'compositionItemPosition', direction: 'asc' }]
            }
        ]);
    });

    test('orderby(<prop> desc) with explicit descending direction parses', () => {
        expect(parseApply('orderby(compositionItemPosition desc)')).toEqual([
            {
                type: 'orderBy',
                orderBy: [{ name: 'compositionItemPosition', direction: 'desc' }]
            }
        ]);
    });

    // FAILS on 1.7.15 — the v4 hierarchical-fold URL shape.
    test('orderby(<prop> asc)/TopLevels(...) — v4 hierarchical fold parses', () => {
        const applyStr =
            "orderby(compositionItemPosition asc)/" +
            "com.sap.vocabularies.Hierarchy.v1.TopLevels(" +
            "HierarchyNodes=$root/PropertyCompositionItems," +
            "HierarchyQualifier='PropertyCompositionItemHierarchy'," +
            "NodeProperty='id',Levels=2)";
        const result = parseApply(applyStr);
        expect(result).toBeDefined();
        expect(result![0]).toEqual({
            type: 'orderBy',
            orderBy: [{ name: 'compositionItemPosition', direction: 'asc' }]
        });
    });
});
