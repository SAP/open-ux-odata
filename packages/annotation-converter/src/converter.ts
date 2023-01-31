import type {
    Action,
    ActionImport,
    ActionParameter,
    Annotation,
    AnnotationList,
    AnnotationRecord,
    BaseNavigationProperty,
    ComplexType,
    ConvertedMetadata,
    EntityContainer,
    EntitySet,
    EntityType,
    Expression,
    FullyQualifiedName,
    NavigationProperty,
    Property,
    PropertyPath,
    RawAction,
    RawActionImport,
    RawAnnotation,
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
    RemoveAnnotationAndType,
    ResolutionTarget,
    Singleton,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import type { ArrayWithIndex, ReferencesWithMap } from './utils';
import {
    addIndex,
    alias,
    Decimal,
    defaultReferences,
    EnumIsFlag,
    lazy,
    splitAtFirst,
    splitAtLast,
    substringBeforeFirst,
    substringBeforeLast,
    TermToTypes,
    unalias
} from './utils';

/**
 * Symbol to extend an annotation with the reference to its target.
 */
const ANNOTATION_TARGET = Symbol('Annotation Target');

/**
 * Symbol to extend a metadata object by an index.
 */
const INDEX_BY_NAME = Symbol('by name');

/**
 * Append an object to the list of visited objects if it is different from the last object in the list.
 *
 * @param visitedObjects    The list of visited objects
 * @param visitedObject     The object
 * @returns The list of visited objects
 */
function appendVisitedObjects(visitedObjects: any[], visitedObject: any): any[] {
    if (visitedObjects[visitedObjects.length - 1] !== visitedObject) {
        visitedObjects.push(visitedObject);
    }
    return visitedObjects;
}

// TODO: Reuse type ResolutionTarget<T>
type PathResolutionResult = {
    /** The resolved target element the path points to */
    target: any;
    /** The elements that were visited along the way */
    visitedObjects: any[];
    /** Messages */
    messages: { message: string }[];
};

/**
 * Resolves a (possibly relative) path.
 *
 * @param converter         Converter
 * @param startElement      The starting point in case of relative path resolution
 * @param path              The path to resolve
 * @param annotationsTerm   Only for error reporting: The annotation term
 * @returns An object containing the resolved target and the elements that were visited while getting to the target.
 */
function resolveTarget(
    converter: Converter,
    startElement: any,
    path: string,
    annotationsTerm?: string
): PathResolutionResult {
    const pathSegments = path.split('/').reduce((targetPath, segment) => {
        if (segment.includes('@')) {
            // Separate out the annotation
            const [pathPart, annotationPart] = splitAtFirst(segment, '@');
            targetPath.push(pathPart);
            targetPath.push(`@${annotationPart}`);
        } else {
            targetPath.push(segment);
        }
        return targetPath;
    }, [] as string[]);

    // determine the starting point for the resolution
    if (startElement === undefined) {
        // no starting point given: start at the entity container
        startElement = converter.getConvertedElement(
            converter.rawSchema.entityContainer.fullyQualifiedName,
            (schema) => schema.entityContainer,
            convertEntityContainer
        );
    } else if (startElement[ANNOTATION_TARGET] !== undefined) {
        // annotation: start at the annotation target
        startElement = startElement[ANNOTATION_TARGET];
    } else if (startElement._type === 'Property') {
        // property: start at the entity type the property belongs to
        const entityTypeFQN = substringBeforeFirst(startElement.fullyQualifiedName, '/');
        startElement = converter.getConvertedElement(
            entityTypeFQN,
            (rawSchema) =>
                rawSchema.entityTypes.find((entry: RawEntityType) => entry.fullyQualifiedName === entityTypeFQN),
            convertEntityType
        );
    }

    const result = pathSegments.reduce(
        (current: PathResolutionResult, segment: string) => {
            const error = (message: string) => {
                current.messages.push({ message });
                current.visitedObjects = appendVisitedObjects(current.visitedObjects, undefined);
                current.target = undefined;
                return current;
            };

            if (current.target === undefined) {
                return current;
            }

            current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.target);

            // Annotation
            if (segment.startsWith('@') && segment !== '@$ui5.overload') {
                const [vocabularyAlias, term] = converter.splitTerm(segment);
                const annotation = current.target.annotations[vocabularyAlias.substring(1)]?.[term];

                if (annotation !== undefined) {
                    current.target = annotation;
                    return current;
                }
                return error(
                    `Annotation '${segment.substring(1)}' not found on ${current.target._type} '${
                        current.target.fullyQualifiedName
                    }'`
                );
            }

            switch (current.target?._type) {
                case 'EntityContainer':
                    {
                        const thisElement = current.target as EntityContainer;

                        if (segment === '' || segment === thisElement.fullyQualifiedName) {
                            return current;
                        }

                        // next segment = EntitySet?
                        const entitySet = (thisElement.entitySets as ArrayWithIndex<EntitySet>)[INDEX_BY_NAME].get(
                            segment
                        );
                        if (entitySet) {
                            current.target = entitySet;
                            return current;
                        }

                        // next segment = Singleton?
                        const singleton = (thisElement.singletons as ArrayWithIndex<Singleton>)[INDEX_BY_NAME].get(
                            segment
                        );
                        if (singleton) {
                            current.target = singleton;
                            return current;
                        }

                        // next segment = ActionImport?
                        const actionImport = (thisElement.actionImports as ArrayWithIndex<ActionImport>)[
                            INDEX_BY_NAME
                        ].get(segment);
                        if (actionImport) {
                            current.visitedObjects = appendVisitedObjects(current.visitedObjects, actionImport);

                            const action = actionImport.action;
                            if (action) {
                                current.target = action;
                                return current;
                            }

                            return error(
                                `Action import '${actionImport.fullyQualifiedName}': Action '${actionImport.actionName}' not found`
                            );
                        }
                    }
                    break;

                case 'EntitySet':
                case 'Singleton': {
                    const thisElement = current.target as EntitySet | Singleton;

                    if (segment === '' || segment === '$Type') {
                        // Empty Path after an EntitySet or Singleton means EntityType
                        current.target = thisElement.entityType;
                        return current;
                    }

                    if (segment === '$') {
                        return current;
                    }

                    if (segment === '$NavigationPropertyBinding') {
                        const navigationPropertyBindings = thisElement.navigationPropertyBinding;
                        current.target = navigationPropertyBindings;
                        return current;
                    }

                    // continue resolving at the EntitySet's or Singleton's type
                    const result = resolveTarget(converter, thisElement.entityType, segment);
                    current.target = result.target;
                    current.visitedObjects = result.visitedObjects.reduce(appendVisitedObjects, current.visitedObjects);
                    return current;
                }

                case 'EntityType':
                    {
                        const thisElement = current.target as EntityType;

                        if (segment === '') {
                            return current;
                        }

                        const property = (thisElement.entityProperties as ArrayWithIndex<Property>)[INDEX_BY_NAME].get(
                            segment
                        );
                        if (property) {
                            current.target = property;
                            return current;
                        }

                        const navigationProperty = (
                            thisElement.navigationProperties as ArrayWithIndex<NavigationProperty>
                        )[INDEX_BY_NAME].get(segment);
                        if (navigationProperty) {
                            current.target = navigationProperty;
                            return current;
                        }

                        const action = thisElement.actions[segment];
                        if (action) {
                            current.target = action;
                            return current;
                        }
                    }
                    break;

                case 'Action': {
                    const thisElement = current.target as Action;

                    if (segment === '') {
                        return current;
                    }

                    if (segment === '@$ui5.overload' || segment === '0') {
                        return current;
                    }

                    if (segment === '$Parameter' && thisElement.isBound) {
                        current.target = thisElement.parameters;
                        return current;
                    }

                    current.target =
                        thisElement.parameters[segment as any] ??
                        thisElement.parameters.find((param: ActionParameter) => param.name === segment);

                    return current;
                }

                case 'Property':
                    {
                        const thisElement = current.target as Property;

                        // Property or NavigationProperty of the ComplexType
                        const type = thisElement.targetType as ComplexType | undefined;
                        if (type !== undefined) {
                            const property = (type.properties as ArrayWithIndex<Property>)[INDEX_BY_NAME].get(segment);
                            if (property) {
                                current.target = property;
                                return current;
                            }

                            const navigationProperty = (
                                type.navigationProperties as ArrayWithIndex<NavigationProperty>
                            )[INDEX_BY_NAME].get(segment);
                            if (navigationProperty) {
                                current.target = navigationProperty;
                                return current;
                            }
                        }
                    }
                    break;

                case 'ActionParameter':
                    const referencedType = (current.target as ActionParameter).typeReference;
                    if (referencedType !== undefined) {
                        current.target = referencedType;
                        return current;
                    }
                    break;

                case 'NavigationProperty':
                    // continue at the NavigationProperty's target type
                    const result = resolveTarget(converter, (current.target as NavigationProperty).targetType, segment);
                    current.target = result.target;
                    current.visitedObjects = result.visitedObjects.reduce(appendVisitedObjects, current.visitedObjects);
                    return current;

                default: {
                    if (segment === '$AnnotationPath' && current.target.$target) {
                        const subTarget = resolveTarget(
                            converter,
                            current.target[ANNOTATION_TARGET],
                            current.target.value
                        );
                        subTarget.visitedObjects.forEach((visitedSubObject: any) => {
                            if (!current.visitedObjects.includes(visitedSubObject)) {
                                current.visitedObjects = appendVisitedObjects(current.visitedObjects, visitedSubObject);
                            }
                        });

                        current.target = subTarget.target;
                        current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.target);
                        return current;
                    }

                    current.target = current.target[segment];
                    current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.target);
                }
            }

            return current;
        },
        { visitedObjects: [], target: startElement, messages: [] }
    );

    // Diagnostics
    result.messages.forEach((message) => converter.logError(message.message));
    if (!result.target) {
        if (annotationsTerm) {
            const annotationType = inferTypeFromTerm(converter, annotationsTerm, startElement.fullyQualifiedName);
            converter.logError(
                'Unable to resolve the path expression: ' +
                    '\n' +
                    path +
                    '\n' +
                    '\n' +
                    'Hint: Check and correct the path values under the following structure in the metadata (annotation.xml file or CDS annotations for the application): \n\n' +
                    '<Annotation Term = ' +
                    annotationsTerm +
                    '>' +
                    '\n' +
                    '<Record Type = ' +
                    annotationType +
                    '>' +
                    '\n' +
                    '<AnnotationPath = ' +
                    path +
                    '>'
            );
        } else {
            converter.logError(
                'Unable to resolve the path expression: ' +
                    path +
                    '\n' +
                    '\n' +
                    'Hint: Check and correct the path values under the following structure in the metadata (annotation.xml file or CDS annotations for the application): \n\n' +
                    '<Annotation Term = ' +
                    pathSegments[0] +
                    '>' +
                    '\n' +
                    '<PropertyValue  Path= ' +
                    pathSegments[1] +
                    '>'
            );
        }
    }

    return result;
}

