// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../utils/edmx.d.ts"/>
import type {
    AnnotationList,
    AnnotationPathExpression,
    AnnotationRecord,
    Apply,
    Expression,
    FullyQualifiedName,
    NavigationPropertyPathExpression,
    PathExpression,
    PropertyPathExpression,
    PropertyValue,
    RawAction,
    RawActionImport,
    RawActionParameter,
    RawAnnotation,
    RawAssociation,
    RawAssociationEnd,
    RawAssociationSet,
    RawAssociationSetEnd,
    RawComplexType,
    RawEntityContainer,
    RawEntitySet,
    RawEntityType,
    RawMetadata,
    RawProperty,
    RawSchema,
    RawSingleton,
    RawTypeDefinition,
    RawV2NavigationProperty,
    RawV4NavigationProperty,
    Reference,
    ReferentialConstraint,
    SimpleIdentifier
} from '@sap-ux/vocabularies-types';
import { xml2js } from 'xml-js';
import { ensureArray, RawMetadataInstance } from './utils';
import type { V2annotationsSupport } from './v2annotationsSupport';
import { convertV2Annotations } from './v2annotationsSupport';

const collectionRegexp = /^Collection\((.+)\)$/;

type PropertyOutput = {
    entityProperties: RawProperty[];
    entityKeys: RawProperty[];
};

// Type guards

/**
 * Check whether the navigation property is a v4 navigation property.
 *
 * @param navPropertyAttributes
 * @returns true if the navigationProperty is a v4 one
 */
function isV4NavProperty(
    navPropertyAttributes: EDMX.NavigationPropertyAttributesV2 | EDMX.NavigationPropertyAttributesV4
): navPropertyAttributes is EDMX.NavigationPropertyAttributesV4 {
    return (
        (navPropertyAttributes as EDMX.NavigationPropertyAttributesV4).Type !== null &&
        (navPropertyAttributes as EDMX.NavigationPropertyAttributesV4).Type !== undefined
    );
}

// Parser Methods
/**
 * Retrieves the name of the keys for that entity type.
 *
 * @param propertyRefs {EDMX.PropertyRef} property reference
 * @returns the entityType keys name
 */
function getEntityTypeKeys(propertyRefs: EDMX.PropertyRef[]): SimpleIdentifier[] {
    return propertyRefs.map((propertyRef) => propertyRef._attributes.Name);
}

/**
 * Parse the EDMX.Property to retrieve the property.
 *
 * @param entityProperties
 * @param entityKeys
 * @param entityTypeFQN
 * @param annotationLists
 * @returns the properties
 */
function parseProperties(
    entityProperties: EDMX.Property[],
    entityKeys: SimpleIdentifier[],
    entityTypeFQN: FullyQualifiedName,
    annotationLists: AnnotationList[]
): PropertyOutput {
    return entityProperties.reduce(
        (outObject: PropertyOutput, entityProperty: EDMX.Property) => {
            const edmProperty: RawProperty = {
                _type: 'Property',
                name: entityProperty._attributes.Name,
                fullyQualifiedName: `${entityTypeFQN}/${entityProperty._attributes.Name}`,
                type: unaliasType(entityProperty._attributes.Type).type
            };
            if (entityProperty._attributes.MaxLength) {
                edmProperty.maxLength = parseInt(entityProperty._attributes.MaxLength, 10);
            }
            if (entityProperty._attributes.Precision) {
                edmProperty.precision = parseInt(entityProperty._attributes.Precision, 10);
            }
            if (entityProperty._attributes.Scale) {
                edmProperty.scale = parseInt(entityProperty._attributes.Scale, 10);
            }
            if (entityProperty._attributes.Nullable) {
                edmProperty.nullable = entityProperty._attributes.Nullable !== 'false';
            }
            if (entityProperty._attributes.DefaultValue) {
                switch (edmProperty.type) {
                    case 'Edm.Int16':
                    case 'Edm.Byte':
                    case 'Edm.Int32':
                    case 'Edm.Int64':
                        edmProperty.defaultValue = parseInt(entityProperty._attributes.DefaultValue, 10);
                        break;
                    case 'Edm.Decimal':
                        edmProperty.defaultValue = parseFloat(entityProperty._attributes.DefaultValue);
                        break;
                    case 'Edm.Boolean':
                        edmProperty.defaultValue = entityProperty._attributes.DefaultValue === 'true';
                        break;
                    default:
                        edmProperty.defaultValue = entityProperty._attributes.DefaultValue;
                        break;
                }
            }

            outObject.entityProperties.push(edmProperty);
            if (entityKeys.indexOf(edmProperty.name) !== -1) {
                outObject.entityKeys.push(edmProperty);
            }

            const v2Annotations = convertV2Annotations(
                entityProperty._attributes as V2annotationsSupport,
                'Property',
                entityProperty._attributes.Name
            );
            if (v2Annotations.length > 0) {
                annotationLists.push(createAnnotationList(edmProperty.fullyQualifiedName, v2Annotations));
            }

            return outObject;
        },
        { entityProperties: [], entityKeys: [] }
    );
}

/**
 * Parse the referential constraint from the EDMX into an object structure.
 *
 * @param referentialConstraints the EDMX referential constraints
 * @param sourceTypeName the name of the source type
 * @param targetTypeName the name of the target type
 * @returns the object representation of the referential constraint.
 */
