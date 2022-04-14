import type {
    AnnotationPathExpression,
    AnnotationRecord,
    AnnotationTerm,
    Expression,
    NavigationPropertyPathExpression,
    PathExpression,
    PropertyPathExpression,
    RawAnnotation,
    Reference
} from '@sap-ux/vocabularies-types';
import { unalias } from './utils';

/**
 * Revert an object to its raw type equivalent.
 *
 * @param references the current reference
 * @param value the value to revert
 * @returns the raw value
 */
function revertObjectToRawType(references: Reference[], value: any) {
    let result: Expression | undefined;
    if (Array.isArray(value)) {
        result = {
            type: 'Collection',
            Collection: value.map((anno) => revertCollectionItemToRawType(references, anno)) as any[]
        };
    } else if (value.isDecimal?.()) {
        result = {
            type: 'Decimal',
            Decimal: value.valueOf()
        };
    } else if (value.isString?.()) {
        const valueMatches = value.split('.');
        if (valueMatches.length > 1 && references.find((ref) => ref.alias === valueMatches[0])) {
            result = {
                type: 'EnumMember',
                EnumMember: value.valueOf()
            };
        } else {
            result = {
                type: 'String',
                String: value.valueOf()
            };
        }
    } else if (value.type === 'Path') {
        result = {
            type: 'Path',
            Path: value.path
        };
    } else if (value.type === 'AnnotationPath') {
        result = {
            type: 'AnnotationPath',
            AnnotationPath: value.value
        };
    } else if (value.type === 'Apply') {
        result = {
            type: 'Apply',
            Apply: value.Apply
        };
    } else if (value.type === 'Null') {
        result = {
            type: 'Null'
        };
    } else if (value.type === 'PropertyPath') {
        result = {
            type: 'PropertyPath',
            PropertyPath: value.value
        };
    } else if (value.type === 'NavigationPropertyPath') {
        result = {
            type: 'NavigationPropertyPath',
            NavigationPropertyPath: value.value
        };
    } else if (Object.prototype.hasOwnProperty.call(value, '$Type')) {
        result = {
            type: 'Record',
            Record: revertCollectionItemToRawType(references, value) as AnnotationRecord
        };
    }
    return result;
}

/**
 * Revert a value to its raw value depending on its type.
 *
 * @param references the current set of reference
 * @param value the value to revert
 * @returns the raw expression
 */
function revertValueToRawType(references: Reference[], value: any): Expression | undefined {
    let result: Expression | undefined;
    const valueConstructor = value?.constructor.name;
    switch (valueConstructor) {
        case 'String':
        case 'string':
            const valueMatches = value.toString().split('.');
            if (valueMatches.length > 1 && references.find((ref) => ref.alias === valueMatches[0])) {
                result = {
                    type: 'EnumMember',
                    EnumMember: value.toString()
                };
            } else {
                result = {
                    type: 'String',
                    String: value.toString()
                };
            }
            break;
        case 'Boolean':
        case 'boolean':
            result = {
                type: 'Bool',
                Bool: value.valueOf()
            };
            break;

        case 'Number':
        case 'number':
            if (value.toString() === value.toFixed()) {
                result = {
                    type: 'Int',
                    Int: value.valueOf()
                };
            } else {
                result = {
                    type: 'Decimal',
                    Decimal: value.valueOf()
                };
            }
            break;
        case 'object':
        default:
            result = revertObjectToRawType(references, value);
            break;
    }
    return result;
}

const restrictedKeys = ['$Type', 'term', '__source', 'qualifier', 'ActionTarget', 'fullyQualifiedName', 'annotations'];

/**
 * Revert the current embedded annotations to their raw type.
 *
 * @param references the current set of reference
 * @param currentAnnotations the collection item to evaluate
 * @param targetAnnotations the place where we need to add the annotation
 */
