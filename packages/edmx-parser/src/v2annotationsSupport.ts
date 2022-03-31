import type { RawAnnotation, PropertyValue } from '@sap-ux/vocabularies-types';
import { CoreAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Core';
import { CapabilitiesAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Capabilities';
import { CommonAnnotationTerms, FieldControlType } from '@sap-ux/vocabularies-types/vocabularies/Common';
import { MeasuresAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Measures';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { AggregationAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Aggregation';

export type V2annotationsSupport = {
    'sap:schema-version'?: string;
    'sap:creatable'?: string;
    'sap:creatable-path'?: string;
    'sap:updatable'?: string;
    'sap:updatable-path'?: string;
    'sap:deletable'?: string;
    'sap:deletable-path'?: string;
    'sap:searchable'?: string;
    'sap:pageable'?: string;
    'sap:topable'?: string;
    'sap:addressable'?: string;
    'sap:requires-filter'?: string;
    'sap:required-in-filter'?: string;
    'sap:filterable'?: string;
    'sap:filter-restricton'?: string;
    'sap:sortable'?: string;
    'sap:visible'?: string;
    'sap:label'?: string;
    'sap:heading'?: string;
    'sap:quickinfo'?: string;
    'sap:text'?: string;
    'sap:unit'?: string;
    'sap:precision'?: string;
    'sap:value-list'?: string;
    'sap:display-format'?: string;
    'sap:lower-boundary'?: string;
    'sap:upper-boundary'?: string;
    'sap:field-control'?: string;
    'sap:action-for'?: string;
    'sap:applicable-path'?: string;
    'sap:is-annotation'?: string;
    'sap:minoccurs'?: string;
    'sap:maxoccurs'?: string;
    'sap:parameter'?: string;
    'sap:attribute-for'?: string;
    'sap:semantics'?: string;
    // Leaving out the hiearchy / aggregation relate ones :)
};

export type ObjectType = 'EntitySet' | 'EntityType' | 'Singleton' | 'Property' | 'NavigationProperty';

/**
 * Convert v2 annotation that were defined on the schema as standard v4 annotations.
 *
 * @param attributes the attribute of the current object
 * @param objectType the object type
 * @param objectName the object name
 * @returns the converted annotations
 */
export function convertV2Annotations(
    attributes: V2annotationsSupport,
    objectType: ObjectType,
    objectName: string
): RawAnnotation[] {
    const annotations: RawAnnotation[] = [];
    switch (objectType) {
        case 'EntitySet':
            convertEntitySetAnnotations(attributes, annotations);
            break;
        case 'EntityType':
            convertEntityTypeAnnotations(attributes, annotations);
            break;
        case 'NavigationProperty':
            convertNavigationPropertyAnnotations(attributes, objectName, annotations);
            break;
        case 'Property':
            convertPropertyAnnotations(attributes, objectName, annotations);
            break;
        case 'Singleton':
            break;
        default:
            break;
    }
    convertGenericAnnotations(attributes, objectName, annotations);
    return annotations;
}

/**
 * Convert annotation that can apply to all kind of objects.
 *
 * @param attributes the attribute of the current object
 * @param objectName the object name
 * @param annotations the raw annotation array
 */
export function convertGenericAnnotations(
    attributes: V2annotationsSupport,
    objectName: string,
    annotations: RawAnnotation[]
) {
    /**
     * Push to annotation if the condition evaluates to true.
     *
     * @param condition the condition to evaluate
     * @param value the target value
     */
    function pushToAnnotations(condition: boolean, value: any) {
        if (condition) {
            annotations.push(value);
        }
    }

    pushToAnnotations(attributes['sap:schema-version'] !== undefined, {
        term: CoreAnnotationTerms.SchemaVersion,
        value: {
            type: 'String',
            String: attributes['sap:schema-version']
        }
    });

    pushToAnnotations(attributes['sap:searchable'] !== undefined, {
        term: CapabilitiesAnnotationTerms.SearchRestrictions,
        record: {
            propertyValues: [
                {
                    name: 'Searchable',
                    value: {
                        type: 'Bool',
                        Bool: attributes['sap:searchable'] === 'true'
                    }
                }
            ]
        }
    });
    pushToAnnotations(attributes['sap:pageable'] !== undefined, {
        term: CapabilitiesAnnotationTerms.TopSupported,
        value: {
            type: 'Bool',
            Bool: attributes['sap:pageable'] === 'true'
        }
    });

    pushToAnnotations(attributes['sap:pageable'] !== undefined, {
        term: CapabilitiesAnnotationTerms.SkipSupported,
        value: {
            type: 'Bool',
            Bool: attributes['sap:pageable'] === 'true'
        }
    });

    pushToAnnotations(attributes['sap:topable'] !== undefined, {
        term: CapabilitiesAnnotationTerms.TopSupported,
        value: {
            type: 'Bool',
            Bool: attributes['sap:topable'] === 'true'
        }
    });

    pushToAnnotations(attributes['sap:requires-filter'] !== undefined, {
        term: CapabilitiesAnnotationTerms.FilterRestrictions,
        record: {
            propertyValues: [
                {
                    name: 'RequiresFilter',
                    value: {
                        type: 'Bool',
                        Bool: attributes['sap:requires-filter'] === 'true'
                    }
                }
            ]
        }
    });
    pushToAnnotations(attributes['sap:required-in-filter'] !== undefined, {
        term: CapabilitiesAnnotationTerms.FilterRestrictions,
        record: {
            propertyValues: [
                {
                    name: 'RequiredProperties',
                    value: {
                        type: 'Collection',
                        Collection: [
                            {
                                type: 'PropertyPath',
                                PropertyPath: objectName
                            }
                        ]
                    }
                }
            ]
        }
    });

    pushToAnnotations(attributes['sap:filter-restricton'] !== undefined, {
        term: CapabilitiesAnnotationTerms.FilterRestrictions,
        record: {
            propertyValues: [
                {
                    name: 'FilterExpressionRestrictions',
                    value: {
                        type: 'Collection',
                        Collection: [
                            {
                                type: 'Record',
                                propertyValues: [
                                    {
                                        name: 'FilterExpressionRestrictions',
                                        value: {
                                            type: 'String',
                                            String: attributes['sap:filter-restricton']
                                        }
                                    },
                                    {
                                        name: 'Property',
                                        value: {
                                            type: 'PropertyPath',
                                            PropertyPath: objectName
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        }
    });
    pushToAnnotations(attributes['sap:sortable'] === 'false', {
        term: CapabilitiesAnnotationTerms.SortRestrictions,
        record: {
            propertyValues: [
                {
                    name: 'NonSortableProperties',
                    value: {
                        type: 'PropertyPath',
                        PropertyPath: objectName
                    }
                }
            ]
        }
    });
    pushToAnnotations(attributes['sap:visible'] === 'false', {
        term: UIAnnotationTerms.Hidden,
        value: {
            type: 'Bool',
            Bool: true
        }
    });
    pushToAnnotations(attributes['sap:label'] !== undefined, {
        term: CommonAnnotationTerms.Label,
        value: {
            type: 'String',
            String: attributes['sap:label']
        }
    });
    pushToAnnotations(attributes['sap:heading'] !== undefined, {
        term: CommonAnnotationTerms.Heading,
        value: {
            type: 'String',
            String: attributes['sap:heading']
        }
    });

    pushToAnnotations(attributes['sap:quickinfo'] !== undefined, {
        term: CommonAnnotationTerms.QuickInfo,
        value: {
            type: 'String',
            String: attributes['sap:quickinfo']
        }
    });
    pushToAnnotations(attributes['sap:text'] !== undefined, {
        term: CommonAnnotationTerms.Text,
        value: {
            type: 'Path',
            Path: attributes['sap:text']
        }
    });

    pushToAnnotations(attributes['sap:unit'] !== undefined, {
        term: MeasuresAnnotationTerms.Unit,
        value: {
            type: 'Path',
            Path: attributes['sap:unit']
        }
    });
    pushToAnnotations(attributes['sap:unit'] !== undefined, {
        term: MeasuresAnnotationTerms.ISOCurrency,
        value: {
            type: 'Path',
            Path: attributes['sap:unit']
        }
    });

    pushToAnnotations(attributes['sap:precision'] !== undefined, {
        term: MeasuresAnnotationTerms.Scale,
        value: {
            type: 'Int',
            Int: parseInt(attributes['sap:precision'] as string, 10)
        }
    });
    pushToAnnotations(attributes['sap:value-list'] === 'fixed-value', {
        term: CommonAnnotationTerms.ValueListWithFixedValues,
        value: {
            type: 'Bool',
            Bool: true
        }
    });

    pushToAnnotations(attributes['sap:display-format'] === 'NonNegative', {
        term: CommonAnnotationTerms.IsDigitSequence,
        value: {
            type: 'Bool',
            Bool: true
        }
    });

    pushToAnnotations(attributes['sap:display-format'] === 'UpperCase', {
        term: CommonAnnotationTerms.IsUpperCase,
        value: {
            type: 'Bool',
            Bool: true
        }
    });

    if (attributes['sap:lower-boundary'] || attributes['sap:upper-boundary']) {
        const pv: PropertyValue[] = [];
        if (attributes['sap:lower-boundary']) {
            pv.push({
                name: 'LowerBoundary',
                value: {
                    type: 'PropertyPath',
                    PropertyPath: attributes['sap:lower-boundary']
                }
            });
        }
        if (attributes['sap:upper-boundary']) {
            pv.push({
                name: 'UpperBoundary',
                value: {
                    type: 'PropertyPath',
                    PropertyPath: attributes['sap:upper-boundary']
                }
            });
        }
        annotations.push({
            term: CommonAnnotationTerms.Interval,
            record: {
                propertyValues: pv
            }
        });
    }
    pushToAnnotations(attributes['sap:field-control'] !== undefined, {
        term: CommonAnnotationTerms.FieldControl,
        value: {
            type: 'Path',
            Path: attributes['sap:field-control']
        }
    });

    pushToAnnotations(attributes['sap:applicable-path'] !== undefined, {
        term: CoreAnnotationTerms.OperationAvailable,
        value: {
            type: 'Path',
            Path: attributes['sap:applicable-path']
        }
    });
    pushToAnnotations(attributes['sap:minoccurs'] !== undefined, {
        term: CommonAnnotationTerms.MinOccurs,
        value: {
            type: 'Int',
            Int: parseInt(attributes['sap:minoccurs'] as string, 10)
        }
    });

    pushToAnnotations(attributes['sap:maxoccurs'] !== undefined, {
        term: CommonAnnotationTerms.MaxOccurs,
        value: {
            type: 'Int',
            Int: parseInt(attributes['sap:maxoccurs'] as string, 10)
        }
    });

    pushToAnnotations(attributes['sap:parameter'] === 'mandatory', {
        term: CommonAnnotationTerms.FieldControl,
        value: {
            type: 'EnumMember',
            EnumMember: FieldControlType.Mandatory
        }
    });

    pushToAnnotations(attributes['sap:parameter'] === 'optional', {
        term: CommonAnnotationTerms.FieldControl,
        value: {
            type: 'EnumMember',
            EnumMember: FieldControlType.Optional
        }
    });

    pushToAnnotations(attributes['sap:attribute-for'] !== undefined, {
        term: CommonAnnotationTerms.Attributes,
        value: {
            type: 'Collection',
            Collection: [
                {
                    type: 'PropertyPath',
                    PropertyPath: objectName
                }
            ]
        }
    });
}

/**
 * Convert annotations specific to entityset.
 *
 * @param attributes The V2 Annotations to evaluate
 * @param annotations The raw annotation array
 */
export function convertEntitySetAnnotations(attributes: V2annotationsSupport, annotations: RawAnnotation[]) {
    if (attributes['sap:creatable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.InsertRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Insertable',
                        value: {
                            type: 'Bool',
                            Bool: attributes['sap:creatable'] === 'true'
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:updatable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.UpdateRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Updatable',
                        value: {
                            type: 'Bool',
                            Bool: attributes['sap:updatable'] === 'true'
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:updatable-path']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.UpdateRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Updatable',
                        value: {
                            type: 'Path',
                            Path: attributes['sap:updatable-path']
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:deletable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.DeleteRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Deletable',
                        value: {
                            type: 'Bool',
                            Bool: attributes['sap:updatable'] === 'true'
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:deletable-path']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.DeleteRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Deletable',
                        value: {
                            type: 'Path',
                            Path: attributes['sap:deletable-path']
                        }
                    }
                ]
            }
        });
    }
}

/**
 * Convert annotations specific to navigation properties.
 *
 * @param attributes The V2 Annotations to evaluate
 * @param objectName The name of the navigation property
 * @param annotations The raw annotation array
 */
export function convertNavigationPropertyAnnotations(
    attributes: V2annotationsSupport,
    objectName: string,
    annotations: RawAnnotation[]
) {
    if (attributes['sap:creatable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.NavigationRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'RestrictedProperties',
                        value: {
                            type: 'Record',
                            Record: {
                                propertyValues: [
                                    {
                                        name: 'InsertRestrictrions',
                                        value: {
                                            type: 'Record',
                                            Record: {
                                                propertyValues: [
                                                    {
                                                        name: 'Insertable',
                                                        value: {
                                                            type: 'Bool',
                                                            Bool: attributes['sap:creatable'] === 'true'
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:creatable-path']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.NavigationRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'RestrictedProperties',
                        value: {
                            type: 'Record',
                            Record: {
                                propertyValues: [
                                    {
                                        name: 'InsertRestrictrions',
                                        value: {
                                            type: 'Record',
                                            Record: {
                                                propertyValues: [
                                                    {
                                                        name: 'Insertable',
                                                        value: {
                                                            type: 'Path',
                                                            Path: attributes['sap:creatable-path']
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:filterable'] === 'false') {
        annotations.push({
            term: CapabilitiesAnnotationTerms.NavigationRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'RestrictedProperties',
                        value: {
                            type: 'Collection',
                            Collection: [
                                {
                                    type: 'Record',
                                    propertyValues: [
                                        {
                                            name: 'NavigationProperty',
                                            value: {
                                                type: 'NavigationPropertyPath',
                                                NavigationPropertyPath: objectName
                                            }
                                        },
                                        {
                                            name: 'FilterRestrictions',
                                            value: {
                                                type: 'Record',
                                                Record: {
                                                    propertyValues: [
                                                        {
                                                            name: 'Filterable',
                                                            value: {
                                                                type: 'Bool',
                                                                Bool: false
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        });
    }
}

/**
 * Convert annotations specific to properties.
 *
 * @param attributes The V2 Annotations to evaluate
 * @param objectName The name of the property
 * @param annotations The raw annotation array
 */
export function convertPropertyAnnotations(
    attributes: V2annotationsSupport,
    objectName: string,
    annotations: RawAnnotation[]
) {
    if (attributes['sap:creatable'] === 'true' && attributes['sap:updatable'] === 'false') {
        annotations.push({
            term: CoreAnnotationTerms.Immutable,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:creatable'] === 'false' && attributes['sap:updatable'] === 'false') {
        annotations.push({
            term: CoreAnnotationTerms.Computed,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:updatable-path']) {
        annotations.push({
            term: CommonAnnotationTerms.FieldControl,
            value: {
                type: 'Path',
                Path: attributes['sap:updatable-path']
            }
        });
    }
    if (attributes['sap:filterable'] === 'false') {
        annotations.push({
            term: CapabilitiesAnnotationTerms.FilterRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'NonFilterableProperties',
                        value: {
                            type: 'Collection',
                            Collection: [
                                {
                                    type: 'PropertyPath',
                                    PropertyPath: objectName
                                }
                            ]
                        }
                    }
                ]
            }
        });
    }
}

/**
 * Convert annotations specific to properties.
 *
 * @param attributes The V2 Annotations to evaluate
 * @param annotations The raw annotation array
 */
export function convertEntityTypeAnnotations(attributes: V2annotationsSupport, annotations: RawAnnotation[]) {
    if (attributes['sap:semantics'] === 'aggregate') {
        annotations.push({
            term: AggregationAnnotationTerms.ApplySupported,
            record: {
                propertyValues: [
                    {
                        /**
                         Only properties marked as `Groupable` can be used in the `groupby` transformation, and only those marked as `Aggregatable` can be used in the  `aggregate` transformation
                         */
                        name: 'PropertyRestrictions',
                        value: {
                            type: 'Collection',
                            Collection: []
                        }
                    },
                    {
                        /**
                         A non-empty collection indicates that only the listed properties of the annotated target are supported by the `groupby` transformation
                         */
                        name: 'GroupableProperties',
                        value: {
                            type: 'Collection',
                            Collection: []
                        }
                    },
                    {
                        /**
                         A non-empty collection indicates that only the listed properties of the annotated target can be used in the `aggregate` transformation, optionally restricted to the specified aggregation methods
                         */
                        name: 'AggregatableProperties',
                        value: {
                            type: 'Collection',
                            Collection: []
                        }
                    }
                ]
            }
        });
    }
}