function parseReferentialConstraint(
    referentialConstraints: EDMX.ReferentialConstraint[],
    sourceTypeName: FullyQualifiedName,
    targetTypeName: FullyQualifiedName
): ReferentialConstraint[] {
    return referentialConstraints.reduce((outArray: ReferentialConstraint[], refCon: EDMX.ReferentialConstraint) => {
        outArray.push({
            sourceTypeName: sourceTypeName,
            sourceProperty: refCon._attributes.Property,
            targetTypeName: targetTypeName,
            targetProperty: refCon._attributes.ReferencedProperty
        });
        return outArray;
    }, []);
}

/**
 * Parse the v2 referential constraint from the EDMX into an object structure.
 *
 * @param referentialConstraints the v2 referential constraint data
 * @param associationEnds the associations of the service to find the involved EntitySets.
 * @returns the object representation of the referential constraint.
 */
function parseV2ReferentialConstraint(
    referentialConstraints: EDMX.V2ReferentialConstraint[],
    associationEnds: RawAssociationEnd[]
) {
    return referentialConstraints.reduce((outArray: ReferentialConstraint[], refCon) => {
        let sourceEnd = associationEnds.find((assEnd) => assEnd.role === refCon.Principal._attributes.Role);
        let targetEnd = associationEnds.find((assEnd) => assEnd.role === refCon.Dependent._attributes.Role);
        if (sourceEnd !== undefined && targetEnd !== undefined) {
            let sourceProperties = ensureArray(refCon.Principal.PropertyRef);
            let targetProperties = ensureArray(refCon.Dependent.PropertyRef);
            if (sourceEnd.multiplicity !== '1') {
                targetEnd = sourceEnd;
                sourceEnd = associationEnds.find(
                    (assEnd) => assEnd.role === refCon.Dependent._attributes.Role
                ) as RawAssociationEnd; // We're reversing them so it will exist for sure
                targetProperties = sourceProperties;
                sourceProperties = ensureArray(refCon.Dependent.PropertyRef);
            }
            for (const sourceProperty of sourceProperties) {
                const propertyIndex = sourceProperties.indexOf(sourceProperty);
                outArray.push({
                    sourceTypeName: sourceEnd.type,
                    sourceProperty: sourceProperty._attributes.Name,
                    targetTypeName: targetEnd.type,
                    targetProperty: targetProperties[propertyIndex]._attributes.Name
                });
            }
        }
        return outArray;
    }, []);
}

/**
 * Parse the EDMX representation of the navigation property in an object structure.
 *
 * @param navigationProperties the navigation property definition
 * @param currentEntityType the current entity type
 * @param entityTypeFQN the name of the current entity type
 * @param annotationLists the list of annotations
 * @returns all the navigation properties from the service
 */
function parseNavigationProperties(
    navigationProperties: EDMX.NavigationProperty[],
    currentEntityType: EDMX.EntityType | EDMX.ComplexType,
    entityTypeFQN: FullyQualifiedName,
    annotationLists: AnnotationList[]
): (RawV2NavigationProperty | RawV4NavigationProperty)[] {
    return navigationProperties.reduce(
        (outArray: (RawV2NavigationProperty | RawV4NavigationProperty)[], navigationProperty) => {
            // V4
            const attributes: EDMX.NavigationPropertyAttributesV4 | EDMX.NavigationPropertyAttributesV2 =
                navigationProperty._attributes;
            if (isV4NavProperty(attributes)) {
                const matches = attributes.Type.match(collectionRegexp);
                const isCollection = matches !== null;
                const typeName = unalias(matches ? matches[1] : attributes.Type);
                outArray.push({
                    _type: 'NavigationProperty',
                    name: attributes.Name,
                    fullyQualifiedName: `${entityTypeFQN}/${attributes.Name}`,
                    partner: attributes.Partner,
                    containsTarget: attributes.ContainsTarget === 'true',
                    isCollection,
                    targetTypeName: typeName,
                    referentialConstraint: parseReferentialConstraint(
                        ensureArray(navigationProperty.ReferentialConstraint),
                        currentEntityType._attributes.Name,
                        typeName
                    )
                });
            } else {
                // V2
                const { Relationship, ToRole, FromRole } = attributes;
                outArray.push({
                    _type: 'NavigationProperty',
                    name: attributes.Name,
                    fullyQualifiedName: `${entityTypeFQN}/${attributes.Name}`,
                    relationship: Relationship,
                    toRole: ToRole,
                    fromRole: FromRole
                });
                const v2Annotations = convertV2Annotations(
                    attributes as V2annotationsSupport,
                    'NavigationProperty',
                    attributes.Name
                );
                if (v2Annotations.length > 0) {
                    annotationLists.push(createAnnotationList(`${entityTypeFQN}/${attributes.Name}`, v2Annotations));
                }
            }

            return outArray;
        },
        []
    );
}

function parseAssociationSets(
    associations: EDMX.AssociationSet[],
    namespace: string,
    entityContainer: EDMX.EntityContainer
): RawAssociationSet[] {
    return associations.map((association) => {
        const associationFQN = `${namespace}.${association._attributes.Name}`;
        const associationEnd: RawAssociationSetEnd[] = ensureArray(association.End).map(
            (endValue: EDMX.AssociationSetEnd) => {
                return {
                    entitySet: `${namespace}.${entityContainer._attributes.Name}/${endValue._attributes.EntitySet}`,
                    role: endValue._attributes.Role
                };
            }
        );
        return {
            fullyQualifiedName: associationFQN,
            name: association._attributes.Name,
            association: association._attributes.Association,
            associationEnd: associationEnd
        };
    });
}