/**
 * Typeguard to check if the path contains an annotation.
 *
 * @param pathStr the path to evaluate
 * @returns true if there is an annotation in the path.
 */
function isAnnotationPath(pathStr: string): boolean {
    return pathStr.includes('@');
}

function parseValue(
    converter: Converter,
    currentTarget: any,
    currentTerm: string,
    currentProperty: string,
    currentSource: string,
    propertyValue: Expression,
    valueFQN: string
) {
    if (propertyValue === undefined) {
        return undefined;
    }
    switch (propertyValue.type) {
        case 'String':
            return propertyValue.String;
        case 'Int':
            return propertyValue.Int;
        case 'Bool':
            return propertyValue.Bool;
        case 'Decimal':
            return Decimal(propertyValue.Decimal);
        case 'Date':
            return propertyValue.Date;
        case 'EnumMember':
            const aliasedEnum = converter.alias(propertyValue.EnumMember);
            const splitEnum = aliasedEnum.split(' ');
            if (splitEnum[0] && EnumIsFlag[substringBeforeFirst(splitEnum[0], '/')]) {
                return splitEnum;
            }
            return aliasedEnum;

        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                value: propertyValue.PropertyPath,
                fullyQualifiedName: valueFQN,
                $target: resolveTarget(converter, currentTarget, propertyValue.PropertyPath, currentTerm).target,
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                value: propertyValue.NavigationPropertyPath,
                fullyQualifiedName: valueFQN,
                $target: resolveTarget(converter, currentTarget, propertyValue.NavigationPropertyPath, currentTerm)
                    .target,
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                value: propertyValue.AnnotationPath,
                fullyQualifiedName: valueFQN,
                $target: resolveTarget(
                    converter,
                    currentTarget,
                    converter.unalias(propertyValue.AnnotationPath),
                    currentTerm
                ).target,
                annotationsTerm: currentTerm,
                term: '',
                path: '',
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'Path':
            const $target = resolveTarget(converter, currentTarget, propertyValue.Path, currentTerm).target;
            if (isAnnotationPath(propertyValue.Path)) {
                // inline the target
                return $target;
            } else {
                return {
                    type: 'Path',
                    path: propertyValue.Path,
                    fullyQualifiedName: valueFQN,
                    $target: $target,
                    [ANNOTATION_TARGET]: currentTarget
                };
            }

        case 'Record':
            return parseRecord(
                converter,
                currentTerm,
                currentTarget,
                currentProperty,
                currentSource,
                propertyValue.Record,
                valueFQN
            );
        case 'Collection':
            return parseCollection(
                converter,
                currentTarget,
                currentTerm,
                currentProperty,
                currentSource,
                propertyValue.Collection,
                valueFQN
            );
        case 'Apply':
        case 'Null':
        case 'Not':
        case 'Eq':
        case 'Ne':
        case 'Gt':
        case 'Ge':
        case 'Lt':
        case 'Le':
        case 'If':
        case 'And':
        case 'Or':
        default:
            return propertyValue;
    }
}

