import type {
    Annotation,
    AnnotationList,
    ArrayWithIndex,
    ComplexType,
    Index,
    RawMetadata,
    Reference,
    TypeDefinition
} from '@sap-ux/vocabularies-types';

export { EnumIsFlag } from '@sap-ux/vocabularies-types/vocabularies/EnumIsFlag';
export { TermToTypes } from '@sap-ux/vocabularies-types/vocabularies/TermToTypes';
export { VocabularyReferences as defaultReferences } from '@sap-ux/vocabularies-types/vocabularies/VocabularyReferences';

export type ReferencesWithMap = Reference[] & {
    referenceMap?: Record<string, Reference>;
    reverseReferenceMap?: Record<string, Reference>;
};

function splitAt(string: string, index: number): [string, string] {
    return index < 0 ? [string, ''] : [string.substring(0, index), string.substring(index + 1)];
}

function substringAt(string: string, index: number) {
    return index < 0 ? string : string.substring(0, index);
}

/**
 * Splits a string at the first occurrence of a separator.
 *
 * @param string    The string to split
 * @param separator Separator, e.g. a single character.
 * @returns An array consisting of two elements: the part before the first occurrence of the separator and the part after it. If the string does not contain the separator, the second element is the empty string.
 */
export function splitAtFirst(string: string, separator: string): [string, string] {
    return splitAt(string, string.indexOf(separator));
}

/**
 * Splits a string at the last occurrence of a separator.
 *
 * @param string    The string to split
 * @param separator Separator, e.g. a single character.
 * @returns An array consisting of two elements: the part before the last occurrence of the separator and the part after it. If the string does not contain the separator, the second element is the empty string.
 */
export function splitAtLast(string: string, separator: string): [string, string] {
    return splitAt(string, string.lastIndexOf(separator));
}

/**
 * Returns the substring before the first occurrence of a separator.
 *
 * @param string    The string
 * @param separator Separator, e.g. a single character.
 * @returns The substring before the first occurrence of the separator, or the input string if it does not contain the separator.
 */
export function substringBeforeFirst(string: string, separator: string): string {
    return substringAt(string, string.indexOf(separator));
}

/**
 * Returns the substring before the last occurrence of a separator.
 *
 * @param string    The string
 * @param separator Separator, e.g. a single character.
 * @returns The substring before the last occurrence of the separator, or the input string if it does not contain the separator.
 */
export function substringBeforeLast(string: string, separator: string): string {
    return substringAt(string, string.lastIndexOf(separator));
}

/**
 * Transform an unaliased string representation annotation to the aliased version.
 *
 * @param references currentReferences for the project
 * @param unaliasedValue the unaliased value
 * @returns the aliased string representing the same
 */
export function alias(references: ReferencesWithMap, unaliasedValue: string): string {
    if (!references.reverseReferenceMap) {
        references.reverseReferenceMap = references.reduce((map: Record<string, Reference>, ref) => {
            map[ref.namespace] = ref;
            return map;
        }, {});
    }
    if (!unaliasedValue) {
        return unaliasedValue;
    }
    const [namespace, value] = splitAtLast(unaliasedValue, '.');
    const reference = references.reverseReferenceMap[namespace];
    if (reference) {
        return `${reference.alias}.${value}`;
    } else if (unaliasedValue.includes('@')) {
        // Try to see if it's an annotation Path like to_SalesOrder/@UI.LineItem
        const [preAlias, postAlias] = splitAtFirst(unaliasedValue, '@');
        return `${preAlias}@${alias(references, postAlias)}`;
    } else {
        return unaliasedValue;
    }
}

/**
 * Transform an aliased string to its unaliased version given a set of references.
 *
 * @param references The references to use for unaliasing.
 * @param aliasedValue The aliased value
 * @param namespace The fallback namespace
 * @returns The equal unaliased string.
 */