function parseAssociations(associations: EDMX.Association[], namespace: string): RawAssociation[] {
    return associations.map((association) => {
        const associationFQN = `${namespace}.${association._attributes.Name}`;
        const associationEnd: RawAssociationEnd[] = ensureArray(association.End).map(
            (endValue: EDMX.AssociationEnd) => {
                return {
                    type: endValue._attributes.Type,
                    role: endValue._attributes.Role,
                    multiplicity: endValue._attributes.Multiplicity
                };
            }
        );
        return {
            fullyQualifiedName: associationFQN,
            name: association._attributes.Name,
            associationEnd: associationEnd,
            referentialConstraints: parseV2ReferentialConstraint(
                ensureArray(association.ReferentialConstraint),
                associationEnd
            )
        };
    });
}

function parseEntityTypes(
    entityTypes: EDMX.EntityType[],
    annotationLists: AnnotationList[],
    namespace: string
): RawEntityType[] {
    return entityTypes.reduce((outArray: RawEntityType[], entityType) => {
        const entityKeyNames = entityType.Key ? getEntityTypeKeys(ensureArray(entityType.Key.PropertyRef)) : [];
        const entityTypeFQN = `${namespace}.${entityType._attributes.Name}`;
        const { entityProperties, entityKeys } = parseProperties(
            ensureArray(entityType.Property),
            entityKeyNames,
            entityTypeFQN,
            annotationLists
        );
        const navigationProperties = parseNavigationProperties(
            ensureArray(entityType.NavigationProperty),
            entityType,
            entityTypeFQN,
            annotationLists
        );
        const outEntityType: RawEntityType = {
            _type: 'EntityType',
            name: entityType._attributes.Name,
            fullyQualifiedName: entityTypeFQN,
            keys: entityKeys,
            entityProperties,
            actions: {},
            navigationProperties: navigationProperties
        };
        const v2Annotations = convertV2Annotations(
            entityType._attributes as V2annotationsSupport,
            'EntityType',
            entityType._attributes.Name
        );
        if (v2Annotations.length > 0) {
            annotationLists.push(createAnnotationList(outEntityType.fullyQualifiedName, v2Annotations));
        }
        outArray.push(outEntityType);
        return outArray;
    }, []);
}

function parseComplexTypes(
    complexTypes: EDMX.ComplexType[],
    annotationLists: AnnotationList[],
    namespace: string
): RawComplexType[] {
    return complexTypes.reduce((outArray: RawComplexType[], complexType) => {
        const complexTypeFQN = `${namespace}.${complexType._attributes.Name}`;
        const { entityProperties } = parseProperties(
            ensureArray(complexType.Property),
            [],
            complexTypeFQN,
            annotationLists
        );
        const navigationProperties = parseNavigationProperties(
            ensureArray(complexType.NavigationProperty),
            complexType,
            complexTypeFQN,
            annotationLists
        );
        outArray.push({
            _type: 'ComplexType',
            name: complexType._attributes.Name,
            fullyQualifiedName: complexTypeFQN,
            properties: entityProperties,
            navigationProperties
        });
        return outArray;
    }, []);
}

function parseTypeDefinitions(typeDefinitions: EDMX.TypeDefinition[], namespace: string): RawTypeDefinition[] {
    return typeDefinitions.reduce((outArray: RawTypeDefinition[], typeDefinition) => {
        const typeDefinitionFQN = `${namespace}.${typeDefinition._attributes.Name}`;
        outArray.push({
            _type: 'TypeDefinition',
            name: typeDefinition._attributes.Name,
            fullyQualifiedName: typeDefinitionFQN,
            underlyingType: typeDefinition._attributes.UnderlyingType
        });
        return outArray;
    }, []);
}

function parseEntitySets(
    entitySets: EDMX.EntitySet[],
    namespace: string,
    entityContainerName: string,
    annotationLists: AnnotationList[]
): RawEntitySet[] {
    const outEntitySets: RawEntitySet[] = entitySets.map((entitySet) => {
        const navigationPropertyBinding = Object.fromEntries(
            ensureArray(entitySet.NavigationPropertyBinding).map((navPropertyBinding) => {
                return [
                    navPropertyBinding._attributes.Path,
                    `${namespace}.${entityContainerName}/${navPropertyBinding._attributes.Target}`
                ];
            })
        );

        const outEntitySet: RawEntitySet = {
            _type: 'EntitySet',
            name: entitySet._attributes.Name,
            entityTypeName: unalias(entitySet._attributes.EntityType),
            navigationPropertyBinding,
            fullyQualifiedName: `${namespace}.${entityContainerName}/${entitySet._attributes.Name}`
        };
        const v2Annotations = convertV2Annotations(
            entitySet._attributes as V2annotationsSupport,
            'EntitySet',
            entitySet._attributes.Name
        );
        if (v2Annotations.length > 0) {
            annotationLists.push(createAnnotationList(outEntitySet.fullyQualifiedName, v2Annotations));
        }
        return outEntitySet;
    });

    return outEntitySets;
}

function parseSingletons(
    singletons: EDMX.Singleton[],
    namespace: string,
    entityContainerName: string,
    annotationLists: AnnotationList[]
): RawSingleton[] {
    const outSingletons: RawSingleton[] = singletons.map((singleton) => {
        const navigationPropertyBinding = Object.fromEntries(
            ensureArray(singleton.NavigationPropertyBinding).map((navPropertyBinding) => {
                return [
                    navPropertyBinding._attributes.Path,
                    `${namespace}.${entityContainerName}/${navPropertyBinding._attributes.Target}`
                ];
            })
        );

        const outSingleton: RawSingleton = {
            _type: 'Singleton',
            name: singleton._attributes.Name,
            entityTypeName: unalias(singleton._attributes.Type),
            nullable: singleton._attributes.Nullable !== 'false',
            navigationPropertyBinding,
            fullyQualifiedName: `${namespace}.${entityContainerName}/${singleton._attributes.Name}`
        };
        const v2Annotations = convertV2Annotations(
            singleton._attributes as V2annotationsSupport,
            'Singleton',
            singleton._attributes.Name
        );
        if (v2Annotations.length > 0) {
            annotationLists.push(createAnnotationList(outSingleton.fullyQualifiedName, v2Annotations));
        }
        return outSingleton;
    });

    return outSingletons;
}

