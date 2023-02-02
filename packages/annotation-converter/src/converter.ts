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
            converter.rawSchema.entityContainer,
            convertEntityContainer
        );
    } else if (startElement[ANNOTATION_TARGET] !== undefined) {
        // annotation: start at the annotation target
        startElement = startElement[ANNOTATION_TARGET];
    } else if (startElement._type === 'Property') {
        // property: start at the entity type the property belongs to
        startElement = converter.getConvertedElement(
            substringBeforeFirst(startElement.fullyQualifiedName, '/'),
            findIn(converter.rawSchema.entityTypes),
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

            // $Path / $AnnotationPath syntax
            if (current.target.$target) {
                let subPath: string | undefined;
                if (segment === '$AnnotationPath') {
                    subPath = current.target.value;
                } else if (segment === '$Path') {
                    subPath = current.target.path;
                }

                if (subPath !== undefined) {
                    const subTarget = resolveTarget(converter, current.target[ANNOTATION_TARGET], subPath);
                    subTarget.visitedObjects.forEach((visitedSubObject: any) => {
                        if (!current.visitedObjects.includes(visitedSubObject)) {
                            current.visitedObjects = appendVisitedObjects(current.visitedObjects, visitedSubObject);
                        }
                    });

                    current.target = subTarget.target;
                    current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.target);
                    return current;
                }
            }

            // traverse based on the element type
            switch (current.target?._type) {
                case 'EntityContainer':
                    {
                        const thisElement = current.target as EntityContainer;

                        if (segment === '' || segment === thisElement.fullyQualifiedName) {
                            return current;
                        }

                        // next element: EntitySet, Singleton or ActionImport?
                        const nextElement: EntitySet | Singleton | ActionImport | undefined =
                            (thisElement.entitySets as ArrayWithIndex<EntitySet>)[INDEX_BY_NAME](segment) ??
                            (thisElement.singletons as ArrayWithIndex<Singleton>)[INDEX_BY_NAME](segment) ??
                            (thisElement.actionImports as ArrayWithIndex<ActionImport>)[INDEX_BY_NAME](segment);

                        if (nextElement) {
                            current.target = nextElement;
                            return current;
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

                        const property = (thisElement.entityProperties as ArrayWithIndex<Property>)[INDEX_BY_NAME](
                            segment
                        );
                        if (property) {
                            current.target = property;
                            return current;
                        }

                        const navigationProperty = (
                            thisElement.navigationProperties as ArrayWithIndex<NavigationProperty>
                        )[INDEX_BY_NAME](segment);
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

                case 'ActionImport': {
                    // continue resolving at the Action
                    const result = resolveTarget(converter, current.target.action, segment);
                    current.target = result.target;
                    current.visitedObjects = result.visitedObjects.reduce(appendVisitedObjects, current.visitedObjects);
                    return current;
                }

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
                            const property = (type.properties as ArrayWithIndex<Property>)[INDEX_BY_NAME](segment);
                            if (property) {
                                current.target = property;
                                return current;
                            }

                            const navigationProperty = (
                                type.navigationProperties as ArrayWithIndex<NavigationProperty>
                            )[INDEX_BY_NAME](segment);
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

                default:
                    if (current.target[segment]) {
                        current.target = current.target[segment];
                        current.visitedObjects = appendVisitedObjects(current.visitedObjects, current.target);
                    }
                    return current;
            }

            return error(
                `Element '${segment}' not found at ${current.target._type} '${current.target.fullyQualifiedName}'`
            );
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
        // be graceful when resolving annotations on annotations: Sometimes they are referenced directly, sometimes they
        // are part of the global annotations list
        let annotations;
        if (annotationRecord.annotations && annotationRecord.annotations.length > 0) {
            annotations = annotationRecord.annotations;
        } else {
            annotations = converter.rawAnnotationsPerTarget[currentFQN]?.annotations;
        }

        annotations?.forEach((annotation: any) => {
            annotation.target = currentFQN;
            annotation.__source = currentSource;
            annotation[ANNOTATION_TARGET] = currentTarget;
            annotation.fullyQualifiedName = `${currentFQN}@${annotation.term}`;
        });

        return createAnnotationsObject(converter, annotationTerm, annotations ?? []);
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

                const rawActionImport = (converter.rawSchema.actionImports as ArrayWithIndex<RawActionImport>)[
                    INDEX_BY_NAME
                ](actionImportName);

                if (rawActionImport) {
                    actionTarget = converter.getConvertedElement(
                        rawActionImport.fullyQualifiedName,
                        findIn(converter.rawSchema.actionImports),
                        convertActionImport
                    )?.action;
                }
            }

            if (!actionTarget) {
                actionTarget = converter.getConvertedElement(
                    annotationContent.Action,
                    (fullyQualifiedName) =>
                        converter.rawSchema.actions.find(
                            (entry) => entry.fullyQualifiedName === fullyQualifiedName && entry.isBound === true
                        ),
                    convertAction
                );
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
        case 'number':
            annotation = new Number(annotation);
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

            // be graceful when resolving annotations on annotations: Sometimes they are referenced directly, sometimes they
            // are part of the global annotations list
            let annotations;
            if (rawAnnotation.annotations && rawAnnotation.annotations.length > 0) {
                annotations = rawAnnotation.annotations;
            } else {
                annotations = converter.rawAnnotationsPerTarget[annotationFQN]?.annotations;
            }

            annotations?.forEach((rawSubAnnotation: any) => {
                rawSubAnnotation.target = annotationFQN;
                rawSubAnnotation.__source = annotation.__source;
                rawSubAnnotation[ANNOTATION_TARGET] = target;
                rawSubAnnotation.fullyQualifiedName = `${annotationFQN}@${rawSubAnnotation.term}`;
            });

            return createAnnotationsObject(converter, annotation, annotations ?? []);
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

        addIndex(this.rawSchema.actionImports, 'name', INDEX_BY_NAME);
    }

    getConvertedElement<ConvertedType, RawType extends RemoveAnnotationAndType<ConvertedType>>(
        fullyQualifiedName: FullyQualifiedName,
        rawElement: RawType | undefined | ((fullyQualifiedName: FullyQualifiedName) => RawType | undefined),
        map: (converter: Converter, raw: RawType) => ConvertedType
    ): ConvertedType | undefined {
        let converted: ConvertedType | undefined = this.convertedElements.get(fullyQualifiedName);
        if (converted === undefined) {
            const rawMetadata =
                typeof rawElement === 'function' ? rawElement.apply(undefined, [fullyQualifiedName]) : rawElement;
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
            findIn(converter.rawSchema.entityTypes),
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
                        findIn(converter.rawSchema.singletons),
                        convertSingleton
                    );
                } else {
                    resolvedBindingTarget = converter.getConvertedElement(
                        rawBindingTarget.fullyQualifiedName,
                        findIn(converter.rawSchema.entitySets),
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

function findIn<Type extends { fullyQualifiedName: FullyQualifiedName }>(rawMetadataElements: Type[]) {
    return (fullyQualifiedName: FullyQualifiedName) =>
        rawMetadataElements.find((entry) => entry.fullyQualifiedName === fullyQualifiedName);
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
 * Converts an EntityContainer.
 *
 * @param converter     Converter
 * @param rawEntityContainer    Unconverted EntityContainer
 * @returns The converted EntityContainer
 */
function convertEntityContainer(converter: Converter, rawEntityContainer: RawEntityContainer): EntityContainer {
    const convertedEntityContainer = rawEntityContainer as EntityContainer;

    lazy(convertedEntityContainer, 'annotations', resolveAnnotations(converter, rawEntityContainer));

    lazy(
        convertedEntityContainer,
        'entitySets',
        collection(converter, converter.rawSchema.entitySets, convertEntitySet)
    );

    lazy(
        convertedEntityContainer,
        'singletons',
        collection(converter, converter.rawSchema.singletons, convertSingleton)
    );

    lazy(
        convertedEntityContainer,
        'actionImports',
        collection(converter, converter.rawSchema.actionImports, convertActionImport)
    );

    return convertedEntityContainer;
}

/**
 * Converts a Singleton.
 *
 * @param converter   Converter
 * @param rawSingleton  Unconverted Singleton
 * @returns The converted Singleton
 */
function convertSingleton(converter: Converter, rawSingleton: RawSingleton): Singleton {
    const convertedSingleton = rawSingleton as Singleton;

    convertedSingleton.entityTypeName = converter.unalias(rawSingleton.entityTypeName);

    lazy(convertedSingleton, 'entityType', resolveEntityType(converter, rawSingleton.entityTypeName));
    lazy(convertedSingleton, 'annotations', resolveAnnotations(converter, rawSingleton as Singleton));

    const _rawNavigationPropertyBindings = rawSingleton.navigationPropertyBinding;
    lazy(
        convertedSingleton,
        'navigationPropertyBinding',
        resolveNavigationPropertyBindings(
            converter,
            _rawNavigationPropertyBindings as Singleton['navigationPropertyBinding'],
            rawSingleton
        )
    );

    return convertedSingleton;
}

/**
 * Converts an EntitySet.
 *
 * @param converter   Converter
 * @param rawEntitySet  Unconverted EntitySet
 * @returns The converted EntitySet
 */
function convertEntitySet(converter: Converter, rawEntitySet: RawEntitySet): EntitySet {
    const convertedEntitySet = rawEntitySet as EntitySet;

    convertedEntitySet.entityTypeName = converter.unalias(rawEntitySet.entityTypeName);

    lazy(convertedEntitySet, 'entityType', resolveEntityType(converter, rawEntitySet.entityTypeName));
    lazy(convertedEntitySet, 'annotations', resolveAnnotations(converter, rawEntitySet as EntitySet));

    const _rawNavigationPropertyBindings = rawEntitySet.navigationPropertyBinding;
    lazy(
        convertedEntitySet,
        'navigationPropertyBinding',
        resolveNavigationPropertyBindings(
            converter,
            _rawNavigationPropertyBindings as EntitySet['navigationPropertyBinding'],
            rawEntitySet
        )
    );

    return convertedEntitySet;
}

/**
 * Converts an EntityType.
 *
 * @param converter   Converter
 * @param rawEntityType  Unconverted EntityType
 * @returns The converted EntityType
 */
function convertEntityType(converter: Converter, rawEntityType: RawEntityType): EntityType {
    const convertedEntityType = rawEntityType as EntityType;

    rawEntityType.keys.forEach((keyProp: any) => {
        keyProp.isKey = true;
    });

    lazy(convertedEntityType, 'annotations', resolveAnnotations(converter, rawEntityType));
    lazy(convertedEntityType, 'keys', collection(converter, rawEntityType.keys, convertProperty));
    lazy(
        convertedEntityType,
        'entityProperties',
        collection(converter, rawEntityType.entityProperties, convertProperty)
    );
    lazy(
        convertedEntityType,
        'navigationProperties',
        collection(converter, rawEntityType.navigationProperties as any, convertNavigationProperty)
    );

    lazy(convertedEntityType, 'actions', () =>
        converter.rawSchema.actions
            .filter(
                (rawAction) =>
                    rawAction.isBound &&
                    (rawAction.sourceType === rawEntityType.fullyQualifiedName ||
                        rawAction.sourceType === `Collection(${rawEntityType.fullyQualifiedName})`)
            )
            .reduce((actions, rawAction) => {
                const name = `${converter.rawSchema.namespace}.${rawAction.name}`;
                actions[name] = converter.getConvertedElement(
                    rawAction.fullyQualifiedName,
                    findIn(converter.rawSchema.actions),
                    convertAction
                )!;
                return actions;
            }, {} as EntityType['actions'])
    );

    convertedEntityType.resolvePath = (relativePath: string, includeVisitedObjects: boolean) => {
        const target = resolveTarget(converter, rawEntityType, relativePath);
        return includeVisitedObjects ? target : target.target;
    };

    return convertedEntityType;
}

/**
 * Converts a Property.
 *
 * @param converter   Converter
 * @param rawProperty  Unconverted Property
 * @returns The converted Property
 */
function convertProperty(converter: Converter, rawProperty: RawProperty): Property {
    const convertedProperty = rawProperty as Property;

    convertedProperty.type = converter.unalias(rawProperty.type);
    lazy(convertedProperty, 'annotations', resolveAnnotations(converter, rawProperty));

    lazy(convertedProperty, 'targetType', () => {
        const type = rawProperty.type;
        const typeName = type.startsWith('Collection') ? type.substring(11, type.length - 1) : type;

        return (
            converter.getConvertedElement(typeName, findIn(converter.rawSchema.complexTypes), convertComplexType) ??
            converter.getConvertedElement(typeName, findIn(converter.rawSchema.typeDefinitions), convertTypeDefinition)
        );
    });

    return convertedProperty;
}

/**
 * Converts a NavigationProperty.
 *
 * @param converter   Converter
 * @param rawNavigationProperty  Unconverted NavigationProperty
 * @returns The converted NavigationProperty
 */
function convertNavigationProperty(
    converter: Converter,
    rawNavigationProperty: RawV2NavigationProperty | RawV4NavigationProperty
): NavigationProperty {
    const convertedNavigationProperty = rawNavigationProperty as NavigationProperty;

    convertedNavigationProperty.referentialConstraint = convertedNavigationProperty.referentialConstraint ?? [];

    if (isV4NavigationProperty(rawNavigationProperty)) {
        convertedNavigationProperty.targetTypeName = converter.unalias(rawNavigationProperty.targetTypeName);
    } else {
        const associationEnd = converter.rawSchema.associations
            .find((association) => association.fullyQualifiedName === rawNavigationProperty.relationship)
            ?.associationEnd.find((end) => end.role === rawNavigationProperty.toRole);

        convertedNavigationProperty.isCollection = associationEnd?.multiplicity === '*';
        convertedNavigationProperty.targetTypeName = associationEnd?.type ?? '';
    }

    lazy(
        convertedNavigationProperty,
        'targetType',
        resolveEntityType(converter, (rawNavigationProperty as NavigationProperty).targetTypeName)
    );

    lazy(convertedNavigationProperty, 'annotations', resolveAnnotations(converter, rawNavigationProperty));

    return convertedNavigationProperty;
}

/**
 * Converts an ActionImport.
 *
 * @param converter   Converter
 * @param rawActionImport  Unconverted ActionImport
 * @returns The converted ActionImport
 */
function convertActionImport(converter: Converter, rawActionImport: RawActionImport): ActionImport {
    const convertedActionImport = rawActionImport as ActionImport;

    convertedActionImport.actionName = converter.unalias(rawActionImport.actionName);

    lazy(convertedActionImport, 'annotations', resolveAnnotations(converter, rawActionImport));

    lazy(convertedActionImport, 'action', () =>
        converter.getConvertedElement(rawActionImport.actionName, findIn(converter.rawSchema.actions), convertAction)
    );

    return convertedActionImport;
}

/**
 * Converts an Action.
 *
 * @param converter   Converter
 * @param rawAction  Unconverted Action
 * @returns The converted Action
 */
function convertAction(converter: Converter, rawAction: RawAction): Action {
    const convertedAction = rawAction as Action;

    convertedAction.sourceType = converter.unalias(rawAction.sourceType);
    if (convertedAction.sourceType) {
        lazy(convertedAction, 'sourceEntityType', resolveEntityType(converter, rawAction.sourceType));
    }

    convertedAction.returnType = converter.unalias(rawAction.returnType);
    if (convertedAction.returnType) {
        lazy(convertedAction, 'returnEntityType', resolveEntityType(converter, rawAction.returnType));
    }

    lazy(convertedAction, 'parameters', collection(converter, rawAction.parameters, convertActionParameter));

    lazy(convertedAction, 'annotations', () => {
        let rawAnnotations = converter.rawAnnotationsPerTarget[rawAction.fullyQualifiedName]?.annotations ?? [];

        const baseActionName = substringBeforeFirst(rawAction.fullyQualifiedName, '(');
        if (baseActionName !== rawAction.fullyQualifiedName) {
            const baseAnnotations = converter.rawAnnotationsPerTarget[baseActionName]?.annotations ?? [];
            rawAnnotations = rawAnnotations.concat(baseAnnotations);
        }
        return createAnnotationsObject(converter, rawAction, rawAnnotations);
    });

    return convertedAction;
}

/**
 * Converts an ActionParameter.
 *
 * @param converter   Converter
 * @param rawActionParameter  Unconverted ActionParameter
 * @returns The converted ActionParameter
 */
function convertActionParameter(
    converter: Converter,
    rawActionParameter: RawAction['parameters'][number]
): ActionParameter {
    const convertedActionParameter = rawActionParameter as ActionParameter;

    lazy(
        convertedActionParameter,
        'typeReference',
        () =>
            converter.getConvertedElement(
                rawActionParameter.type,
                findIn(converter.rawSchema.entityTypes),
                convertEntityType
            ) ??
            converter.getConvertedElement(
                rawActionParameter.type,
                findIn(converter.rawSchema.complexTypes),
                convertComplexType
            ) ??
            converter.getConvertedElement(
                rawActionParameter.type,
                findIn(converter.rawSchema.typeDefinitions),
                convertTypeDefinition
            )
    );

    lazy(convertedActionParameter, 'annotations', resolveAnnotations(converter, rawActionParameter));

    return convertedActionParameter;
}

/**
 * Converts a ComplexType.
 *
 * @param converter   Converter
 * @param rawComplexType  Unconverted ComplexType
 * @returns The converted ComplexType
 */
function convertComplexType(converter: Converter, rawComplexType: RawComplexType): ComplexType {
    const convertedComplexType = rawComplexType as ComplexType;

    lazy(convertedComplexType, 'properties', collection(converter, rawComplexType.properties, convertProperty));
    lazy(
        convertedComplexType,
        'navigationProperties',
        collection(converter, rawComplexType.navigationProperties as any, convertNavigationProperty)
    );
    lazy(convertedComplexType, 'annotations', resolveAnnotations(converter, rawComplexType));

    return convertedComplexType;
}

/**
 * Converts a TypeDefinition.
 *
 * @param converter   Converter
 * @param rawTypeDefinition  Unconverted TypeDefinition
 * @returns The converted TypeDefinition
 */
function convertTypeDefinition(converter: Converter, rawTypeDefinition: RawTypeDefinition): TypeDefinition {
    const convertedTypeDefinition = rawTypeDefinition as TypeDefinition;

    lazy(convertedTypeDefinition, 'annotations', resolveAnnotations(converter, rawTypeDefinition));

    return convertedTypeDefinition;
}

/**
 * Convert a RawMetadata into an object representation to be used to easily navigate a metadata object and its annotation.
 *
 * @param rawMetadata
 * @returns the converted representation of the metadata.
 */
export function convert(rawMetadata: RawMetadata): ConvertedMetadata {
    // fall back on the default references if the caller does not specify any
    if (rawMetadata.references.length === 0) {
        rawMetadata.references = defaultReferences;
    }

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
