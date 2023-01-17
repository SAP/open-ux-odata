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
import type { ReferencesWithMap } from './utils';
import {
    alias,
    Decimal,
    defaultReferences,
    EnumIsFlag,
    isDefined,
    lazy,
    splitAtFirst,
    splitAtLast,
    substringBeforeFirst,
    substringBeforeLast,
    TermToTypes,
    unalias
} from './utils';

const ANNOTATION_TARGET = Symbol('Annotation Target');

/**
 * Resolves a specific path based on the objectMap.
 *
 * @param converter
 * @param rawMetadata
 * @param startElement
 * @param path
 * @param includeVisitedObjects
 * @param annotationsTerm
 * @returns the resolved object
 */
function _resolveTarget(
    converter: Converter,
    startElement: any,
    path: string,
    includeVisitedObjects = false,
    annotationsTerm?: string
) {
    const pathSegments = path.split('/').reduce((targetPath, segment) => {
        // Separate out the annotation
        if (segment.includes('@')) {
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

    type Result = {
        visitedObjects: any[];
        element: any;
        messages: { message: string; path?: string }[];
    };
    function reduceEntityType(current: Result, segment: string) {
        const redirected = _resolveTarget(converter, current.element, segment, true);
        current.element = redirected.target;
        current.visitedObjects = redirected.visitedObjects.reduce(appendVisitedObjects, current.visitedObjects);
        return current;
    }

    function appendVisitedObjects(visitedObjects: any[], visitedObject: any): any[] {
        if (visitedObjects[visitedObjects.length - 1] !== visitedObject) {
            visitedObjects.push(visitedObject);
        }
        return visitedObjects;
    }

    const result = pathSegments.reduce(
        (current: Result, segment: string): Result => {
            const error = (message: string) => {
                current.messages.push({ message });
                current.visitedObjects = appendVisitedObjects(current.visitedObjects, undefined);
                current.element = undefined;
                return current;
            };

            if (current.element === undefined) {
                return current;
            }

            current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.element);

            // Annotation
            if (segment.startsWith('@') && segment !== '@$ui5.overload') {
                const [vocabularyAlias, term] = converter.splitTerm(segment);
                const annotation = current.element.annotations[vocabularyAlias.substring(1)]?.[term];

                if (annotation !== undefined) {
                    current.element = annotation;
                    return current;
                }
                return error(
                    `Annotation '${segment.substring(1)}' not found on ${current.element._type} '${
                        current.element.fullyQualifiedName
                    }'`
                );
            }

            switch (current.element?._type) {
                case 'EntityContainer':
                    if (segment === '' || segment === current.element.fullyQualifiedName) {
                        return current;
                    }

                    // TODO: Index access!
                    const rawEntitySet = converter.rawSchema.entitySets.find(
                        (entry: RawEntitySet) => entry.name === segment
                    );
                    if (rawEntitySet !== undefined) {
                        current.element = converter.getConvertedElement(
                            rawEntitySet.fullyQualifiedName,
                            rawEntitySet,
                            convertEntitySet
                        );
                        return current;
                    }

                    const rawSingleton = converter.rawSchema.singletons.find(
                        (entry: RawSingleton) => entry.name === segment
                    );
                    if (rawSingleton !== undefined) {
                        current.element = converter.getConvertedElement(
                            rawSingleton.fullyQualifiedName,
                            rawSingleton,
                            convertSingleton
                        );
                        return current;
                    }

                    const rawActionImport = converter.rawSchema.actionImports.find(
                        (entry: RawActionImport) => entry.name === segment
                    );
                    if (rawActionImport !== undefined) {
                        const actionImport = converter.getConvertedElement(
                            rawActionImport.fullyQualifiedName,
                            rawActionImport,
                            convertActionImport
                        )!;

                        current.visitedObjects = appendVisitedObjects(current.visitedObjects, actionImport);

                        const action = actionImport.action;
                        if (action) {
                            current.element = action;
                            return current;
                        }

                        return error(
                            `Action import '${actionImport.fullyQualifiedName}': Action '${actionImport.actionName}' not found`
                        );
                    }
                    break;

                case 'EntitySet':
                case 'Singleton':
                    {
                        const thisElement = current.element as EntitySet | Singleton;

                        if (segment === '' || segment === '$Type') {
                            // Empty Path after an EntitySet or Singleton means EntityType
                            current.element = thisElement.entityType;
                            return current;
                        }

                        if (segment === '$') {
                            return current;
                        }

                        if (segment === '$NavigationPropertyBinding') {
                            const navigationPropertyBindings = thisElement.navigationPropertyBinding;
                            current.element = navigationPropertyBindings;
                            return current;
                        }

                        current.element = thisElement.entityType;
                        current.visitedObjects = appendVisitedObjects(current.visitedObjects, thisElement.entityType);
                        current = reduceEntityType(current, segment);
                    }
                    break;

                case 'EntityType':
                    {
                        const thisElement = current.element as EntityType;

                        if (segment === '') {
                            return current;
                        }

                        // TODO: replace with index access
                        const property = thisElement.entityProperties.find(
                            (property: Property) => property.name === segment
                        );
                        if (property) {
                            current.element = property;
                            return current;
                        }

                        // TODO: replace with index access
                        const navigationProperty = thisElement.navigationProperties.find(
                            (property: NavigationProperty) => property.name === segment
                        );
                        if (navigationProperty) {
                            current.element = navigationProperty;
                            return current;
                        }

                        const action = thisElement.actions[segment];
                        if (action) {
                            current.element = action;
                            return current;
                        }
                    }
                    break;

                case 'Action':
                    {
                        const thisElement = current.element as Action;

                        if (segment === '') {
                            return current;
                        }

                        if (segment === '@$ui5.overload' || segment === '0') {
                            return current;
                        }

                        if (segment === '$Parameter' && thisElement.isBound) {
                            current.element = thisElement.parameters;
                            return current;
                        }

                        current.element =
                            thisElement.parameters[segment as any] ??
                            thisElement.parameters.find((param: ActionParameter) => param.name === segment);
                    }
                    break;

                case 'Property':
                    // Property or NavigationProperty of the ComplexType
                    const type = (current.element as Property).targetType as ComplexType | undefined;
                    if (type !== undefined) {
                        // TODO: replace with index access
                        const property = type.properties.find((property: Property) => property.name === segment);
                        if (property) {
                            current.element = property;
                            return current;
                        }

                        // TODO: replace with index access
                        const navigationProperty = type.navigationProperties.find(
                            (property: NavigationProperty) => property.name === segment
                        );
                        if (navigationProperty) {
                            current.element = navigationProperty;
                            return current;
                        }
                    }

                    break;

                case 'ActionParameter':
                    const referencedType = (current.element as ActionParameter).typeReference;
                    if (referencedType !== undefined) {
                        current.element = referencedType;
                        return current;
                    }
                    break;

                case 'NavigationProperty':
                    current.element = (current.element as NavigationProperty).targetType;
                    current = reduceEntityType(current, segment);
                    break;

                default: {
                    if (segment === '$AnnotationPath' && current.element.$target) {
                        const subTarget = _resolveTarget(
                            converter,
                            current.element[ANNOTATION_TARGET],
                            current.element.value,
                            true
                        );
                        subTarget.visitedObjects.forEach((visitedSubObject: any) => {
                            if (!current.visitedObjects.includes(visitedSubObject)) {
                                current.visitedObjects = appendVisitedObjects(current.visitedObjects, visitedSubObject);
                            }
                        });

                        current.element = subTarget.target;
                        current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.element);
                        return current;
                    }

                    current.element = current.element[segment];
                    current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.element);
                }
            }

            return current;
        },
        { visitedObjects: [], element: startElement, messages: [] }
    );

    const visitedObjects = result.visitedObjects;
    const target = result.element;

    // Diagnostics
    result.messages.forEach((message) => converter.logError(message.message));
    if (!target) {
        let oErrorMsg;
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

    return includeVisitedObjects
        ? {
              visitedObjects: visitedObjects,
              target: target
          }
        : target;
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
                $target: _resolveTarget(converter, currentTarget, propertyValue.PropertyPath, false, currentTerm),
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                value: propertyValue.NavigationPropertyPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    converter,
                    currentTarget,
                    propertyValue.NavigationPropertyPath,
                    false,
                    currentTerm
                ),
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                value: propertyValue.AnnotationPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    converter,
                    currentTarget,
                    converter.unalias(propertyValue.AnnotationPath),
                    false,
                    currentTerm
                ),
                annotationsTerm: currentTerm,
                term: '',
                path: '',
                [ANNOTATION_TARGET]: currentTarget
            };
        case 'Path':
            const $target = _resolveTarget(converter, currentTarget, propertyValue.Path, false, currentTerm);
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
 * @param annotationsTerm The annotation term
 * @param annotationTarget the annotation target
 * @param currentProperty the current property of the record
 * @returns the inferred type.
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

                lazy(result, '$target', () =>
                    _resolveTarget(converter, currentTarget, propertyPath.PropertyPath, false, currentTerm)
                );

                return result;
            });

        case 'Path':
            // TODO: make lazy?
            return collectionDefinition.map((pathValue) => {
                return _resolveTarget(converter, currentTarget, pathValue.Path, false, currentTerm);
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

                lazy(result, '$target', () =>
                    _resolveTarget(converter, currentTarget, annotationPath.AnnotationPath, false, currentTerm)
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

                lazy(result, '$target', () =>
                    _resolveTarget(converter, currentTarget, navPropertyPath.NavigationPropertyPath, false, currentTerm)
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
 * @param rawMetadata
 * @returns the function that will allow to resolve element globally.
 */
function createGlobalResolve(converter: Converter) {
    return function resolvePath<T>(sPath: string): ResolutionTarget<T> {
        let targetPath = sPath;
        if (!sPath.startsWith('/')) {
            targetPath = `/${sPath}`;
        }

        const targetResolution: any = _resolveTarget(converter, undefined, targetPath, true);
        if (targetResolution.target) {
            if (
                targetResolution.visitedObjects[targetResolution.visitedObjects.length - 1] !== targetResolution.target
            ) {
                targetResolution.visitedObjects.push(targetResolution.target);
            }
        }
        return {
            target: targetResolution.target,
            objectPath: targetResolution.visitedObjects
        };
    };
}

function convertAnnotation(converter: Converter, target: any, rawAnnotation: RawAnnotation): Annotation {
    let annotation: any; // TODO: Annotation!
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

    if (typeof annotation === 'object') {
        annotation.term = converter.unalias(`${vocAlias}.${vocTerm}`);
        annotation.qualifier = rawAnnotation.qualifier;
        annotation.__source = (rawAnnotation as any).__source; // TODO: Check if this actually has a value

        try {
            lazy(annotation, 'annotations', () => {
                const annotationFQN = (rawAnnotation as any).fullyQualifiedName;
                const annotationList: AnnotationList = {
                    target: target.fullyQualifiedName,
                    annotations:
                        rawAnnotation.annotations?.map((rawSubAnnotation: RawAnnotation) => {
                            const [vocAlias, vocTerm] = converter.splitTerm(rawSubAnnotation.term);
                            const vocTermWithQualifier = `${vocTerm}${
                                rawSubAnnotation.qualifier ? '#' + rawSubAnnotation.qualifier : ''
                            }`;

                            (rawSubAnnotation as Annotation).fullyQualifiedName = `${annotationFQN}@${converter.unalias(
                                vocAlias + '.' + vocTermWithQualifier
                            )}`;

                            (rawSubAnnotation as any).__source = annotation.__source;

                            return rawSubAnnotation;
                        }) ?? []
                };
                return createAnnotationsObject(converter, target, annotationList.annotations);
            });
        } catch (e) {
            // FIXME
        }
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

    lazy(convertedOutput, 'entitySets', () =>
        rawMetadata.schema.entitySets
            .map((element: RawEntitySet) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertEntitySet)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'singletons', () =>
        rawMetadata.schema.singletons
            .map((element: RawSingleton) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertSingleton)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'entityTypes', () =>
        rawMetadata.schema.entityTypes
            .map((element: RawEntityType) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertEntityType)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'actionImports', () =>
        rawMetadata.schema.actionImports
            .map((element: RawActionImport) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertActionImport)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'actions', () =>
        rawMetadata.schema.actions
            .map((element: RawAction) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertAction)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'complexTypes', () =>
        rawMetadata.schema.complexTypes
            .map((element: RawComplexType) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertComplexType)
            )
            .filter(isDefined)
    );

    lazy(convertedOutput, 'typeDefinitions', () =>
        rawMetadata.schema.typeDefinitions
            .map((element: RawTypeDefinition) =>
                converter.getConvertedElement(element.fullyQualifiedName, element, convertTypeDefinition)
            )
            .filter(isDefined)
    );

    convertedOutput.resolvePath = createGlobalResolve(converter);
    return convertedOutput;
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
        console.error(message);
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

    const _rawKeys = rawElement.keys;
    lazy(rawElement as EntityType, 'keys', () =>
        _rawKeys
            .map((element) => converter.getConvertedElement(element.fullyQualifiedName, element, convertProperty))
            .filter(isDefined)
    );

    const _rawEntityProperties = rawElement.entityProperties;
    lazy(rawElement as EntityType, 'entityProperties', () =>
        _rawEntityProperties
            .map((element) => converter.getConvertedElement(element.fullyQualifiedName, element, convertProperty))
            .filter(isDefined)
    );

    const _rawNavigationProperties = rawElement.navigationProperties;
    lazy(rawElement as EntityType, 'navigationProperties', () =>
        _rawNavigationProperties
            .map((element) =>
                converter.getConvertedElement(element.fullyQualifiedName, element as any, convertNavigationProperty)
            )
            .filter(isDefined)
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
        return _resolveTarget(converter, rawElement, relativePath, includeVisitedObjects);
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

    const _rawParameters = rawElement.parameters;
    lazy(rawElement as Action, 'parameters', () =>
        _rawParameters
            .map((rawParameter) =>
                converter.getConvertedElement(rawParameter.fullyQualifiedName, rawParameter, convertActionParameter)
            )
            .filter(isDefined)
    );

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
    lazy(rawElement as ComplexType, 'properties', () =>
        _rawProperties
            .map((element) => converter.getConvertedElement(element.fullyQualifiedName, element, convertProperty))
            .filter(isDefined)
    );

    const _rawNavigationProperties = rawElement.navigationProperties;
    lazy(rawElement as ComplexType, 'navigationProperties', () =>
        _rawNavigationProperties
            .map((element) =>
                converter.getConvertedElement(element.fullyQualifiedName, element as any, convertNavigationProperty)
            )
            .filter(isDefined)
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