function parseActions(actions: (EDMX.Action | EDMX.Function)[], namespace: string, isFunction: boolean): RawAction[] {
    return actions.map((action) => {
        const parameters = ensureArray(action.Parameter);
        const isBound = action._attributes.IsBound === 'true';

        const fullyQualifiedName: string = isBound
            ? `${namespace}.${action._attributes.Name}(${unaliasType(parameters[0]._attributes.Type).type})`
            : `${namespace}.${action._attributes.Name}`;

        return {
            _type: 'Action',
            name: action._attributes.Name,
            isBound: isBound,
            sourceType: isBound ? unaliasType(parameters[0]._attributes.Type).type : '',
            fullyQualifiedName: fullyQualifiedName,
            isFunction: isFunction,
            parameters: parameters.map((param) => {
                const { isCollection, type } = unaliasType(param._attributes.Type);

                const edmActionParameter: RawActionParameter = {
                    _type: 'ActionParameter',
                    fullyQualifiedName: `${fullyQualifiedName}/${param._attributes.Name}`,
                    name: `${param._attributes.Name}`,
                    type,
                    isCollection
                };
                if (param._attributes.MaxLength) {
                    edmActionParameter.maxLength = parseInt(param._attributes.MaxLength, 10);
                }
                if (param._attributes.Precision) {
                    edmActionParameter.precision = parseInt(param._attributes.Precision, 10);
                }
                if (param._attributes.Scale) {
                    edmActionParameter.scale = parseInt(param._attributes.Scale, 10);
                }
                if (param._attributes.Nullable) {
                    edmActionParameter.nullable = param._attributes.Nullable !== 'false';
                }
                return edmActionParameter;
            }),
            returnType: action.ReturnType ? unaliasType(action.ReturnType._attributes.Type).type : ''
        };
    });
}

function parseV2FunctionImport(
    actions: EDMX.FunctionImportV2[],
    entitySets: RawEntitySet[],
    namespace: string
): RawAction[] {
    return actions.map((action) => {
        const targetEntitySet = entitySets.find((et) => et.name === action._attributes.EntitySet);
        const actionFQN: string = `${namespace}/${action._attributes.Name}`;
        return {
            _type: 'Action',
            name: action._attributes.Name,
            isBound: false,
            sourceType: targetEntitySet ? targetEntitySet.entityTypeName : '',
            fullyQualifiedName: actionFQN,
            isFunction: false,
            parameters: ensureArray(action.Parameter).map((param) => {
                return {
                    _type: 'ActionParameter',
                    name: param._attributes.Name,
                    fullyQualifiedName: `${actionFQN}/${param._attributes.Name}`,
                    type: param._attributes.Type,
                    isCollection: param._attributes.Type.match(/^Collection\(.+\)$/) !== null
                };
            }),
            returnType: action._attributes.ReturnType ? action._attributes.ReturnType : ''
        };
    });
}

function parseActionImports(
    imports: (EDMX.FunctionImport | EDMX.ActionImport)[],
    namespace: string
): RawActionImport[] {
    return imports.map((actionOrFunctionImport) => {
        const action =
            (actionOrFunctionImport as EDMX.FunctionImport)._attributes.Function ??
            (actionOrFunctionImport as EDMX.ActionImport)._attributes.Action;

        return {
            _type: 'ActionImport',
            name: unalias(actionOrFunctionImport._attributes.Name),
            fullyQualifiedName: `${namespace}/${actionOrFunctionImport._attributes.Name}`,
            actionName: unalias(action)
        };
    });
}

function parsePropertyValues(
    propertyValues: EDMX.PropertyValue[],
    currentTarget: string,
    annotationsLists: AnnotationList[]
): PropertyValue[] {
    return propertyValues.map((propertyValue) => {
        // I don't care about the first part but need the rest and the spread operator
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { Annotation, _attributes, ...properties } = propertyValue;
        const outPropertyValue: Partial<PropertyValue> = {};
        if (_attributes) {
            const attributeKey: keyof EDMX.InlineExpression | undefined = Object.keys(_attributes).find(
                (keyName) => keyName !== 'Property'
            ) as keyof EDMX.InlineExpression | undefined;
            outPropertyValue.name = _attributes.Property;
            const currentPropertyTarget = `${currentTarget}/${outPropertyValue.name}`;
            if (properties && Object.keys(properties).length > 0) {
                outPropertyValue.value = parseExpression(properties, currentPropertyTarget, annotationsLists);
            } else if (attributeKey) {
                outPropertyValue.value = parseInlineExpression(
                    { [attributeKey]: _attributes[attributeKey] },
                    currentPropertyTarget,
                    annotationsLists
                );
            }
            if (propertyValue.Annotation) {
                const propertyAnnotations = parseAnnotations(
                    ensureArray(propertyValue.Annotation),
                    currentPropertyTarget,
                    annotationsLists
                );
                if (propertyAnnotations && propertyAnnotations.length > 0) {
                    annotationsLists.push(createAnnotationList(currentPropertyTarget, propertyAnnotations));
                }
            }
        }
        return outPropertyValue as PropertyValue;
    });
}