/**
 * Infer the type of a term based on its type.
 *
 * @param converter         Converter
 * @param annotationsTerm   The annotation term
 * @param annotationTarget  The annotation target
 * @param currentProperty   The current property of the record
 * @returns The inferred type.
 */
function inferTypeFromTerm(
    converter: Converter,
    annotationsTerm: string,
    annotationTarget: string,
    currentProperty?: string
) {
    let targetType = (TermToTypes as any)[annotationsTerm];
    if (currentProperty) {
        annotationsTerm = `${substringBeforeLast(annotationsTerm, '.')}.${currentProperty}`;
        targetType = (TermToTypes as any)[annotationsTerm];
    }

    converter.logError(
        `The type of the record used within the term ${annotationsTerm} was not defined and was inferred as ${targetType}.
Hint: If possible, try to maintain the Type property for each Record.
<Annotations Target="${annotationTarget}">
	<Annotation Term="${annotationsTerm}">
		<Record>...</Record>
	</Annotation>
</Annotations>`
    );

    return targetType;
}

function isDataFieldWithForAction(annotationContent: any, annotationTerm: any) {
    return (
        annotationContent.hasOwnProperty('Action') &&
        (annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction' ||
            annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldWithAction')
    );
}

function parseRecordType(
    converter: Converter,
    currentTerm: string,
    currentTarget: any,
    currentProperty: string | undefined,
    recordDefinition: AnnotationRecord
) {
    let targetType;
    if (!recordDefinition.type && currentTerm) {
        targetType = inferTypeFromTerm(converter, currentTerm, currentTarget.fullyQualifiedName, currentProperty);
    } else {
        targetType = converter.unalias(recordDefinition.type);
    }
    return targetType;
}

function parseRecord(
    converter: Converter,
    currentTerm: string,
    currentTarget: any,
    currentProperty: string | undefined,
    currentSource: string,
    annotationRecord: AnnotationRecord,
    currentFQN: string
) {
    const annotationTerm: any = {
        $Type: parseRecordType(converter, currentTerm, currentTarget, currentProperty, annotationRecord),
        fullyQualifiedName: currentFQN,
        [ANNOTATION_TARGET]: currentTarget
    };

    // annotations on the record
    lazy(annotationTerm, 'annotations', () => {
        annotationRecord.annotations?.forEach((annotation: any) => {
            annotation.target = currentFQN;
            annotation.__source = currentSource;
            annotation[ANNOTATION_TARGET] = currentTarget;
            annotation.fullyQualifiedName = `${currentFQN}@${annotation.term}`;
        });

        return createAnnotationsObject(converter, annotationTerm, annotationRecord.annotations ?? []);
    });

    const annotationContent = annotationRecord.propertyValues?.reduce((annotationContent, propertyValue) => {
        lazy(annotationContent, propertyValue.name, () =>
            parseValue(
                converter,
                currentTarget,
                currentTerm,
                propertyValue.name,
                currentSource,
                propertyValue.value,
                `${currentFQN}/${propertyValue.name}`
            )
        );

        return annotationContent;
    }, annotationTerm);

    if (isDataFieldWithForAction(annotationContent, annotationTerm)) {
        lazy(annotationContent, 'ActionTarget', () => {
            // try to resolve to a bound action of the annotation target
            let actionTarget = currentTarget.actions?.[annotationContent.Action];

            if (!actionTarget) {
                // try to find a corresponding unbound action
                const [, actionImportName] = splitAtLast(annotationContent.Action, '/');

                const rawActionImport = converter.rawSchema.actionImports.find(
                    (actionImport: RawActionImport) => actionImport.name === actionImportName
                );
                if (rawActionImport) {
                    actionTarget = converter.getConvertedElement(
                        rawActionImport.fullyQualifiedName,
                        rawActionImport,
                        convertActionImport
                    )?.action;
                }
            }

            if (!actionTarget) {
                const action = converter.rawSchema.actions.find(
                    (entry: RawAction) =>
                        entry.fullyQualifiedName === annotationContent.Action && entry.isBound === true
                );
                if (action) {
                    actionTarget = converter.getConvertedElement(action.fullyQualifiedName, action, convertAction);
                }
            }

            if (!actionTarget) {
                converter.logError(
                    `Unable to resolve the action '${annotationContent.Action}' defined for '${annotationTerm.fullyQualifiedName}'`
                );
            }
            return actionTarget;
        });
    }
    return annotationContent;
}

export type CollectionType =
    | 'PropertyPath'
    | 'Path'
    | 'If'
    | 'Apply'
    | 'Null'
    | 'And'
    | 'Eq'
    | 'Ne'
    | 'Not'
    | 'Gt'
    | 'Ge'
    | 'Lt'
    | 'Le'
    | 'Or'
    | 'AnnotationPath'
    | 'NavigationPropertyPath'
    | 'Record'
    | 'String'
    | 'EmptyCollection';

/**
 * Retrieve or infer the collection type based on its content.
 *
 * @param collectionDefinition
 * @returns the type of the collection
 */
function getOrInferCollectionType(collectionDefinition: any[]): CollectionType {
    let type: CollectionType = (collectionDefinition as any).type;
    if (type === undefined && collectionDefinition.length > 0) {
        const firstColItem = collectionDefinition[0];
        if (firstColItem.hasOwnProperty('PropertyPath')) {
            type = 'PropertyPath';
        } else if (firstColItem.hasOwnProperty('Path')) {
            type = 'Path';
        } else if (firstColItem.hasOwnProperty('AnnotationPath')) {
            type = 'AnnotationPath';
        } else if (firstColItem.hasOwnProperty('NavigationPropertyPath')) {
            type = 'NavigationPropertyPath';
        } else if (
            typeof firstColItem === 'object' &&
            (firstColItem.hasOwnProperty('type') || firstColItem.hasOwnProperty('propertyValues'))
        ) {
            type = 'Record';
        } else if (typeof firstColItem === 'string') {
            type = 'String';
        }
    } else if (type === undefined) {
        type = 'EmptyCollection';
    }
    return type;
}

function parseCollection(
    converter: Converter,
    currentTarget: any,
    currentTerm: string,
    currentProperty: string,
    currentSource: string,
    collectionDefinition: any[],
    parentFQN: string
) {
    const collectionDefinitionType = getOrInferCollectionType(collectionDefinition);

    switch (collectionDefinitionType) {
        case 'PropertyPath':
            return collectionDefinition.map((propertyPath, propertyIdx): PropertyPath => {
                const result: PropertyPath = {
                    type: 'PropertyPath',
                    value: propertyPath.PropertyPath,
                    fullyQualifiedName: `${parentFQN}/${propertyIdx}`
                } as any;

                lazy(
                    result,
                    '$target',
                    () => resolveTarget(converter, currentTarget, propertyPath.PropertyPath, currentTerm).target
                );

                return result;
            });

        case 'Path':
            // TODO: make lazy?
            return collectionDefinition.map((pathValue) => {
                return resolveTarget(converter, currentTarget, pathValue.Path, currentTerm).target;
            });

        case 'AnnotationPath':
            return collectionDefinition.map((annotationPath, annotationIdx) => {
                const result = {
                    type: 'AnnotationPath',
                    value: annotationPath.AnnotationPath,
                    fullyQualifiedName: `${parentFQN}/${annotationIdx}`,
                    annotationsTerm: currentTerm,
                    term: '',
                    path: ''
                } as any;

                lazy(
                    result,
                    '$target',
                    () => resolveTarget(converter, currentTarget, annotationPath.AnnotationPath, currentTerm).target
                );

                return result;
            });

        case 'NavigationPropertyPath':
            return collectionDefinition.map((navPropertyPath, navPropIdx) => {
                const result = {
                    type: 'NavigationPropertyPath',
                    value: navPropertyPath.NavigationPropertyPath,
                    fullyQualifiedName: `${parentFQN}/${navPropIdx}`
                } as any;

                lazy(
                    result,
                    '$target',
                    () =>
                        resolveTarget(converter, currentTarget, navPropertyPath.NavigationPropertyPath, currentTerm)
                            .target
                );

                return result;
            });

        case 'Record':
            return collectionDefinition.map((recordDefinition, recordIdx) => {
                return parseRecord(
                    converter,
                    currentTerm,
                    currentTarget,
                    currentProperty,
                    currentSource,
                    recordDefinition,
                    `${parentFQN}/${recordIdx}`
                );
            });

        case 'Apply':
        case 'Null':
        case 'If':
        case 'Eq':
        case 'Ne':
        case 'Lt':
        case 'Gt':
        case 'Le':
        case 'Ge':
        case 'Not':
        case 'And':
        case 'Or':
            return collectionDefinition.map((ifValue) => ifValue);

        case 'String':
            return collectionDefinition.map((stringValue) => {
                if (typeof stringValue === 'string' || stringValue === undefined) {
                    return stringValue;
                } else {
                    return stringValue.String;
                }
            });

        default:
            if (collectionDefinition.length === 0) {
                return [];
            }
            throw new Error('Unsupported case');
    }
}

function isV4NavigationProperty(
    navProp: RawV2NavigationProperty | RawV4NavigationProperty
): navProp is RawV4NavigationProperty {
    return !!(navProp as BaseNavigationProperty).targetTypeName;
}

/**
 * Split the alias from the term value.
 *
 * @param references the current set of references
 * @param termValue the value of the term
 * @returns the term alias and the actual term value
 */
function splitTerm(references: ReferencesWithMap, termValue: string) {
    return splitAtLast(alias(references, termValue), '.');
}

/**
 * Creates the function that will resolve a specific path.
 *
 * @param converter
 * @returns the function that will allow to resolve element globally.
 */
function createGlobalResolve(converter: Converter) {
    return function resolvePath<T>(path: string): ResolutionTarget<T> {
        let targetPath = path;
        if (!path.startsWith('/')) {
            targetPath = `/${path}`;
        }

        const targetResolution = resolveTarget(converter, undefined, targetPath);
        if (targetResolution.target) {
            appendVisitedObjects(targetResolution.visitedObjects, targetResolution.target);
        }
        return {
            target: targetResolution.target,
            objectPath: targetResolution.visitedObjects
        };
    };
}

function convertAnnotation(converter: Converter, target: any, rawAnnotation: RawAnnotation): Annotation {
    let annotation: any;
    if (rawAnnotation.record) {
        annotation = parseRecord(
            converter,
            rawAnnotation.term,
            target,
            '',
            (rawAnnotation as any).__source,
            rawAnnotation.record,
            (rawAnnotation as any).fullyQualifiedName
        );
    } else if (rawAnnotation.collection === undefined) {
        annotation = parseValue(
            converter,
            target,
            rawAnnotation.term,
            '',
            (rawAnnotation as any).__source,
            rawAnnotation.value ?? { type: 'Bool', Bool: true },
            (rawAnnotation as any).fullyQualifiedName
        );
    } else if (rawAnnotation.collection) {
        annotation = parseCollection(
            converter,
            target,
            rawAnnotation.term,
            '',
            (rawAnnotation as any).__source,
            rawAnnotation.collection,
            (rawAnnotation as any).fullyQualifiedName
        );
    } else {
        throw new Error('Unsupported case');
    }

    switch (typeof annotation) {
        case 'string':
            // eslint-disable-next-line no-new-wrappers
            annotation = new String(annotation);
            break;
        case 'boolean':
            // eslint-disable-next-line no-new-wrappers
            annotation = new Boolean(annotation);
            break;
        default:
            // do nothing
            break;
    }

    annotation.fullyQualifiedName = (rawAnnotation as any).fullyQualifiedName;
    annotation[ANNOTATION_TARGET] = target;

    const [vocAlias, vocTerm] = converter.splitTerm(rawAnnotation.term);

    annotation.term = converter.unalias(`${vocAlias}.${vocTerm}`);
    annotation.qualifier = rawAnnotation.qualifier;
    annotation.__source = (rawAnnotation as any).__source;

    try {
        lazy(annotation, 'annotations', () => {
            const annotationFQN = annotation.fullyQualifiedName;
            rawAnnotation.annotations?.forEach((rawSubAnnotation: any) => {
                rawSubAnnotation.target = annotationFQN;
                rawSubAnnotation.__source = annotation.__source;
                rawSubAnnotation[ANNOTATION_TARGET] = target;
                rawSubAnnotation.fullyQualifiedName = `${annotationFQN}@${annotation.term}`;
            });

            return createAnnotationsObject(converter, annotation, rawAnnotation.annotations ?? []);
        });
    } catch (e) {
        // not an error: parseRecord() already adds annotations, but the other parseXXX functions don't, so this can happen
    }

    return annotation as Annotation;
}

function getAnnotationFQN(currentTargetName: string, references: Reference[], annotation: RawAnnotation) {
    const annotationFQN = `${currentTargetName}@${unalias(references, annotation.term)}`;

    if (annotation.qualifier) {
        return `${annotationFQN}#${annotation.qualifier}`;
    } else {
        return annotationFQN;
    }
}

/**
 * Merge annotation from different source together by overwriting at the term level.
 *
 * @param rawMetadata
 * @returns the resulting merged annotations
 */
function mergeAnnotations(rawMetadata: RawMetadata): Record<string, AnnotationList> {
    const annotationListPerTarget: Record<string, AnnotationList> = {};
    Object.keys(rawMetadata.schema.annotations).forEach((annotationSource) => {
        rawMetadata.schema.annotations[annotationSource].forEach((annotationList: AnnotationList) => {
            const currentTargetName = unalias(rawMetadata.references, annotationList.target) as string;
            (annotationList as any).__source = annotationSource;
            if (!annotationListPerTarget[currentTargetName]) {
                annotationListPerTarget[currentTargetName] = {
                    annotations: annotationList.annotations.map((annotation: RawAnnotation) => {
                        (annotation as Annotation).fullyQualifiedName = getAnnotationFQN(
                            currentTargetName,
                            rawMetadata.references,
                            annotation
                        );
                        (annotation as any).__source = annotationSource;
                        return annotation;
                    }),
                    target: currentTargetName
                };
                (annotationListPerTarget[currentTargetName] as any).__source = annotationSource;
            } else {
                annotationList.annotations.forEach((annotation: RawAnnotation) => {
                    const findIndex = annotationListPerTarget[currentTargetName].annotations.findIndex(
                        (referenceAnnotation: RawAnnotation) => {
                            return (
                                referenceAnnotation.term === annotation.term &&
                                referenceAnnotation.qualifier === annotation.qualifier
                            );
                        }
                    );
                    (annotation as any).__source = annotationSource;
                    (annotation as Annotation).fullyQualifiedName = getAnnotationFQN(
                        currentTargetName,
                        rawMetadata.references,
                        annotation
                    );
                    if (findIndex !== -1) {
                        annotationListPerTarget[currentTargetName].annotations.splice(findIndex, 1, annotation);
                    } else {
                        annotationListPerTarget[currentTargetName].annotations.push(annotation);
                    }
                });
            }
        });
    });
    return annotationListPerTarget;
}

class Converter {
    private _rawAnnotationsPerTarget: Record<FullyQualifiedName, AnnotationList>;
    get rawAnnotationsPerTarget(): Record<FullyQualifiedName, AnnotationList> {
        if (this._rawAnnotationsPerTarget === undefined) {
            this._rawAnnotationsPerTarget = mergeAnnotations(this.rawMetadata);
        }
        return this._rawAnnotationsPerTarget;
    }

    private rawMetadata: RawMetadata;

    rawSchema: RawSchema;

    convertedElements: Map<FullyQualifiedName, any> = new Map();

    convertedOutput: ConvertedMetadata;

    constructor(rawMetadata: RawMetadata, convertedOutput: ConvertedMetadata) {
        this.rawMetadata = rawMetadata;
        this.rawSchema = rawMetadata.schema;
        this.convertedOutput = convertedOutput;
    }

    getConvertedElement<ConvertedType, RawType extends RemoveAnnotationAndType<ConvertedType>>(
        fullyQualifiedName: FullyQualifiedName,
        rawElement: RawType | undefined | ((rawSchema: RawSchema) => RawType | undefined),
        map: (converter: Converter, raw: RawType) => ConvertedType
    ): ConvertedType | undefined {
        let converted: ConvertedType | undefined = this.convertedElements.get(fullyQualifiedName);
        if (converted === undefined) {
            const rawMetadata =
                typeof rawElement === 'function' ? rawElement.apply(undefined, [this.rawSchema]) : rawElement;
            if (rawMetadata !== undefined) {
                converted = map.apply(undefined, [this, rawMetadata]);
                this.convertedElements.set(fullyQualifiedName, converted);
            }
        }
        return converted;
    }

    logError(message: string) {
        this.convertedOutput.diagnostics.push({ message });
    }

    splitTerm(term: string) {
        return splitTerm(this.rawMetadata.references, term);
    }

    alias(value: string) {
        return alias(this.rawMetadata.references, value);
    }
    unalias(value: string | undefined) {
        return unalias(this.rawMetadata.references, value) ?? '';
    }
}

/**
 * Converts an array of raw elements into an array of converted elements, additionally indexed by name.
 *
 * @param converter     Converter
 * @param rawElements   Possibly unconverted elements
 * @param convert       Mapping function for converting an element of the array
 * @returns A function that performs the mapping
 */
function collection<ConvertedType, RawType extends RemoveAnnotationAndType<ConvertedType>>(
    converter: Converter,
    rawElements: RawType[],
    convert: (converter: Converter, rawElement: RawType) => ConvertedType
) {
    return () => {
        const result: ConvertedType[] = rawElements.reduce((convertedElements, rawElement) => {
            const convertedElement = converter.getConvertedElement(
                (rawElement as any).fullyQualifiedName,
                rawElement,
                convert
            );
            if (convertedElement) {
                convertedElements.push(convertedElement);
            }
            return convertedElements;
        }, [] as ConvertedType[]);

        addIndex(result as any, 'name', INDEX_BY_NAME);
        return result as ConvertedType[];
    };
}

function resolveEntityType(converter: Converter, fullyQualifiedName: FullyQualifiedName) {
    return () => {
        let entityType = converter.getConvertedElement(
            fullyQualifiedName,
            (schema) =>
                schema.entityTypes.find((entry: RawEntityType) => entry.fullyQualifiedName === fullyQualifiedName),
            convertEntityType
        );

        if (!entityType) {
            converter.logError(`EntityType '${fullyQualifiedName}' not found`);
            entityType = {} as EntityType;
        }
        return entityType;
    };
}

function resolveNavigationPropertyBindings(
    converter: Converter,
    rawNavigationPropertyBindings: Singleton['navigationPropertyBinding'] | EntitySet['navigationPropertyBinding'],
    rawElement: RawSingleton | RawEntitySet
) {
    return () =>
        Object.keys(rawNavigationPropertyBindings).reduce((navigationPropertyBindings, bindingName) => {
            const rawBindingTarget = rawNavigationPropertyBindings[bindingName];

            lazy(navigationPropertyBindings, bindingName, () => {
                let resolvedBindingTarget;
                if (rawBindingTarget._type === 'Singleton') {
                    resolvedBindingTarget = converter.getConvertedElement(
                        rawBindingTarget.fullyQualifiedName,
                        rawBindingTarget as RawSingleton,
                        convertSingleton
                    );
                } else {
                    resolvedBindingTarget = converter.getConvertedElement(
                        rawBindingTarget.fullyQualifiedName,
                        rawBindingTarget as RawEntitySet,
                        convertEntitySet
                    );
                }
                if (!resolvedBindingTarget) {
                    converter.logError(
                        `${rawElement._type} '${rawElement.fullyQualifiedName}': Failed to resolve NavigationPropertyBinding ${bindingName}`
                    );
                    resolvedBindingTarget = {} as any;
                }
                return resolvedBindingTarget;
            });
            return navigationPropertyBindings;
        }, {} as EntitySet['navigationPropertyBinding'] | Singleton['navigationPropertyBinding']);
}

function resolveAnnotations(converter: Converter, rawAnnotationTarget: any) {
    return () =>
        createAnnotationsObject(
            converter,
            rawAnnotationTarget,
            converter.rawAnnotationsPerTarget[rawAnnotationTarget.fullyQualifiedName]?.annotations ?? []
        );
}

/**
 * Converts an EntityContainer.
 *
 * @param converter     Converter
 * @param rawElement    Unconverted EntityContainer
 * @returns The converted EntityContainer
 */
function convertEntityContainer(converter: Converter, rawElement: RawEntityContainer): EntityContainer {
    lazy(rawElement as EntityContainer, 'annotations', resolveAnnotations(converter, rawElement));

    lazy(
        rawElement as EntityContainer,
        'entitySets',
        collection(converter, converter.rawSchema.entitySets, convertEntitySet)
    );

    lazy(
        rawElement as EntityContainer,
        'singletons',
        collection(converter, converter.rawSchema.singletons, convertSingleton)
    );

    lazy(
        rawElement as EntityContainer,
        'actionImports',
        collection(converter, converter.rawSchema.actionImports, convertActionImport)
    );

    return rawElement as EntityContainer;
}

/**
 * Converts a Singleton.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted Singleton
 * @returns The converted Singleton
 */
function convertSingleton(converter: Converter, rawElement: RawSingleton): Singleton {
    (rawElement as Singleton).entityTypeName = converter.unalias(rawElement.entityTypeName);

    lazy(rawElement as Singleton, 'entityType', resolveEntityType(converter, rawElement.entityTypeName));
    lazy(rawElement as Singleton, 'annotations', resolveAnnotations(converter, rawElement as Singleton));

    const _rawNavigationPropertyBindings = rawElement.navigationPropertyBinding;
    lazy(
        rawElement as Singleton,
        'navigationPropertyBinding',
        resolveNavigationPropertyBindings(
            converter,
            _rawNavigationPropertyBindings as Singleton['navigationPropertyBinding'],
            rawElement
        )
    );

    return rawElement as Singleton;
}

/**
 * Converts an EntitySet.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted EntitySet
 * @returns The converted EntitySet
 */
function convertEntitySet(converter: Converter, rawElement: RawEntitySet): EntitySet {
    (rawElement as EntitySet).entityTypeName = converter.unalias(rawElement.entityTypeName);

    lazy(rawElement as EntitySet, 'entityType', resolveEntityType(converter, rawElement.entityTypeName));
    lazy(rawElement as EntitySet, 'annotations', resolveAnnotations(converter, rawElement as EntitySet));

    const _rawNavigationPropertyBindings = rawElement.navigationPropertyBinding;
    lazy(
        rawElement,
        'navigationPropertyBinding',
        resolveNavigationPropertyBindings(
            converter,
            _rawNavigationPropertyBindings as EntitySet['navigationPropertyBinding'],
            rawElement
        )
    );

    return rawElement as EntitySet;
}

/**
 * Converts an EntityType.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted EntityType
 * @returns The converted EntityType
 */
function convertEntityType(converter: Converter, rawElement: RawEntityType): EntityType {
    rawElement.keys.forEach((keyProp: any) => {
        keyProp.isKey = true;
    });

    lazy(rawElement as EntityType, 'annotations', resolveAnnotations(converter, rawElement));
    lazy(rawElement as EntityType, 'keys', collection(converter, rawElement.keys, convertProperty));
    lazy(
        rawElement as EntityType,
        'entityProperties',
        collection(converter, rawElement.entityProperties, convertProperty)
    );
    lazy(
        rawElement as EntityType,
        'navigationProperties',
        collection(converter, rawElement.navigationProperties as any, convertNavigationProperty)
    );

    lazy(rawElement as EntityType, 'actions', () =>
        converter.rawSchema.actions
            .filter(
                (rawAction) =>
                    rawAction.isBound &&
                    (rawAction.sourceType === rawElement.fullyQualifiedName ||
                        rawAction.sourceType === `Collection(${rawElement.fullyQualifiedName})`)
            )
            .reduce((actions, rawAction) => {
                const name = `${converter.rawSchema.namespace}.${rawAction.name}`;
                actions[name] = converter.getConvertedElement(rawAction.fullyQualifiedName, rawAction, convertAction)!;
                return actions;
            }, {} as EntityType['actions'])
    );

    (rawElement as EntityType).resolvePath = (relativePath: string, includeVisitedObjects: boolean) => {
        const target = resolveTarget(converter, rawElement, relativePath);
        return includeVisitedObjects ? target : target.target;
    };

    return rawElement as EntityType;
}

/**
 * Converts a Property.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted Property
 * @returns The converted Property
 */
function convertProperty(converter: Converter, rawElement: RawProperty): Property {
    (rawElement as Property).type = converter.unalias(rawElement.type);
    lazy(rawElement as Property, 'annotations', resolveAnnotations(converter, rawElement));

    lazy(rawElement as Property, 'targetType', () => {
        const type = rawElement.type;
        const typeName = type.startsWith('Collection') ? type.substring(11, type.length - 1) : type;
        let resolvedType;

        // ComplexType?
        resolvedType = converter.getConvertedElement(
            typeName,
            (schema) => schema.complexTypes.find((entry) => entry.fullyQualifiedName === typeName),
            convertComplexType
        );
        if (resolvedType) {
            return resolvedType;
        }

        // TypeDefinition?
        resolvedType = converter.getConvertedElement(
            typeName,
            (schema) => schema.typeDefinitions.find((entry) => entry.fullyQualifiedName === typeName),
            convertTypeDefinition
        );
        if (resolvedType) {
            return resolvedType;
        }

        return undefined; // primitive type
    });

    return rawElement as Property;
}

/**
 * Converts a NavigationProperty.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted NavigationProperty
 * @returns The converted NavigationProperty
 */
function convertNavigationProperty(
    converter: Converter,
    rawElement: RawV2NavigationProperty | RawV4NavigationProperty
): NavigationProperty {
    rawElement.referentialConstraint = rawElement.referentialConstraint ?? [];

    if (!isV4NavigationProperty(rawElement)) {
        const associationEnd = converter.rawSchema.associations
            .find((association) => association.fullyQualifiedName === rawElement.relationship)
            ?.associationEnd.find((end) => end.role === rawElement.toRole);

        (rawElement as unknown as NavigationProperty).targetTypeName = associationEnd?.type ?? '';
        (rawElement as unknown as NavigationProperty).isCollection = associationEnd?.multiplicity === '*';
    }

    (rawElement as NavigationProperty).targetTypeName = converter.unalias(
        (rawElement as NavigationProperty).targetTypeName
    );

    lazy(
        rawElement as NavigationProperty,
        'targetType',
        resolveEntityType(converter, (rawElement as NavigationProperty).targetTypeName)
    );

    lazy(rawElement as NavigationProperty, 'annotations', resolveAnnotations(converter, rawElement));

    return rawElement as NavigationProperty;
}

/**
 * Converts an ActionImport.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted ActionImport
 * @returns The converted ActionImport
 */
function convertActionImport(converter: Converter, rawElement: RawActionImport): ActionImport {
    (rawElement as ActionImport).actionName = converter.unalias(rawElement.actionName);

    lazy(rawElement as ActionImport, 'annotations', resolveAnnotations(converter, rawElement));

    lazy(rawElement as ActionImport, 'action', () => {
        let action = converter.getConvertedElement(
            rawElement.actionName,
            () =>
                converter.rawSchema.actions.find(
                    (entry: RawAction) => entry.fullyQualifiedName === rawElement.actionName
                ),
            convertAction
        );
        if (!action) {
            converter.logError(
                `ActionImport '${rawElement.fullyQualifiedName}': Action '${rawElement.actionName}' not found`
            );
            action = {} as any;
        }
        return action;
    });

    return rawElement as ActionImport;
}

/**
 * Converts an Action.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted Action
 * @returns The converted Action
 */
function convertAction(converter: Converter, rawElement: RawAction): Action {
    (rawElement as Action).sourceType = converter.unalias(rawElement.sourceType);
    if (rawElement.sourceType) {
        lazy(rawElement as Action, 'sourceEntityType', resolveEntityType(converter, rawElement.sourceType));
    }

    (rawElement as Action).returnType = converter.unalias(rawElement.returnType);
    if (rawElement.returnType) {
        lazy(rawElement as Action, 'returnEntityType', resolveEntityType(converter, rawElement.returnType));
    }

    lazy(rawElement as Action, 'parameters', collection(converter, rawElement.parameters, convertActionParameter));

    lazy(rawElement as Action, 'annotations', () => {
        let rawAnnotations = converter.rawAnnotationsPerTarget[rawElement.fullyQualifiedName]?.annotations ?? [];

        const baseActionName = substringBeforeFirst(rawElement.fullyQualifiedName, '(');
        if (baseActionName !== rawElement.fullyQualifiedName) {
            const baseAnnotations = converter.rawAnnotationsPerTarget[baseActionName]?.annotations ?? [];
            rawAnnotations = rawAnnotations.concat(baseAnnotations);
        }
        return createAnnotationsObject(converter, rawElement, rawAnnotations);
    });

    return rawElement as Action;
}

/**
 * Converts an ActionParameter.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted ActionParameter
 * @returns The converted ActionParameter
 */
function convertActionParameter(
    converter: Converter,
    rawElement: RemoveAnnotationAndType<ActionParameter>
): ActionParameter {
    lazy(rawElement as ActionParameter, 'typeReference', () => {
        let resolvedType;
        // EntityType?
        resolvedType = converter.getConvertedElement(
            rawElement.type,
            (schema) => schema.entityTypes.find((entry) => entry.fullyQualifiedName === rawElement.type),
            convertEntityType
        );

        if (resolvedType) {
            return resolvedType;
        }

        // ComplexType?
        resolvedType = converter.getConvertedElement(
            rawElement.type,
            (schema) => schema.complexTypes.find((entry) => entry.fullyQualifiedName === rawElement.type),
            convertComplexType
        );
        if (resolvedType) {
            return resolvedType;
        }

        // TypeDefinition?
        resolvedType = converter.getConvertedElement(
            rawElement.type,
            (schema) => schema.typeDefinitions.find((entry) => entry.fullyQualifiedName === rawElement.type),
            convertTypeDefinition
        );
        if (resolvedType) {
            return resolvedType;
        }

        return undefined; // primitive type
    });

    lazy(rawElement as ActionParameter, 'annotations', resolveAnnotations(converter, rawElement));

    return rawElement as ActionParameter;
}

/**
 * Converts a ComplexType.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted ComplexType
 * @returns The converted ComplexType
 */
function convertComplexType(converter: Converter, rawElement: RawComplexType): ComplexType {
    const _rawProperties = rawElement.properties;
    lazy(rawElement as ComplexType, 'properties', collection(converter, rawElement.properties, convertProperty));
    lazy(
        rawElement as ComplexType,
        'navigationProperties',
        collection(converter, rawElement.navigationProperties as any, convertNavigationProperty)
    );
    lazy(rawElement as ComplexType, 'annotations', resolveAnnotations(converter, rawElement));

    return rawElement as ComplexType;
}

/**
 * Converts a TypeDefinition.
 *
 * @param converter   Converter
 * @param rawElement  Unconverted TypeDefinition
 * @returns The converted TypeDefinition
 */
function convertTypeDefinition(converter: Converter, rawElement: RawTypeDefinition): TypeDefinition {
    lazy(rawElement as TypeDefinition, 'annotations', resolveAnnotations(converter, rawElement));
    return rawElement as TypeDefinition;
}

function createAnnotationsObject(converter: Converter, target: any, rawAnnotations: RawAnnotation[]) {
    return rawAnnotations.reduce((vocabularyAliases, annotation) => {
        const [vocAlias, vocTerm] = converter.splitTerm(annotation.term);
        const vocTermWithQualifier = `${vocTerm}${annotation.qualifier ? '#' + annotation.qualifier : ''}`;

        if (vocabularyAliases[vocAlias] === undefined) {
            vocabularyAliases[vocAlias] = {};
        }

        if (!vocabularyAliases[vocAlias].hasOwnProperty(vocTermWithQualifier)) {
            lazy(vocabularyAliases[vocAlias], vocTermWithQualifier, () =>
                converter.getConvertedElement(
                    (annotation as Annotation).fullyQualifiedName,
                    annotation,
                    (converter, rawAnnotation) => convertAnnotation(converter, target, rawAnnotation)
                )
            );
        }
        return vocabularyAliases;
    }, {} as any);
}

/**
 * Convert a RawMetadata into an object representation to be used to easily navigate a metadata object and its annotation.
 *
 * @param rawMetadata
 * @returns the converted representation of the metadata.
 */
export function convert(rawMetadata: RawMetadata): ConvertedMetadata {
    // Converter Output
    const convertedOutput: ConvertedMetadata = {
        version: rawMetadata.version,
        namespace: rawMetadata.schema.namespace,
        annotations: rawMetadata.schema.annotations,
        references: defaultReferences.concat(rawMetadata.references),
        diagnostics: []
    } as any;

    // Converter
    const converter = new Converter(rawMetadata, convertedOutput);

    lazy(
        convertedOutput,
        'entityContainer',
        () =>
            converter.getConvertedElement(
                converter.rawSchema.entityContainer.fullyQualifiedName,
                converter.rawSchema.entityContainer,
                convertEntityContainer
            ) ?? ({ _type: 'EntityContainer', fullyQualifiedName: '', name: '', annotations: {} } as EntityContainer)
    );

    lazy(convertedOutput, 'entitySets', collection(converter, converter.rawSchema.entitySets, convertEntitySet));
    lazy(convertedOutput, 'singletons', collection(converter, converter.rawSchema.singletons, convertSingleton));
    lazy(convertedOutput, 'entityTypes', collection(converter, converter.rawSchema.entityTypes, convertEntityType));
    lazy(convertedOutput, 'actions', collection(converter, converter.rawSchema.actions, convertAction));
    lazy(convertedOutput, 'complexTypes', collection(converter, converter.rawSchema.complexTypes, convertComplexType));
    lazy(
        convertedOutput,
        'actionImports',
        collection(converter, converter.rawSchema.actionImports, convertActionImport)
    );

    lazy(
        convertedOutput,
        'typeDefinitions',
        collection(converter, converter.rawSchema.typeDefinitions, convertTypeDefinition)
    );

    convertedOutput.resolvePath = createGlobalResolve(converter);
    return convertedOutput;
}
