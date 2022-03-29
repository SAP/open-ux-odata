import type { Annotation, PropertyValue } from '@sap-ux/vocabularies-types';
import { CoreAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Core';
import { CapabilitiesAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Capabilities';
import { CommonAnnotationTerms, FieldControlType } from '@sap-ux/vocabularies-types/vocabularies/Common';
import { MeasuresAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/Measures';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';

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
    // Leaving out the hiearchy / aggregation relate ones :)
};

export type ObjectType = 'EntitySet' | 'Singleton' | 'Property' | 'NavigationProperty';

/**
 * Convert v2 annotation that were defined on the schema as standard v4 annotations.
 *
 * @param attributes the attribute of the current object
 * @param objectType the object type
 * @param objectName the object name
 * @returns the converted annotation
 */
export function convertV2Annotations(
    attributes: V2annotationsSupport,
    objectType: ObjectType,
    objectName: string
): Annotation[] {
    const annotations: Annotation[] = [];
    if (attributes['sap:schema-version']) {
        annotations.push({
            term: CoreAnnotationTerms.SchemaVersion,
            value: {
                type: 'String',
                String: attributes['sap:schema-version']
            }
        });
    }
    if (attributes['sap:creatable'] && objectType === 'EntitySet') {
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
    if (attributes['sap:creatable'] && objectType === 'NavigationProperty') {
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
    if (attributes['sap:creatable-path'] && objectType === 'NavigationProperty') {
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
    if (attributes['sap:updatable'] && objectType === 'EntitySet') {
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
    if (attributes['sap:updatable-path'] && objectType === 'EntitySet') {
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
    if (attributes['sap:deletable'] && objectType === 'EntitySet') {
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
    if (attributes['sap:deletable-path'] && objectType === 'EntitySet') {
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
    if (
        attributes['sap:creatable'] === 'true' &&
        attributes['sap:updatable'] === 'false' &&
        objectType === 'Property'
    ) {
        annotations.push({
            term: CoreAnnotationTerms.Immutable,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (
        attributes['sap:creatable'] === 'false' &&
        attributes['sap:updatable'] === 'false' &&
        objectType === 'Property'
    ) {
        annotations.push({
            term: CoreAnnotationTerms.Computed,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:updatable-path'] && objectType === 'Property') {
        annotations.push({
            term: CommonAnnotationTerms.FieldControl,
            value: {
                type: 'Path',
                Path: attributes['sap:updatable-path']
            }
        });
    }
    if (attributes['sap:searchable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.SearchRestrictions,
            record: {
                propertyValues: [
                    {
                        name: 'Searachable',
                        value: {
                            type: 'Bool',
                            Bool: attributes['sap:searchable'] === 'true'
                        }
                    }
                ]
            }
        });
    }
    if (attributes['sap:pageable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.TopSupported,
            value: {
                type: 'Bool',
                Bool: attributes['sap:pageable'] === 'true'
            }
        });
        annotations.push({
            term: CapabilitiesAnnotationTerms.SkipSupported,
            value: {
                type: 'Bool',
                Bool: attributes['sap:pageable'] === 'true'
            }
        });
    }
    if (attributes['sap:topable']) {
        annotations.push({
            term: CapabilitiesAnnotationTerms.TopSupported,
            value: {
                type: 'Bool',
                Bool: attributes['sap:topable'] === 'true'
            }
        });
    }
    if (attributes['sap:requires-filter']) {
        annotations.push({
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
    }
    if (attributes['sap:required-in-filter']) {
        annotations.push({
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
    }
    if (attributes['sap:filterable'] === 'false' && objectType === 'Property') {
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

    if (attributes['sap:filterable'] === 'false' && objectType === 'NavigationProperty') {
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

    if (attributes['sap:filter-restricton']) {
        annotations.push({
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
    }
    if (attributes['sap:sortable'] === 'false') {
        annotations.push({
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
    }
    if (attributes['sap:visible'] === 'false') {
        annotations.push({
            term: UIAnnotationTerms.Hidden,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:label']) {
        annotations.push({
            term: CommonAnnotationTerms.Label,
            value: {
                type: 'String',
                String: attributes['sap:label']
            }
        });
    }
    if (attributes['sap:heading']) {
        annotations.push({
            term: CommonAnnotationTerms.Heading,
            value: {
                type: 'String',
                String: attributes['sap:heading']
            }
        });
    }
    if (attributes['sap:quickinfo']) {
        annotations.push({
            term: CommonAnnotationTerms.QuickInfo,
            value: {
                type: 'String',
                String: attributes['sap:quickinfo']
            }
        });
    }
    if (attributes['sap:text']) {
        annotations.push({
            term: CommonAnnotationTerms.Text,
            value: {
                type: 'Path',
                Path: attributes['sap:text']
            }
        });
    }
    if (attributes['sap:unit']) {
        annotations.push({
            term: MeasuresAnnotationTerms.Unit,
            value: {
                type: 'Path',
                Path: attributes['sap:unit']
            }
        });
        annotations.push({
            term: MeasuresAnnotationTerms.ISOCurrency,
            value: {
                type: 'Path',
                Path: attributes['sap:unit']
            }
        });
    }
    if (attributes['sap:precision']) {
        annotations.push({
            term: MeasuresAnnotationTerms.Scale,
            value: {
                type: 'Int',
                Int: parseInt(attributes['sap:precision'], 10)
            }
        });
    }
    if (attributes['sap:value-list'] === 'fixed-value') {
        annotations.push({
            term: CommonAnnotationTerms.ValueListWithFixedValues,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:display-format'] === 'NonNegative') {
        annotations.push({
            term: CommonAnnotationTerms.IsDigitSequence,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
    if (attributes['sap:display-format'] === 'UpperCase') {
        annotations.push({
            term: CommonAnnotationTerms.IsUpperCase,
            value: {
                type: 'Bool',
                Bool: true
            }
        });
    }
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
    if (attributes['sap:field-control']) {
        annotations.push({
            term: CommonAnnotationTerms.FieldControl,
            value: {
                type: 'Path',
                Path: attributes['sap:field-control']
            }
        });
    }
    if (attributes['sap:applicable-path']) {
        annotations.push({
            term: CoreAnnotationTerms.OperationAvailable,
            value: {
                type: 'Path',
                Path: attributes['sap:applicable-path']
            }
        });
    }
    if (attributes['sap:minoccurs']) {
        annotations.push({
            term: CommonAnnotationTerms.MinOccurs,
            value: {
                type: 'Int',
                Int: parseInt(attributes['sap:minoccurs'], 10)
            }
        });
    }
    if (attributes['sap:maxoccurs']) {
        annotations.push({
            term: CommonAnnotationTerms.MaxOccurs,
            value: {
                type: 'Int',
                Int: parseInt(attributes['sap:maxoccurs'], 10)
            }
        });
    }
    if (attributes['sap:parameter'] === 'mandatory') {
        annotations.push({
            term: CommonAnnotationTerms.FieldControl,
            value: {
                type: 'EnumMember',
                EnumMember: FieldControlType.Mandatory
            }
        });
    }
    if (attributes['sap:parameter'] === 'optional') {
        annotations.push({
            term: CommonAnnotationTerms.FieldControl,
            value: {
                type: 'EnumMember',
                EnumMember: FieldControlType.Optional
            }
        });
    }
    if (attributes['sap:attribute-for']) {
        annotations.push({
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

    return annotations;
}