function parseRecord(
    record: EDMX.RecordExpression,
    currentTarget: string,
    annotationsLists: AnnotationList[]
): AnnotationRecord {
    const recordAnnotations = parseAnnotations(ensureArray(record.Annotation), currentTarget, annotationsLists);
    const outRecord: AnnotationRecord = {
        type: record._attributes ? unalias(record._attributes.Type) : undefined,
        propertyValues: parsePropertyValues(ensureArray(record.PropertyValue), currentTarget, annotationsLists)
    };
    if (recordAnnotations && recordAnnotations.length > 0) {
        outRecord.annotations = recordAnnotations;
    }
    return outRecord;
}

/**
 * Type Guard for the type of the current collection.
 *
 * @param annotation
 * @param propertyNameToCheck
 * @returns true if the collection if of the right type
 */
function isExpressionOfType<K>(annotation: any, propertyNameToCheck: string): annotation is K {
    return annotation[propertyNameToCheck] != null;
}

function parseModelPath(
    propertyPath: EDMX.ModelPath,
    modelPathType: 'AnnotationPath' | 'PropertyPath' | 'NavigationPropertyPath' | 'Path'
): PropertyPathExpression | NavigationPropertyPathExpression | AnnotationPathExpression | PathExpression {
    switch (modelPathType) {
        case 'NavigationPropertyPath':
            return { type: 'NavigationPropertyPath', NavigationPropertyPath: propertyPath._text };
        case 'PropertyPath':
            return { type: 'PropertyPath', PropertyPath: propertyPath._text };
        case 'AnnotationPath':
            return { type: 'AnnotationPath', AnnotationPath: propertyPath._text };
        case 'Path':
            return { type: 'Path', Path: propertyPath._text };
    }
}

function parseCollection(
    collection: EDMX.CollectionExpression,
    currentTarget: string,
    annotationsLists: AnnotationList[]
):
    | AnnotationRecord[]
    | string[]
    | PropertyPathExpression[]
    | PathExpression[]
    | AnnotationPathExpression[]
    | NavigationPropertyPathExpression[] {
    if (isExpressionOfType<EDMX.RecordCollectionWrapper>(collection, 'Record')) {
        const recordArray = ensureArray(collection.Record).map((record, recordIndex) =>
            parseRecord(record, currentTarget + '/' + recordIndex, annotationsLists)
        );
        (recordArray as any).type = 'Record';
        return recordArray;
    } else if (isExpressionOfType<EDMX.PropertyPathCollectionWrapper>(collection, 'PropertyPath')) {
        const propertyPathArray = ensureArray(collection.PropertyPath).map(
            (propertyPath) => parseModelPath(propertyPath, 'PropertyPath') as PropertyPathExpression
        );
        (propertyPathArray as any).type = 'PropertyPath';
        return propertyPathArray;
    } else if (isExpressionOfType<EDMX.NavigationPropertyPathCollectionWrapper>(collection, 'NavigationPropertyPath')) {
        const navPropertyPathArray = ensureArray(collection.NavigationPropertyPath).map(
            (navPropertyPath) =>
                parseModelPath(navPropertyPath, 'NavigationPropertyPath') as NavigationPropertyPathExpression
        );
        (navPropertyPathArray as any).type = 'NavigationPropertyPath';
        return navPropertyPathArray;
    } else if (isExpressionOfType<EDMX.StringCollectionWrapper>(collection, 'String')) {
        const stringArray = ensureArray(collection.String).map((stringValue) => stringValue._text);
        (stringArray as any).type = 'String';
        return stringArray;
    } else if (isExpressionOfType<EDMX.AnnotationPathCollectionWrapper>(collection, 'AnnotationPath')) {
        const annotationPathArray = ensureArray(collection.AnnotationPath).map(
            (annotationPath) => parseModelPath(annotationPath, 'AnnotationPath') as AnnotationPathExpression
        );
        (annotationPathArray as any).type = 'AnnotationPath';
        return annotationPathArray;
    } else if (isExpressionOfType<EDMX.PathCollectionWrapper>(collection, 'Path')) {
        const pathArray = ensureArray(collection.Path).map(
            (pathDefinition) => parseModelPath(pathDefinition, 'Path') as PathExpression
        );
        (pathArray as any).type = 'Path';
        return pathArray;
    } else if (isExpressionOfType<EDMX.IfCollectionWrapper>(collection, 'If')) {
        const stringArray = ensureArray(collection.If).map((stringValue) => stringValue._text);
        (stringArray as any).type = 'String';
        return stringArray;
    } else if (Object.keys(collection).length === 0) {
        return [];
    } else {
        console.error(`Cannot parse ${JSON.stringify(collection)}, collection type is not supported`);
    }
    return [];
}

function parseApply(applyExpression: EDMX.ApplyExpression): Apply {
    return applyExpression;
}

