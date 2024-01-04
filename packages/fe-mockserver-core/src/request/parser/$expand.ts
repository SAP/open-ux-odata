import balanced from 'balanced-match';
import merge from 'lodash.merge';
import { parse } from 'query-string';
import { ExecutionError } from '../../data/common';
import type { FilterExpression } from '../filterParser';
import { parseFilter } from '../filterParser';
import type { OrderByDefinition } from './$orderby';
import { parse$orderby } from './$orderby';
import type { SelectDefinition } from './$select';
import { parse$select } from './$select';

export type ExpandDefinition = {
    expand: Record<string, ExpandDefinition>;
    properties: SelectDefinition;
    $filter?: FilterExpression;
    $orderby?: OrderByDefinition[];
    removeFromResult?: boolean;
};

/**
 * Split a list of properties that can contain sub-requests into an array.
 *
 * @param propertiesQuery OData properties request
 * @param delimiter Property delimiter
 * @returns an array of string with the properties
 */
function splitProperties(propertiesQuery: string, delimiter = ','): string[] {
    const properties = [];
    let nestingDepth = 0,
        startIndex = 0,
        index = 0;

    for (; index < propertiesQuery.length; index++) {
        const char = propertiesQuery[index];
        if (char === delimiter && nestingDepth === 0) {
            // top-level delimiter — end of property
            if (index - startIndex > 0) {
                properties.push(propertiesQuery.substring(startIndex, index));
            }
            startIndex = index + 1;
        } else if (char === '(') {
            nestingDepth++;
        } else if (char === ')') {
            nestingDepth--;
        }
    }

    if (index - startIndex > 0) {
        properties.push(propertiesQuery.substring(startIndex));
    }

    if (nestingDepth !== 0) {
        throw new ExecutionError(
            `Too many ${nestingDepth > 0 ? 'opening' : 'closing'} parentheses: ${propertiesQuery}`,
            400,
            undefined,
            false
        );
    }

    return properties;
}

export function addPathToExpandParameters(
    path: string,
    expandParameter: Record<string, ExpandDefinition>,
    lambdaVariable?: string,
    skipLast?: boolean,
    removeFromResult?: boolean
): Record<string, ExpandDefinition> {
    const segments = path.split('/');
    if (segments[0] === lambdaVariable) {
        segments.shift();
    }

    if (skipLast) {
        segments.pop();
    }

    let target = expandParameter;
    for (const segment of segments) {
        target[segment] = target[segment] ?? {
            expand: {},
            properties: { '*': true },
            removeFromResult: removeFromResult
        };
        target = target[segment].expand;
    }
    return target;
}

export function addExpandForFilters(
    expandOptions: Record<string, ExpandDefinition>,
    filterDefinition: FilterExpression | undefined
) {
    function expand(
        expression: FilterExpression,
        expandDefinitions: Record<string, ExpandDefinition>,
        lambdaVariable?: string
    ) {
        if (typeof expression.identifier === 'string') {
            addPathToExpandParameters(expression.identifier, expandDefinitions, lambdaVariable, true, true);
        } else if (expression.identifier?.type === 'lambda') {
            const target = addPathToExpandParameters(
                expression.identifier.target,
                expandDefinitions,
                lambdaVariable,
                false,
                true
            );

            for (const subExpression of expression.identifier.expression.expressions) {
                expand(subExpression, target, expression.identifier.key);
            }
        }
    }

    if (filterDefinition) {
        for (const expression of filterDefinition.expressions) {
            expand(expression, expandOptions);
        }
    }
}

export function addExpandForOrderby(
    expandOptions: Record<string, ExpandDefinition>,
    orderByDefinition: OrderByDefinition[]
) {
    for (const definition of orderByDefinition) {
        addPathToExpandParameters(definition.name, expandOptions, undefined, true, true);
    }
}

function parse$expandV4($expand: string | null): ExpandDefinition {
    return splitProperties($expand ?? '').reduce(
        (result: ExpandDefinition, property) => {
            const { pre: name, body: parameters } = balanced('(', ')', property) ?? { pre: property, body: '' };
            const queryPart = splitProperties(parameters, ';').reduce(
                (acc: {}, split) => Object.assign(acc, parse(split)),
                {}
            );

            const expandOptions = parse$expandV4(queryPart['$expand'] as string | null);

            const options: ExpandDefinition = {
                expand: expandOptions.expand,
                properties: parse$select(queryPart['$select'] as string | null)
            };

            if (!options.properties['*']) {
                for (const expandName of Object.keys(expandOptions.expand)) {
                    options.properties[expandName] = true;
                }
            }

            // $filter
            if (queryPart.$filter) {
                options.$filter = parseFilter(queryPart.$filter as string);
                addExpandForFilters(options.expand, options.$filter);
            }

            // $orderby
            if (queryPart.$orderby) {
                options.$orderby = parse$orderby(queryPart.$orderby as string);
                addExpandForOrderby(options.expand, options.$orderby);
            }

            result.expand[name] = options;
            result.properties[name] = true;
            return result;
        },
        { expand: {}, properties: {} }
    );
}

function parse$expandV2($expand: string | null): ExpandDefinition {
    return splitProperties($expand ?? '').reduce(
        (result: ExpandDefinition, property) => {
            const propertySplit = property.split('/');
            const name = propertySplit[0];
            const expand: ExpandDefinition = propertySplit[1]
                ? parse$expandV2(propertySplit.slice(1).join('/'))
                : { expand: {}, properties: {} };
            if (!result.expand[name]) {
                result.expand[name] = {
                    expand: expand.expand,
                    properties: { '*': true }
                };
            } else {
                result.expand[name].expand = merge({}, result.expand[name].expand, expand.expand);
            }

            result.properties[name] = true;
            return result;
        },
        { expand: {}, properties: {} }
    );
}

export function parse$expand(version: '4.0' | '2.0', $expand: string | null): ExpandDefinition {
    return version === '4.0' ? parse$expandV4($expand) : parse$expandV2($expand);
}
