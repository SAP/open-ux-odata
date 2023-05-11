import type {
    Action,
    ActionImport,
    ActionParameter,
    Annotation,
    AnnotationPath,
    AnnotationRecord,
    ArrayWithIndex,
    BaseNavigationProperty,
    ComplexType,
    ConvertedMetadata,
    EntityContainer,
    EntitySet,
    EntityType,
    Expression,
    FullyQualifiedName,
    NavigationProperty,
    NavigationPropertyPath,
    PathAnnotationExpression,
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
import { VocabularyReferences } from '@sap-ux/vocabularies-types/vocabularies/VocabularyReferences';
import {
    addGetByValue,
    alias,
    Decimal,
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
 * Append an object to the list of visited objects if it is different from the last object in the list.
 *
 * @param objectPath    The list of visited objects
 * @param visitedObject The object
 * @returns The list of visited objects
 */
function appendObjectPath(objectPath: any[], visitedObject: any): any[] {
    if (objectPath[objectPath.length - 1] !== visitedObject) {
        objectPath.push(visitedObject);
    }
    return objectPath;
}

/**
 * Resolves a (possibly relative) path.
 *
 * @param converter         Converter
 * @param startElement      The starting point in case of relative path resolution
 * @param path              The path to resolve
 * @param annotationsTerm   Only for error reporting: The annotation term
 * @returns An object containing the resolved target and the elements that were visited while getting to the target.
 */
function resolveTarget<T>(
    converter: Converter,
    startElement: any,
    path: string | undefined,
    annotationsTerm?: string
): ResolutionTarget<T> {
    if (path === undefined) {
        return { target: undefined, objectPath: [], messages: [] };
    }

    // absolute paths always start at the entity container
    if (path.startsWith('/')) {
        path = path.substring(1);
        startElement = undefined; // will resolve to the entity container (see below)
    }

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
        if (
            pathSegments[0].startsWith(`${converter.rawSchema.namespace}.`) &&
            pathSegments[0] !== converter.getConvertedEntityContainer()?.fullyQualifiedName
        ) {
            // We have a fully qualified name in the path that is not the entity container.
            startElement =
                converter.getConvertedEntityType(pathSegments[0]) ??
                converter.getConvertedComplexType(pathSegments[0]) ??
                converter.getConvertedAction(pathSegments[0]);
            pathSegments.shift(); // Let's remove the first path element
        } else {
            startElement = converter.getConvertedEntityContainer();
        }
    } else if (startElement[ANNOTATION_TARGET] !== undefined) {
        // annotation: start at the annotation target
        startElement = startElement[ANNOTATION_TARGET];
    } else if (startElement._type === 'Property') {
        // property: start at the entity type or complex type the property belongs to
        const parentElementFQN = substringBeforeFirst(startElement.fullyQualifiedName, '/');
        startElement =
            converter.getConvertedEntityType(parentElementFQN) ?? converter.getConvertedComplexType(parentElementFQN);
    }

    const result = pathSegments.reduce(
        (current: ResolutionTarget<any>, segment: string) => {
            const error = (message: string) => {
                current.messages.push({ message });
                current.target = undefined;
                return current;
            };

            if (current.target === undefined) {
                return current;
            }

            current.objectPath = appendObjectPath(current.objectPath, current.target);

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
                    subTarget.objectPath.forEach((visitedSubObject: any) => {
                        if (!current.objectPath.includes(visitedSubObject)) {
                            current.objectPath = appendObjectPath(current.objectPath, visitedSubObject);
                        }
                    });

                    current.target = subTarget.target;
                    current.objectPath = appendObjectPath(current.objectPath, current.target);
                    return current;
                }
            }

            // traverse based on the element type
            switch (current.target?._type) {
                case 'Schema':
                    // next element: EntityType, ComplexType, Action, EntityContainer ?

                    break;
                case 'EntityContainer':
                    {
                        const thisElement = current.target as EntityContainer;

                        if (segment === '' || converter.unalias(segment) === thisElement.fullyQualifiedName) {
                            return current;
                        }

                        // next element: EntitySet, Singleton or ActionImport?
                        const nextElement: EntitySet | Singleton | ActionImport | undefined =
                            thisElement.entitySets.by_name(segment) ??
                            thisElement.singletons.by_name(segment) ??
                            thisElement.actionImports.by_name(segment);

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
                    current.objectPath = result.objectPath.reduce(appendObjectPath, current.objectPath);
                    return current;
                }

                case 'EntityType':
                    {
                        const thisElement = current.target as EntityType;

                        if (segment === '' || segment === '$Type') {
                            return current;
                        }

                        const property = thisElement.entityProperties.by_name(segment);
                        if (property) {
                            current.target = property;
                            return current;
                        }

                        const navigationProperty = thisElement.navigationProperties.by_name(segment);
                        if (navigationProperty) {
                            current.target = navigationProperty;
                            return current;
                        }

                        const actionName = substringBeforeFirst(converter.unalias(segment), '(');
                        const action = thisElement.actions[actionName];
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
                    current.objectPath = result.objectPath.reduce(appendObjectPath, current.objectPath);
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

                    const nextElement =
                        thisElement.parameters[segment as any] ??
                        thisElement.parameters.find((param: ActionParameter) => param.name === segment);

                    if (nextElement) {
                        current.target = nextElement;
                        return current;
                    }
                    break;
                }

                case 'Property':
                    {
                        const thisElement = current.target as Property;

                        // Property or NavigationProperty of the ComplexType
                        const type = thisElement.targetType as ComplexType | undefined;
                        if (type !== undefined) {
                            const property = type.properties.by_name(segment);
                            if (property) {
                                current.target = property;
                                return current;
                            }

                            const navigationProperty = type.navigationProperties.by_name(segment);
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
                        const result = resolveTarget(converter, referencedType, segment);
                        current.target = result.target;
                        current.objectPath = result.objectPath.reduce(appendObjectPath, current.objectPath);
                        return current;
                    }
                    break;

                case 'NavigationProperty':
                    // continue at the NavigationProperty's target type
                    const result = resolveTarget(converter, (current.target as NavigationProperty).targetType, segment);
                    current.target = result.target;
                    current.objectPath = result.objectPath.reduce(appendObjectPath, current.objectPath);
                    return current;

                default:
                    if (segment === '') {
                        return current;
                    }

                    if (current.target[segment]) {
                        current.target = current.target[segment];
                        current.objectPath = appendObjectPath(current.objectPath, current.target);
                        return current;
                    }
            }

            return error(
                `Element '${segment}' not found at ${current.target._type} '${current.target.fullyQualifiedName}'`
            );
        },
        { target: startElement, objectPath: [], messages: [] }
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

type AnnotationValue<T> = T & { [ANNOTATION_TARGET]: any };

function mapPropertyPath(
    converter: Converter,
    propertyPath: { type: 'PropertyPath'; PropertyPath: string },
    fullyQualifiedName: FullyQualifiedName,
    currentTarget: any,
    currentTerm: string
) {
    const result: Omit<AnnotationValue<PropertyPath>, '$target'> = {
        type: 'PropertyPath',
        value: propertyPath.PropertyPath,
        fullyQualifiedName: fullyQualifiedName,
        [ANNOTATION_TARGET]: currentTarget
    };

    lazy(
        result as AnnotationValue<PropertyPath>,
        '$target',
        () => resolveTarget<Property>(converter, currentTarget, propertyPath.PropertyPath, currentTerm).target
    );

    return result as AnnotationValue<PropertyPath>;
}

function mapAnnotationPath(
    converter: Converter,
    annotationPath: { type: 'AnnotationPath'; AnnotationPath: string },
    fullyQualifiedName: FullyQualifiedName,
    currentTarget: any,
    currentTerm: string
) {
    const result: Omit<AnnotationValue<AnnotationPath<any>>, '$target'> = {
        type: 'AnnotationPath',
        value: annotationPath.AnnotationPath,
        fullyQualifiedName: fullyQualifiedName,
        [ANNOTATION_TARGET]: currentTarget
    };

    lazy(
        result as AnnotationValue<AnnotationPath<any>>,
        '$target',
        () =>
            resolveTarget(converter, currentTarget, converter.unalias(annotationPath.AnnotationPath), currentTerm)
                .target
    );

    return result as AnnotationValue<AnnotationPath<any>>;
}

function mapNavigationPropertyPath(
    converter: Converter,
    navigationPropertyPath: { type: 'NavigationPropertyPath'; NavigationPropertyPath: string },
    fullyQualifiedName: FullyQualifiedName,
    currentTarget: any,
    currentTerm: string
) {
    const result: Omit<AnnotationValue<NavigationPropertyPath>, '$target'> = {
        type: 'NavigationPropertyPath',
        value: navigationPropertyPath.NavigationPropertyPath ?? '',
        fullyQualifiedName: fullyQualifiedName,
        [ANNOTATION_TARGET]: currentTarget
    };

    lazy(
        result as AnnotationValue<NavigationPropertyPath>,
        '$target',
        () =>
            resolveTarget<NavigationProperty>(
                converter,
                currentTarget,
                navigationPropertyPath.NavigationPropertyPath,
                currentTerm
            ).target
    );

    return result as AnnotationValue<NavigationPropertyPath>;
}

function mapPath(
    converter: Converter,
    path: { type: 'Path'; Path: string },
    fullyQualifiedName: FullyQualifiedName,
    currentTarget: any,
    currentTerm: string
) {
    const result: Omit<AnnotationValue<PathAnnotationExpression<any>>, '$target'> = {
        type: 'Path',
        path: path.Path,
        fullyQualifiedName: fullyQualifiedName,
        getValue(): any {
            return undefined; // TODO: Required according to the type...
        },
        [ANNOTATION_TARGET]: currentTarget
    };

    lazy(
        result as AnnotationValue<PathAnnotationExpression<any>>,
        '$target',
        () => resolveTarget<Property>(converter, currentTarget, path.Path, currentTerm).target
    );

    return result as AnnotationValue<PathAnnotationExpression<any>>;
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
            const splitEnum = propertyValue.EnumMember.split(' ').map((enumValue) => {
                const unaliased = converter.unalias(enumValue) ?? '';
                return alias(VocabularyReferences, unaliased);
            });
            if (splitEnum[0] !== undefined && EnumIsFlag[substringBeforeFirst(splitEnum[0], '/')]) {
                return splitEnum;
            }
            return splitEnum[0];

        case 'PropertyPath':
            return mapPropertyPath(converter, propertyValue, valueFQN, currentTarget, currentTerm);

        case 'NavigationPropertyPath':
            return mapNavigationPropertyPath(converter, propertyValue, valueFQN, currentTarget, currentTerm);

        case 'AnnotationPath':
            return mapAnnotationPath(converter, propertyValue, valueFQN, currentTarget, currentTerm);

        case 'Path': {
            if (isAnnotationPath(propertyValue.Path)) {
                // inline the target
                return resolveTarget(converter, currentTarget, propertyValue.Path, currentTerm).target;
            } else {
                return mapPath(converter, propertyValue, valueFQN, currentTarget, currentTerm);
            }
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

function isDataFieldWithForAction(annotationContent: any) {
    return (
        annotationContent.hasOwnProperty('Action') &&
        (annotationContent.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction' ||
            annotationContent.$Type === 'com.sap.vocabularies.UI.v1.DataFieldWithAction')
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
    const record: any = {
        $Type: parseRecordType(converter, currentTerm, currentTarget, currentProperty, annotationRecord),
        fullyQualifiedName: currentFQN,
        [ANNOTATION_TARGET]: currentTarget,
        __source: currentSource
    };

    for (const propertyValue of annotationRecord.propertyValues) {
        lazy(record, propertyValue.name, () =>
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
    }

    // annotations on the record
    lazy(record, 'annotations', resolveAnnotationsOnAnnotation(converter, annotationRecord, record));

    if (isDataFieldWithForAction(record)) {
        lazy(record, 'ActionTarget', () => {
            const actionTargetFQN = converter.unalias(record.Action?.toString());

            // (1) Bound action of the annotation target?
            let actionTarget = currentTarget.actions?.[actionTargetFQN];

            if (!actionTarget) {
                // (2) ActionImport (= unbound action)?
                actionTarget = converter.getConvertedActionImport(actionTargetFQN)?.action;
            }

            if (!actionTarget) {
                // (3) Bound action of a different EntityType
                actionTarget = converter.getConvertedAction(actionTargetFQN);
                if (!actionTarget?.isBound) {
                    actionTarget = undefined;
                }
            }

            if (!actionTarget) {
                converter.logError(
                    `${record.fullyQualifiedName}: Unable to resolve '${record.Action}' ('${actionTargetFQN}')`
                );
            }
            return actionTarget;
        });
    }
    return record;
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
            return collectionDefinition.map((path, index) =>
                mapPropertyPath(converter, path, `${parentFQN}/${index}`, currentTarget, currentTerm)
            );

        case 'Path':
            // TODO: make lazy?
            return collectionDefinition.map((pathValue) => {
                return resolveTarget(converter, currentTarget, pathValue.Path, currentTerm).target;
            });

        case 'AnnotationPath':
            return collectionDefinition.map((path, index) =>
                mapAnnotationPath(converter, path, `${parentFQN}/${index}`, currentTarget, currentTerm)
            );

        case 'NavigationPropertyPath':
            return collectionDefinition.map((path, index) =>
                mapNavigationPropertyPath(converter, path, `${parentFQN}/${index}`, currentTarget, currentTerm)
            );

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

    annotation.term = converter.unalias(`${vocAlias}.${vocTerm}`, VocabularyReferences);
    annotation.qualifier = rawAnnotation.qualifier;
    annotation.__source = (rawAnnotation as any).__source;

    try {
        lazy(annotation, 'annotations', resolveAnnotationsOnAnnotation(converter, rawAnnotation, annotation));
    } catch (e) {
        // not an error: parseRecord() already adds annotations, but the other parseXXX functions don't, so this can happen
    }

    return annotation as Annotation;
}

/**
 * Merge annotation from different source together by overwriting at the term level.
 *
 * @param converter
 * @returns the resulting merged annotations
 */
function mergeAnnotations(converter: Converter): Record<string, Annotation[]> {
    return Object.keys(converter.rawSchema.annotations).reduceRight((annotationsPerTarget, annotationSource) => {
        for (const { target, annotations: rawAnnotations } of converter.rawSchema.annotations[annotationSource]) {
            if (!annotationsPerTarget[target]) {
                annotationsPerTarget[target] = [];
            }

            annotationsPerTarget[target].push(
                ...rawAnnotations
                    .filter(
                        (rawAnnotation) =>
                            !annotationsPerTarget[target].some(
                                (existingAnnotation) =>
                                    existingAnnotation.term === rawAnnotation.term &&
                                    existingAnnotation.qualifier === rawAnnotation.qualifier
                            )
                    )
                    .map((rawAnnotation) => {
                        let annotationFQN = `${target}@${converter.unalias(rawAnnotation.term)}`;
                        if (rawAnnotation.qualifier) {
                            annotationFQN = `${annotationFQN}#${rawAnnotation.qualifier}`;
                        }

                        const annotation = rawAnnotation as Annotation & { __source: string };
                        annotation.fullyQualifiedName = annotationFQN;
                        annotation.__source = annotationSource;
                        return annotation;
                    })
            );
        }

        return annotationsPerTarget;
    }, {} as Record<string, Annotation[]>);
}

class Converter {
    private annotationsByTarget: Record<FullyQualifiedName, Annotation[]>;

    /**
     * Get preprocessed annotations on the specified target.
     *
     * @param target    The annotation target
     * @returns An array of annotations
     */
    getAnnotations(target: FullyQualifiedName): Annotation[] {
        if (this.annotationsByTarget === undefined) {
            this.annotationsByTarget = mergeAnnotations(this);
        }

        return this.annotationsByTarget[target] ?? [];
    }

    getConvertedEntityContainer() {
        return this.getConvertedElement(
            this.rawMetadata.schema.entityContainer.fullyQualifiedName,
            this.rawMetadata.schema.entityContainer,
            convertEntityContainer
        );
    }

    getConvertedEntitySet(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.entitySets.by_fullyQualifiedName(fullyQualifiedName);
    }

    getConvertedSingleton(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.singletons.by_fullyQualifiedName(fullyQualifiedName);
    }

    getConvertedEntityType(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.entityTypes.by_fullyQualifiedName(fullyQualifiedName);
    }

    getConvertedComplexType(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.complexTypes.by_fullyQualifiedName(fullyQualifiedName);
    }

    getConvertedTypeDefinition(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.typeDefinitions.by_fullyQualifiedName(fullyQualifiedName);
    }

    getConvertedActionImport(fullyQualifiedName: FullyQualifiedName) {
        let actionImport = this.convertedOutput.actionImports.by_fullyQualifiedName(fullyQualifiedName);
        if (!actionImport) {
            actionImport = this.convertedOutput.actionImports.by_name(fullyQualifiedName);
        }
        return actionImport;
    }

    getConvertedAction(fullyQualifiedName: FullyQualifiedName) {
        return this.convertedOutput.actions.by_fullyQualifiedName(fullyQualifiedName);
    }

    convert<Converted, Raw extends RawType<Converted>>(
        rawValue: Raw,
        map: (converter: Converter, raw: Raw) => Converted
    ): () => Converted;
    convert<Converted, Raw extends RawType<Converted>, IndexProperty extends Extract<keyof Converted, string>>(
        rawValue: Raw[],
        map: (converter: Converter, raw: Raw) => Converted
    ): () => ArrayWithIndex<Converted, IndexProperty>;
    convert<Converted, Raw extends RawType<Converted>, IndexProperty extends Extract<keyof Converted, string>>(
        rawValue: Raw | Raw[],
        map: (converter: Converter, raw: Raw) => Converted
    ): (() => Converted) | (() => ArrayWithIndex<Converted, IndexProperty>) {
        if (Array.isArray(rawValue)) {
            return () => {
                const converted = rawValue.reduce((convertedElements, rawElement) => {
                    const convertedElement = this.getConvertedElement(
                        (rawElement as any).fullyQualifiedName,
                        rawElement,
                        map
                    );
                    if (convertedElement) {
                        convertedElements.push(convertedElement);
                    }
                    return convertedElements;
                }, [] as Converted[]);
                addGetByValue(converted, 'name' as any);
                addGetByValue(converted, 'fullyQualifiedName' as any);
                return converted as ArrayWithIndex<Converted, IndexProperty>;
            };
        } else {
            return () => this.getConvertedElement(rawValue.fullyQualifiedName, rawValue, map)!;
        }
    }

    private rawMetadata: RawMetadata;
    private convertedElements: Map<FullyQualifiedName, any> = new Map();
    private convertedOutput: ConvertedMetadata;

    rawSchema: RawSchema;

    constructor(rawMetadata: RawMetadata, convertedOutput: ConvertedMetadata) {
        this.rawMetadata = rawMetadata;
        this.rawSchema = rawMetadata.schema;
        this.convertedOutput = convertedOutput;
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

    /**
     * Split the alias from the term value.
     *
     * @param term the value of the term
     * @returns the term alias and the actual term value
     */
    splitTerm(term: string) {
        const aliased = alias(VocabularyReferences, term);
        return splitAtLast(aliased, '.');
    }

    unalias(value: string | undefined, references = this.rawMetadata.references) {
        return unalias(references, value, this.rawSchema.namespace) ?? '';
    }
}

type RawType<T> = RemoveAnnotationAndType<T> & { fullyQualifiedName: FullyQualifiedName };

function resolveEntityType(converter: Converter, fullyQualifiedName: FullyQualifiedName) {
    return () => {
        let entityType = converter.getConvertedEntityType(fullyQualifiedName);

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
                    resolvedBindingTarget = converter.getConvertedSingleton(rawBindingTarget.fullyQualifiedName);
                } else {
                    resolvedBindingTarget = converter.getConvertedEntitySet(rawBindingTarget.fullyQualifiedName);
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
    const nestedAnnotations = rawAnnotationTarget.annotations;

    return () =>
        createAnnotationsObject(
            converter,
            rawAnnotationTarget,
            nestedAnnotations ?? converter.getAnnotations(rawAnnotationTarget.fullyQualifiedName)
        );
}

function resolveAnnotationsOnAnnotation(
    converter: Converter,
    annotationRecord: AnnotationRecord | RawAnnotation,
    annotationTerm: any
) {
    return () => {
        const currentFQN = annotationTerm.fullyQualifiedName;

        // be graceful when resolving annotations on annotations: Sometimes they are referenced directly, sometimes they
        // are part of the global annotations list
        let annotations;
        if (annotationRecord.annotations && annotationRecord.annotations.length > 0) {
            annotations = annotationRecord.annotations;
        } else {
            annotations = converter.getAnnotations(currentFQN);
        }

        annotations?.forEach((annotation: any) => {
            annotation.target = currentFQN;
            annotation.__source = annotationTerm.__source;
            annotation[ANNOTATION_TARGET] = annotationTerm[ANNOTATION_TARGET];
            annotation.fullyQualifiedName = `${currentFQN}@${annotation.term}`;
        });

        return createAnnotationsObject(converter, annotationTerm, annotations ?? []);
    };
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

    lazy(convertedEntityContainer, 'entitySets', converter.convert(converter.rawSchema.entitySets, convertEntitySet));

    lazy(convertedEntityContainer, 'singletons', converter.convert(converter.rawSchema.singletons, convertSingleton));

    lazy(
        convertedEntityContainer,
        'actionImports',
        converter.convert(converter.rawSchema.actionImports, convertActionImport)
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

    lazy(convertedEntityType, 'keys', converter.convert(rawEntityType.keys, convertProperty));
    lazy(convertedEntityType, 'entityProperties', converter.convert(rawEntityType.entityProperties, convertProperty));
    lazy(
        convertedEntityType,
        'navigationProperties',
        converter.convert(rawEntityType.navigationProperties as any[], convertNavigationProperty)
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
                actions[name] = converter.getConvertedAction(rawAction.fullyQualifiedName)!;
                return actions;
            }, {} as EntityType['actions'])
    );

    convertedEntityType.resolvePath = (relativePath: string, includeVisitedObjects?: boolean) => {
        const resolved = resolveTarget(converter, rawEntityType, relativePath);
        if (includeVisitedObjects) {
            return { target: resolved.target, visitedObjects: resolved.objectPath, messages: resolved.messages };
        } else {
            return resolved.target;
        }
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

    lazy(convertedProperty, 'annotations', resolveAnnotations(converter, rawProperty));

    lazy(convertedProperty, 'targetType', () => {
        const type = rawProperty.type;
        const typeName = type.startsWith('Collection') ? type.substring(11, type.length - 1) : type;

        return converter.getConvertedComplexType(typeName) ?? converter.getConvertedTypeDefinition(typeName);
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

    if (!isV4NavigationProperty(rawNavigationProperty)) {
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

    lazy(convertedActionImport, 'annotations', resolveAnnotations(converter, rawActionImport));

    lazy(convertedActionImport, 'action', () => converter.getConvertedAction(rawActionImport.actionName));

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

    if (convertedAction.sourceType) {
        lazy(convertedAction, 'sourceEntityType', resolveEntityType(converter, rawAction.sourceType));
    }

    if (convertedAction.returnType) {
        lazy(convertedAction, 'returnEntityType', resolveEntityType(converter, rawAction.returnType));
    }

    lazy(convertedAction, 'parameters', converter.convert(rawAction.parameters, convertActionParameter));

    lazy(convertedAction, 'annotations', () => {
        const action = substringBeforeFirst(rawAction.fullyQualifiedName, '(');

        // if the action is unbound (e.g. "myAction"), the annotation target is "myAction()"
        const annotationTargetFQN = rawAction.isBound
            ? rawAction.fullyQualifiedName
            : `${rawAction.fullyQualifiedName}()`;

        const rawAnnotations = converter.getAnnotations(annotationTargetFQN);
        const baseAnnotations = converter.getAnnotations(action);

        for (const baseAnnotation of baseAnnotations) {
            if (
                !rawAnnotations.some(
                    (annotation) =>
                        annotation.term === baseAnnotation.term && annotation.qualifier === baseAnnotation.qualifier
                )
            ) {
                rawAnnotations.push(baseAnnotation);
            }
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
            converter.getConvertedEntityType(rawActionParameter.type) ??
            converter.getConvertedComplexType(rawActionParameter.type) ??
            converter.getConvertedTypeDefinition(rawActionParameter.type)
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

    lazy(convertedComplexType, 'properties', converter.convert(rawComplexType.properties, convertProperty));
    lazy(
        convertedComplexType,
        'navigationProperties',
        converter.convert(rawComplexType.navigationProperties as any[], convertNavigationProperty)
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

function getReferences(rawMetadataReferences: Reference[]) {
    if (rawMetadataReferences.length === 0) {
        return VocabularyReferences;
    }

    // the provided references must be unique
    const violations = rawMetadataReferences.filter((reference) =>
        rawMetadataReferences.some(
            (otherReference) =>
                otherReference !== reference &&
                (otherReference.alias === reference.alias || otherReference.namespace === reference.namespace)
        )
    );

    if (violations.length) {
        throw new Error(`Non-unique references:\n${JSON.stringify(violations, null, 2)}`);
    }

    const references = [...rawMetadataReferences];
    for (const defaultReference of VocabularyReferences) {
        if (
            !references.some(
                (reference) =>
                    reference.namespace === defaultReference.namespace || reference.alias === defaultReference.alias
            )
        ) {
            references.push(defaultReference);
        }
    }
    return references;
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
        diagnostics: []
    } as any;

    // Converter
    const converter = new Converter(rawMetadata, convertedOutput);

    lazy(convertedOutput, 'references', () => getReferences(rawMetadata.references));

    lazy(
        convertedOutput,
        'entityContainer',
        converter.convert(converter.rawSchema.entityContainer, convertEntityContainer)
    );
    lazy(convertedOutput, 'entitySets', converter.convert(converter.rawSchema.entitySets, convertEntitySet));
    lazy(convertedOutput, 'singletons', converter.convert(converter.rawSchema.singletons, convertSingleton));
    lazy(convertedOutput, 'entityTypes', converter.convert(converter.rawSchema.entityTypes, convertEntityType));
    lazy(convertedOutput, 'actions', converter.convert(converter.rawSchema.actions, convertAction));
    lazy(convertedOutput, 'complexTypes', converter.convert(converter.rawSchema.complexTypes, convertComplexType));
    lazy(convertedOutput, 'actionImports', converter.convert(converter.rawSchema.actionImports, convertActionImport));
    lazy(
        convertedOutput,
        'typeDefinitions',
        converter.convert(converter.rawSchema.typeDefinitions, convertTypeDefinition)
    );

    convertedOutput.resolvePath = function resolvePath<T>(path: string): ResolutionTarget<T> {
        const targetResolution = resolveTarget<T>(converter, undefined, path);
        if (targetResolution.target) {
            appendObjectPath(targetResolution.objectPath, targetResolution.target);
        }
        return targetResolution;
    };

    return convertedOutput;
}