function parseInlineExpression(
    expression: EDMX.InlineExpression,
    currentTarget: string,
    annotationsLists: AnnotationList[]
): Expression {
    const expressionKeys = Object.keys(expression);
    if (expressionKeys.length > 1) {
        throw new Error(`Too many expressions defined on a single object ${JSON.stringify(expression)}`);
    }
    const expressionKey = expressionKeys[0];
    switch (expressionKey) {
        case 'String':
            return {
                type: 'String',
                String: expression[expressionKey] as string
            };
        case 'Bool':
            return {
                type: 'Bool',
                Bool: expression.Bool === 'true'
            };
        case 'Decimal':
            return {
                type: 'Decimal',
                Decimal: parseFloat(expression.Decimal as string)
            };
        case 'Date':
            return {
                type: 'Date',
                Date: expression.Date as string
            };
        case 'Int':
            return {
                type: 'Int',
                Int: parseInt(expression.Int as string, 10)
            };
        case 'Float':
            return {
                type: 'Float',
                Float: parseFloat(expression.Float as unknown as string)
            };
        case 'Path':
            return {
                type: 'Path',
                Path: expression.Path as string
            };
        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                PropertyPath: expression.PropertyPath as string
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                AnnotationPath: expression.AnnotationPath as string
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                NavigationPropertyPath: expression.NavigationPropertyPath as string
            };
        case 'EnumMember':
            return {
                type: 'EnumMember',
                EnumMember: expression[expressionKey] as string
            };
        case 'Collection':
            return {
                type: 'Collection',
                Collection: parseCollection(
                    expression.Collection as EDMX.CollectionExpression,
                    currentTarget,
                    annotationsLists
                )
            };
        case 'Record':
            return {
                type: 'Record',
                Record: parseRecord(expression.Record as EDMX.RecordExpression, currentTarget, annotationsLists)
            };
        case 'Apply':
            return {
                type: 'Apply',
                Apply: parseApply(expression.Apply)
            };
        case 'Null':
            return {
                type: 'Null'
            };
        default:
            console.error('Unsupported inline expression type ' + expressionKey);
            return {
                type: 'Unknown'
            };
    }
}

function parseExpression(
    expression: EDMX.Expression<{}>,
    currentTarget: string,
    annotationsLists: AnnotationList[]
): Expression {
    const expressionKeys = Object.keys(expression);
    if (expressionKeys.length > 1) {
        throw new Error(`Too many expressions defined on a single object ${JSON.stringify(expression)}`);
    }
    const expressionKey = expressionKeys[0];
    switch (expressionKey) {
        case 'String':
            return {
                type: 'String',
                String: (expression[expressionKey] as any)._text as string
            };
        case 'Bool':
            return {
                type: 'Bool',
                Bool: (expression.Bool as any)._text === 'true'
            };
        case 'Int':
            return {
                type: 'Int',
                Int: parseInt((expression.Int as any)._text as string, 10)
            };
        case 'Decimal':
            return {
                type: 'Decimal',
                Decimal: parseFloat((expression.Decimal as any)._text as string)
            };
        case 'Path':
            return {
                type: 'Path',
                Path: (expression.Path as EDMX.InstancePath)._text
            };
        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                PropertyPath: (expression.PropertyPath as EDMX.ModelPath)._text
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                NavigationPropertyPath: (expression.NavigationPropertyPath as EDMX.ModelPath)._text
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                AnnotationPath: (expression.AnnotationPath as EDMX.ModelPath)._text
            };
        case 'EnumMember':
            return {
                type: 'EnumMember',
                EnumMember: (expression[expressionKey] as any)._text as string
            };
        case 'Collection':
            return {
                type: 'Collection',
                Collection: parseCollection(
                    expression.Collection as EDMX.CollectionExpression,
                    currentTarget,
                    annotationsLists
                )
            };
        case 'Record':
            return {
                type: 'Record',
                Record: parseRecord(expression.Record as EDMX.RecordExpression, currentTarget, annotationsLists)
            };
        case 'Apply':
            return {
                type: 'Apply',
                Apply: parseApply(expression.Apply)
            };
        case 'Null':
            return {
                type: 'Null'
            };
        default:
            console.error('Unsupported expression type ' + expressionKey);
            return {
                type: 'Unknown'
            };
    }
}

function parseAnnotation(
    annotation: EDMX.Annotation,
    currentTarget: string,
    annotationsLists: AnnotationList[]
): RawAnnotation {
    const { Term, Qualifier, ...others } = annotation._attributes;
    const outAnnotation: Partial<RawAnnotation> = {
        term: unalias(Term),
        qualifier: Qualifier
    };
    let currentAnnotationTarget = `${currentTarget}@${unalias(Term)}`;
    if (Qualifier !== '' && Qualifier !== undefined) {
        currentAnnotationTarget += `#${Qualifier}`;
    }
    if (others && Object.keys(others).length > 0) {
        outAnnotation.value = parseInlineExpression(others, currentAnnotationTarget, annotationsLists);
    }
    if (annotation.Annotation) {
        const annotationAnnotations = parseAnnotations(
            ensureArray(annotation.Annotation),
            currentAnnotationTarget,
            annotationsLists
        );
        if (annotationAnnotations && annotationAnnotations.length > 0) {
            outAnnotation.annotations = annotationAnnotations;
        }
    }
    const keys = Object.keys(annotation).filter((keyValue) => keyValue !== '_attributes' && keyValue !== 'Annotation');
    if (isExpressionOfType<EDMX.RecordWrapper>(annotation, 'Record')) {
        outAnnotation.record = parseRecord(annotation.Record, currentAnnotationTarget, annotationsLists);
    } else if (isExpressionOfType<EDMX.CollectionWrapper>(annotation, 'Collection')) {
        outAnnotation.collection = parseCollection(annotation.Collection, currentAnnotationTarget, annotationsLists);
    } else if (keys.length === 1) {
        outAnnotation.value = parseExpression(
            { [keys[0]]: (annotation as any)[keys[0]] },
            currentAnnotationTarget,
            annotationsLists
        );
    } else if (keys.length > 1) {
        console.error(`Cannot parse ${JSON.stringify(annotation)}, expression type is not supported`);
    }

    return outAnnotation as RawAnnotation;
}

function parseAnnotations(
    annotations: EDMX.Annotation[],
    currentTarget: string,
    annotationsLists: AnnotationList[]
): RawAnnotation[] {
    return annotations.map((annotation) => parseAnnotation(annotation, currentTarget, annotationsLists));
}