export function unalias(
    references: ReferencesWithMap,
    aliasedValue: string | undefined,
    namespace?: string
): string | undefined {
    const _unalias = (value: string) => {
        if (!references.referenceMap) {
            references.referenceMap = Object.fromEntries(references.map((ref) => [ref.alias, ref]));
        }

        // Aliases are of type 'SimpleIdentifier' and must not contain dots
        const [maybeAlias, rest] = splitAtFirst(value, '.');

        if (!rest || rest.includes('.')) {
            // either there is no dot in the value or there is more than one --> nothing to do
            return value;
        }

        const isAnnotation = maybeAlias.startsWith('@');
        const valueToUnalias = isAnnotation ? maybeAlias.substring(1) : maybeAlias;
        const knownReference = references.referenceMap[valueToUnalias];
        if (knownReference) {
            return isAnnotation ? `@${knownReference.namespace}.${rest}` : `${knownReference.namespace}.${rest}`;
        }

        // The alias could not be resolved using the references. Assume it is the "global" alias (= namespace)
        return namespace && !isAnnotation ? `${namespace}.${rest}` : value;
    };

    return aliasedValue
        ?.split('/')
        .reduce((segments, segment) => {
            // the segment could be an action, like "doSomething(foo.bar)"
            const [first, rest] = splitAtFirst(segment, '(');
            const subSegment = [_unalias(first)];

            if (rest) {
                const parameter = rest.slice(0, -1); // remove trailing ")"
                subSegment.push(`(${_unalias(parameter)})`);
            }
            segments.push(subSegment.join(''));

            return segments;
        }, [] as string[])
        ?.join('/');
}

/**
 * Differentiate between a ComplexType and a TypeDefinition.
 *
 * @param complexTypeDefinition
 * @returns true if the value is a complex type
 */
export function isComplexTypeDefinition(
    complexTypeDefinition?: ComplexType | TypeDefinition
): complexTypeDefinition is ComplexType {
    return (
        !!complexTypeDefinition && complexTypeDefinition._type === 'ComplexType' && !!complexTypeDefinition.properties
    );
}

export function Double(value: number) {
    return {
        isDouble() {
            return true;
        },
        valueOf() {
            return value;
        },
        toString() {
            return value.toString();
        }
    };
}

export function Decimal(value: number) {
    return {
        isDecimal() {
            return true;
        },
        valueOf() {
            return value;
        },
        toString() {
            return value.toString();
        }
    };
}
export const initialSymbol = Symbol('initial');
/**
 * Defines a lazy property.
 *
 * The property is initialized by calling the init function on the first read access, or by directly assigning a value.
 *
 * @param object    The host object
 * @param property  The lazy property to add
 * @param init      The function that initializes the property's value
 */
export function lazy<Type, Key extends keyof Type>(object: Type, property: Key, init: () => Type[Key]) {
    let _value: Type[Key] | typeof initialSymbol = initialSymbol;
    Object.defineProperty(object, property, {
        enumerable: true,
        get() {
            if (_value === initialSymbol) {
                _value = init();
            }
            return _value;
        },

        set(value: Type[Key]) {
            _value = value;
        }
    });
}

/**
 * Creates a function that allows to find an array element by property value.
 *
 * @param array     The array
 * @param property  Elements in the array are searched by this property
 * @returns A function that can be used to find an element of the array by property value.
 */
export function createIndexedFind<T>(array: Array<T>, property: keyof T) {
    const index: Map<T[keyof T], T | undefined> = new Map();

    return function find(value: T[keyof T]) {
        const element = index.get(value);

        if (element?.[property] === value) {
            return element;
        }

        return array.find((element) => {
            if (!element?.hasOwnProperty(property)) {
                return false;
            }

            const propertyValue = element[property];
            index.set(propertyValue, element);
            return propertyValue === value;
        });
    };
}