function revertAnnotationsToRawType(
    references: Reference[],
    currentAnnotations: any,
    targetAnnotations: RawAnnotation[]
) {
    Object.keys(currentAnnotations)
        .filter((key) => key !== '_annotations')
        .forEach((key) => {
            Object.keys(currentAnnotations[key]).forEach((term) => {
                const parsedAnnotation = revertTermToGenericType(references, currentAnnotations[key][term]);
                if (!parsedAnnotation.term) {
                    const unaliasedTerm = unalias(references, `${key}.${term}`);
                    if (unaliasedTerm) {
                        const qualifiedSplit = unaliasedTerm.split('#');
                        parsedAnnotation.term = qualifiedSplit[0];
                        if (qualifiedSplit.length > 1) {
                            // Sub Annotation with a qualifier, not sure when that can happen in real scenarios
                            parsedAnnotation.qualifier = qualifiedSplit[1];
                        }
                    }
                }
                targetAnnotations.push(parsedAnnotation);
            });
        });
}

/**
 * Revert the current collection item to the corresponding raw annotation.
 *
 * @param references the current set of reference
 * @param collectionItem the collection item to evaluate
 * @returns the raw type equivalent
 */
function revertCollectionItemToRawType(
    references: Reference[],
    collectionItem: any
):
    | AnnotationRecord
    | string
    | PropertyPathExpression
    | PathExpression
    | NavigationPropertyPathExpression
    | AnnotationPathExpression
    | undefined {
    if (typeof collectionItem === 'string') {
        return collectionItem;
    } else if (typeof collectionItem === 'object') {
        if (collectionItem.hasOwnProperty('$Type')) {
            // Annotation Record
            const outItem: AnnotationRecord = {
                type: collectionItem.$Type,
                propertyValues: [] as any[]
            };
            // Could validate keys and type based on $Type
            Object.keys(collectionItem).forEach((collectionKey) => {
                if (restrictedKeys.indexOf(collectionKey) === -1) {
                    const value = collectionItem[collectionKey];
                    outItem.propertyValues.push({
                        name: collectionKey,
                        value: revertValueToRawType(references, value) as Expression
                    });
                } else if (collectionKey === 'annotations') {
                    outItem.annotations = [];
                    revertAnnotationsToRawType(references, collectionItem[collectionKey], outItem.annotations);
                }
            });
            return outItem;
        } else if (collectionItem.type === 'PropertyPath') {
            return {
                type: 'PropertyPath',
                PropertyPath: collectionItem.value
            };
        } else if (collectionItem.type === 'AnnotationPath') {
            return {
                type: 'AnnotationPath',
                AnnotationPath: collectionItem.value
            };
        } else if (collectionItem.type === 'NavigationPropertyPath') {
            return {
                type: 'NavigationPropertyPath',
                NavigationPropertyPath: collectionItem.value
            };
        }
    }
}

/**
 * Revert an annotation term to it's generic or raw equivalent.
 *
 * @param references the reference of the current context
 * @param annotation the annotation term to revert
 * @returns the raw annotation
 */
export function revertTermToGenericType(references: Reference[], annotation: AnnotationTerm<any>): RawAnnotation {
    const baseAnnotation: RawAnnotation = {
        term: annotation.term,
        qualifier: annotation.qualifier
    };
    if (Array.isArray(annotation)) {
        // Collection
        if (annotation.hasOwnProperty('annotations')) {
            // Annotation on a collection itself, not sure when that happens if at all
            baseAnnotation.annotations = [];
            revertAnnotationsToRawType(references, (annotation as any).annotations, baseAnnotation.annotations);
        }
        return {
            ...baseAnnotation,
            collection: annotation.map((anno) => revertCollectionItemToRawType(references, anno)) as any[]
        };
    } else if (annotation.hasOwnProperty('$Type')) {
        return { ...baseAnnotation, record: revertCollectionItemToRawType(references, annotation) as any };
    } else {
        return { ...baseAnnotation, value: revertValueToRawType(references, annotation) };
    }
}