function createAnnotationList(target: string, annotations: RawAnnotation[]): AnnotationList {
    return {
        target: target,
        annotations: annotations
    };
}

/**
 * @param annotationLists
 * @param annotationsLists
 */
function parseAnnotationLists(annotationLists: EDMX.AnnotationList[], annotationsLists: AnnotationList[]): void {
    annotationLists
        .filter((annotationList) => annotationList._attributes !== undefined)
        .forEach((annotationList) => {
            annotationsLists.push(
                createAnnotationList(
                    unalias(annotationList._attributes.Target),
                    parseAnnotations(
                        ensureArray(annotationList.Annotation),
                        annotationList._attributes.Target,
                        annotationsLists
                    )
                )
            );
        });
}

function parseSchema(edmSchema: EDMX.Schema, edmVersion: string, identification: string): RawSchema {
    const namespace = edmSchema._attributes.Namespace;
    const annotations: AnnotationList[] = [];
    const entityTypes = parseEntityTypes(ensureArray(edmSchema.EntityType), annotations, namespace);
    const complexTypes = parseComplexTypes(ensureArray(edmSchema.ComplexType), annotations, namespace);
    const typeDefinitions = parseTypeDefinitions(ensureArray(edmSchema.TypeDefinition), namespace);
    let entitySets: RawEntitySet[] = [];
    let singletons: RawSingleton[] = [];
    let associationSets: RawAssociationSet[] = [];
    let entityContainer: RawEntityContainer = {
        _type: 'EntityContainer',
        fullyQualifiedName: ''
    };
    let actions: RawAction[] = [];
    let actionImports: RawActionImport[] = [];

    if (edmSchema.EntityContainer) {
        entitySets = parseEntitySets(
            ensureArray(edmSchema.EntityContainer.EntitySet),
            namespace,
            edmSchema.EntityContainer._attributes.Name,
            annotations
        );
        singletons = parseSingletons(
            ensureArray(edmSchema.EntityContainer.Singleton),
            namespace,
            edmSchema.EntityContainer._attributes.Name,
            annotations
        );

        associationSets = parseAssociationSets(
            ensureArray(edmSchema.EntityContainer.AssociationSet),
            namespace,
            edmSchema.EntityContainer
        );
        entityContainer = {
            _type: 'EntityContainer',
            name: edmSchema.EntityContainer._attributes.Name,
            fullyQualifiedName: `${namespace}.${edmSchema.EntityContainer._attributes.Name}`
        };

        if (edmVersion === '1.0') {
            actions = actions.concat(
                parseV2FunctionImport(
                    ensureArray(edmSchema.EntityContainer.FunctionImport) as EDMX.FunctionImportV2[],
                    entitySets,
                    entityContainer.fullyQualifiedName
                )
            );
        } else if (edmVersion === '4.0') {
            // FunctionImports
            actionImports = actionImports.concat(
                parseActionImports(
                    ensureArray(edmSchema.EntityContainer.FunctionImport) as EDMX.FunctionImport[],
                    entityContainer.fullyQualifiedName
                )
            );

            // ActionImports
            actionImports = actionImports.concat(
                parseActionImports(
                    ensureArray(edmSchema.EntityContainer.ActionImport),
                    entityContainer.fullyQualifiedName
                )
            );
        } else {
            throw new Error(`Unsupported EDMX version: ${edmVersion}`);
        }
    }
    if (edmVersion === '4.0') {
        actions = actions.concat(parseActions(ensureArray(edmSchema.Action), namespace, false));
        actions = actions.concat(parseActions(ensureArray(edmSchema.Function), namespace, true));
    }
    const associations = parseAssociations(ensureArray(edmSchema.Association), namespace);

    parseAnnotationLists(ensureArray(edmSchema.Annotations), annotations);
    const annotationMap: { [id: string]: AnnotationList[] } = {};
    annotationMap[identification] = annotations;
    return {
        associations,
        associationSets,
        annotations: annotationMap,
        entityContainer,
        namespace: namespace,
        entitySets,
        singletons,
        complexTypes,
        typeDefinitions,
        actions,
        actionImports,
        entityTypes
    };
}

function parseReferences(references: EDMX.Reference[]): Reference[] {
    return references.reduce((referencesArray: Reference[], reference: EDMX.Reference) => {
        const includes = ensureArray(reference['edmx:Include']);
        includes.forEach((include: EDMX.ReferenceInclude) => {
            referencesArray.push({
                uri: reference._attributes.Uri,
                alias: include._attributes.Alias,
                namespace: include._attributes.Namespace
            });
        });
        return referencesArray;
    }, []);
}

let aliases: Record<string, string> = {};

function unaliasType(type: string) {
    const collection = type.match(collectionRegexp);
    const _type = collection ? collection[1] : type;
    const unaliasedType = unalias(_type);
    return {
        type: collection ? `Collection(${unaliasedType})` : unaliasedType,
        isCollection: collection !== null
    };
}

function unalias(aliasedValue: string): string;
function unalias(aliasedValue: undefined): undefined;
function unalias(aliasedValue: string | undefined): string | undefined {
    if (!aliasedValue) {
        return aliasedValue;
    }

    const separators = ['@', '/', '('];
    const unaliased: string[] = [];
    let start = 0;
    for (let end = 0, maybeAlias = true; end < aliasedValue.length; end++) {
        const char = aliasedValue[end];
        if (maybeAlias && char === '.') {
            const alias = aliasedValue.substring(start, end);
            unaliased.push(aliases[alias] ?? alias);
            start = end;
            maybeAlias = false;
        }
        if (separators.includes(char)) {
            unaliased.push(aliasedValue.substring(start, end + 1));
            start = end + 1;
            maybeAlias = true;
        }
    }
    unaliased.push(aliasedValue.substring(start));

    return unaliased.join('');
}

