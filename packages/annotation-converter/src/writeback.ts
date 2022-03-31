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

function revertValueToGenericType(references: Reference[], value: any): Expression | undefined {
    let result: Expression | undefined;
    if (typeof value === 'string') {
        const valueMatches = value.split('.');
        if (valueMatches.length > 1 && references.find((ref) => ref.alias === valueMatches[0])) {
            result = {
                type: 'EnumMember',
                EnumMember: value
            };
        } else {
            result = {
                type: 'String',
                String: value
            };
        }
    } else if (Array.isArray(value)) {
        result = {
            type: 'Collection',
            Collection: value.map((anno) => revertCollectionItemToGenericType(references, anno)) as any[]
        };
    } else if (typeof value === 'boolean') {
        result = {
            type: 'Bool',
            Bool: value
        };
    } else if (typeof value === 'number') {
        if (value.toString() === value.toFixed()) {
            result = {
                type: 'Int',
                Int: value
            };
        } else {
            result = {
                type: 'Decimal',
                Decimal: value
            };
        }
    } else if (typeof value === 'object' && value.isDecimal && value.isDecimal()) {
        result = {
            type: 'Decimal',
            Decimal: value.valueOf()
        };
    } else if (typeof value === 'object' && value.isString && value.isString()) {
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
            Record: revertCollectionItemToGenericType(references, value) as AnnotationRecord
        };
    }
    return result;
}

function revertCollectionItemToGenericType(
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
                if (
                    collectionKey !== '$Type' &&
                    collectionKey !== 'term' &&
                    collectionKey !== '__source' &&
                    collectionKey !== 'qualifier' &&
                    collectionKey !== 'ActionTarget' &&
                    collectionKey !== 'fullyQualifiedName' &&
                    collectionKey !== 'annotations'
                ) {
                    const value = collectionItem[collectionKey];
                    outItem.propertyValues.push({
                        name: collectionKey,
                        value: revertValueToGenericType(references, value) as Expression
                    });
                } else if (collectionKey === 'annotations') {
                    const annotations = collectionItem[collectionKey];
                    outItem.annotations = [];
                    Object.keys(annotations)
                        .filter((key) => key !== '_annotations')
                        .forEach((key) => {
                            Object.keys(annotations[key]).forEach((term) => {
                                const parsedAnnotation = revertTermToGenericType(references, annotations[key][term]);
                                if (!parsedAnnotation.term) {
                                    const unaliasedTerm = unalias(references, `${key}.${term}`);
                                    if (unaliasedTerm) {
                                        const qualifiedSplit = unaliasedTerm.split('#');
                                        parsedAnnotation.term = qualifiedSplit[0];
                                        if (qualifiedSplit.length > 1) {
                                            parsedAnnotation.qualifier = qualifiedSplit[1];
                                        }
                                    }
                                }
                                outItem.annotations?.push(parsedAnnotation);
                            });
                        });
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

export function revertTermToGenericType(references: Reference[], annotation: AnnotationTerm<any>): RawAnnotation {
    const baseAnnotation: RawAnnotation = {
        term: annotation.term,
        qualifier: annotation.qualifier
    };
    if (Array.isArray(annotation)) {
        // Collection
        if (annotation.hasOwnProperty('annotations')) {
            baseAnnotation.annotations = [];
            const currentAnnotations = (annotation as any).annotations;
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
                                    parsedAnnotation.qualifier = qualifiedSplit[1];
                                }
                            }
                        }
                        baseAnnotation.annotations?.push(parsedAnnotation);
                    });
                });
        }
        return {
            ...baseAnnotation,
            collection: annotation.map((anno) => revertCollectionItemToGenericType(references, anno)) as any[]
        };
    } else if (annotation.hasOwnProperty('$Type')) {
        return { ...baseAnnotation, record: revertCollectionItemToGenericType(references, annotation) as any };
    } else {
        return { ...baseAnnotation, value: revertValueToGenericType(references, annotation) };
    }
}