/**
 * Adds a 'get by value' function to an array.
 *
 * If this function is called with addIndex(myArray, 'name'), a new function 'by_name(value)' will be added that allows to
 * find a member of the array by the value of its 'name' property.
 *
 * @param array      The array
 * @param property   The property that will be used by the 'by_{property}()' function
 * @returns The array with the added function
 */
export function addGetByValue<T, P extends Extract<keyof T, string>>(array: Array<T>, property: P) {
    const indexName: keyof Index<T, P> = `by_${property}`;

    if (!array.hasOwnProperty(indexName)) {
        Object.defineProperty(array, indexName, { writable: false, value: createIndexedFind(array, property) });
    } else {
        throw new Error(`Property '${indexName}' already exists`);
    }
    return array as ArrayWithIndex<T, P>;
}

/**
 * Copy of the one from edmx-parser because we don't want a dependency.
 * @param baseMetadata
 * @param parserOutput
 */
export function mergeRawMetadata(baseMetadata: RawMetadata, parserOutput: RawMetadata): void {
    baseMetadata.references.splice(0, 0, ...parserOutput.references);
    baseMetadata.schema.annotations = Object.assign(baseMetadata.schema.annotations, parserOutput.schema.annotations);
    baseMetadata.schema.associationSets.splice(0, 0, ...parserOutput.schema.associationSets);
    baseMetadata.schema.associations.splice(0, 0, ...parserOutput.schema.associations);
    baseMetadata.schema.entitySets.splice(0, 0, ...parserOutput.schema.entitySets);
    baseMetadata.schema.singletons.splice(0, 0, ...parserOutput.schema.singletons);
    baseMetadata.schema.actions.splice(0, 0, ...parserOutput.schema.actions);
    baseMetadata.schema.actionImports.splice(0, 0, ...parserOutput.schema.actionImports);
    baseMetadata.schema.entityTypes.splice(0, 0, ...parserOutput.schema.entityTypes);
    baseMetadata.schema.complexTypes.splice(0, 0, ...parserOutput.schema.complexTypes);
    baseMetadata.schema.enumTypes.splice(0, 0, ...parserOutput.schema.enumTypes);
    baseMetadata.schema.typeDefinitions.splice(0, 0, ...parserOutput.schema.typeDefinitions);
    baseMetadata.schema.entityContainers ??= {};
    baseMetadata.schema.entityContainers[parserOutput.identification] = parserOutput.schema.entityContainer;
}
/**
 * Merge annotations from different sources together by overwriting at the term level.
 *
 * @param references        References, used to resolve aliased annotation targets and aliased annotation terms.
 * @param annotationSources Annotation sources
 * @returns the resulting merged annotations
 */
export function mergeAnnotations(
    references: Reference[],
    ...annotationSources: { name: string; annotationList: AnnotationList[] }[]
): Record<string, Annotation[]> {
    return annotationSources.reduceRight((result, { name, annotationList }) => {
        for (const { target, annotations } of annotationList) {
            const annotationTarget = unalias(references, target) ?? target;
            if (!result[annotationTarget]) {
                result[annotationTarget] = [];
            }

            const annotationsOnTarget = annotations
                .map((rawAnnotation): Annotation => {
                    rawAnnotation.term = unalias(references, rawAnnotation.term) ?? rawAnnotation.term;

                    (rawAnnotation as any).fullyQualifiedName = rawAnnotation.qualifier
                        ? `${annotationTarget}@${rawAnnotation.term}#${rawAnnotation.qualifier}`
                        : `${annotationTarget}@${rawAnnotation.term}`;

                    (rawAnnotation as any).__source = name;

                    return rawAnnotation as Annotation;
                })
                .filter(
                    (annotation) =>
                        !result[annotationTarget].some(
                            (existingAnnotation) =>
                                existingAnnotation.term === annotation.term &&
                                existingAnnotation.qualifier === annotation.qualifier
                        )
                );

            result[annotationTarget].push(...annotationsOnTarget);
        }

        return result;
    }, {} as Record<string, Annotation[]>);
}