function mergeSchemas(schemas: RawSchema[]): RawSchema {
    const associations = schemas.reduce((associationsToReduce: RawAssociation[], schema) => {
        return associationsToReduce.concat(schema.associations);
    }, []);
    const associationSets = schemas.reduce((associationSetsToReduce: RawAssociationSet[], schema) => {
        return associationSetsToReduce.concat(schema.associationSets);
    }, []);
    const entitySets = schemas.reduce((entitySetsToReduce: RawEntitySet[], schema) => {
        return entitySetsToReduce.concat(schema.entitySets);
    }, []);
    const singletons = schemas.reduce((singletonsToReduce: RawSingleton[], schema) => {
        return singletonsToReduce.concat(schema.singletons);
    }, []);
    const entityTypes = schemas.reduce((entityTypesToReduce: RawEntityType[], schema) => {
        return entityTypesToReduce.concat(schema.entityTypes);
    }, []);
    const actions = schemas.reduce((actionsToReduce: RawAction[], schema) => {
        return actionsToReduce.concat(schema.actions);
    }, []);
    const actionImports = schemas.reduce((actionImportsToReduce: RawActionImport[], schema) => {
        return actionImportsToReduce.concat(schema.actionImports);
    }, []);
    const complexTypes = schemas.reduce((complexTypesToReduces: RawComplexType[], schema) => {
        return complexTypesToReduces.concat(schema.complexTypes);
    }, []);
    const typeDefinitions = schemas.reduce((typeDefinitionsToReduce: RawTypeDefinition[], schema) => {
        return typeDefinitionsToReduce.concat(schema.typeDefinitions);
    }, []);
    let annotationMap = {};
    schemas.forEach((schema) => {
        annotationMap = Object.assign(annotationMap, schema.annotations);
    });
    let entityContainer!: RawEntityContainer;
    let namespace!: string;
    schemas.forEach((schema) => {
        if (schema.entityContainer && Object.keys(schema.entityContainer).length > 0) {
            entityContainer = schema.entityContainer;
            namespace = schema.namespace;
        }
    });

    // V2 case
    entitySets.forEach((entitySet) => {
        const entityType = entityTypes.find(
            (rawEntityType) => rawEntityType.fullyQualifiedName === entitySet.entityTypeName
        );
        entityType?.navigationProperties.forEach((navProp) => {
            const v2NavProp: RawV2NavigationProperty = navProp as RawV2NavigationProperty;
            const associationSet = associationSets.find((assoc) => assoc.association === v2NavProp.relationship);
            if (associationSet) {
                const targetEntitySet = associationSet.associationEnd.find(
                    (associationEnd) => associationEnd.entitySet !== entitySet.fullyQualifiedName
                );

                if (targetEntitySet) {
                    entitySet.navigationPropertyBinding[navProp.name] = targetEntitySet.entitySet;
                }
            }
        });
    });
    entityTypes.forEach((entityType) => {
        entityType.navigationProperties.forEach((navProp: any) => {
            const v2NavProp: RawV2NavigationProperty = navProp as RawV2NavigationProperty;
            const association = associations.find((assoc) => assoc.fullyQualifiedName === v2NavProp.relationship);
            if (association && association.referentialConstraints && association.referentialConstraints.length > 0) {
                if (association.referentialConstraints[0].sourceTypeName === entityType.fullyQualifiedName) {
                    v2NavProp.referentialConstraint = association.referentialConstraints;
                } else {
                    v2NavProp.referentialConstraint = association.referentialConstraints.map((refConstraint) => {
                        return {
                            sourceTypeName: refConstraint.targetTypeName,
                            sourceProperty: refConstraint.targetProperty,
                            targetTypeName: refConstraint.sourceTypeName,
                            targetProperty: refConstraint.sourceProperty
                        };
                    });
                }
            }
        });
    });
    return {
        associations,
        associationSets,
        annotations: annotationMap,
        entityContainer,
        namespace: namespace,
        entitySets,
        singletons,
        complexTypes,
        typeDefinitions,
        actions,
        actionImports,
        entityTypes
    };
}

function createAliasMap(references: Reference[], schemas: EDMX.Schema[]) {
    aliases = references.reduce((map, reference) => {
        map[reference.alias] = reference.namespace;
        return map;
    }, {} as Record<string, string>);

    schemas
        .filter((schema) => schema._attributes.Alias)
        .forEach((schema) => {
            aliases[schema._attributes.Alias] = schema._attributes.Namespace;
        });
}

/**
 * Parse an edmx file and return an object structure representing the service definition.
 *
 * @param xml {string} the original XML string
 * @param fileIdentification {string} a way to identify this file
 * @returns the parsed metadata definition
 */
export function parse(xml: string, fileIdentification: string = 'serviceFile'): RawMetadata {
    const jsonObj: EDMX.Edmx = xml2js(xml, { compact: true }) as EDMX.Edmx;

    const version = jsonObj['edmx:Edmx']._attributes.Version;
    const schemas: EDMX.Schema[] = ensureArray(jsonObj['edmx:Edmx']['edmx:DataServices'].Schema);
    const references = parseReferences(ensureArray(jsonObj['edmx:Edmx']['edmx:Reference']));

    createAliasMap(references, schemas);

    const parsedSchemas = schemas.map((schema) => {
        return parseSchema(schema, version, fileIdentification);
    });
    const edmxDocument: RawMetadata = new RawMetadataInstance(
        fileIdentification,
        version,
        mergeSchemas(parsedSchemas),
        references
    );

    return edmxDocument;
}
