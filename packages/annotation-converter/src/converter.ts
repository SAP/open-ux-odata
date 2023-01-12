import type {
    AnnotationList,
    AnnotationRecord,
    Expression,
    PathExpression,
    PropertyValue,
    RawMetadata,
    Reference,
    ComplexType,
    TypeDefinition,
    RawProperty,
    Annotation,
    Action,
    EntityType,
    RawEntityType,
    RawAssociation,
    NavigationProperty,
    BaseNavigationProperty,
    RawV4NavigationProperty,
    RawV2NavigationProperty,
    EntitySet,
    Property,
    Singleton,
    RawComplexType,
    ConvertedMetadata,
    ResolutionTarget,
    EntityContainer,
    RawAnnotation,
    ActionImport
} from '@sap-ux/vocabularies-types';
import type { ReferencesWithMap } from './utils';
import { alias, Decimal, defaultReferences, EnumIsFlag, isComplexTypeDefinition, TermToTypes, unalias } from './utils';

/**
 *
 */
class Path {
    path: string;
    $target: string;
    type: string;
    annotationsTerm: string;
    annotationType: string;
    term: string;

    /**
     * @param pathExpression
     * @param targetName
     * @param annotationsTerm
     * @param term
     */
    constructor(pathExpression: PathExpression, targetName: string, annotationsTerm: string, term: string) {
        this.path = pathExpression.Path;
        this.type = 'Path';
        this.$target = targetName;
        this.term = term;
        this.annotationsTerm = annotationsTerm;
    }
}

/**
 * Creates a Map based on the fullyQualifiedName of each object part of the metadata.
 *
 * @param rawMetadata the rawMetadata we're working against
 * @returns the objectmap for easy access to the different object of the metadata
 */
function buildObjectMap(rawMetadata: RawMetadata): Record<string, any> {
    const objectMap: any = {};
    if (rawMetadata.schema.entityContainer?.fullyQualifiedName) {
        objectMap[rawMetadata.schema.entityContainer.fullyQualifiedName] = rawMetadata.schema.entityContainer;
    }
    for (const entitySet of rawMetadata.schema.entitySets) {
        objectMap[entitySet.fullyQualifiedName] = entitySet;
    }
    for (const singleton of rawMetadata.schema.singletons) {
        objectMap[singleton.fullyQualifiedName] = singleton;
    }
    for (const action of rawMetadata.schema.actions) {
        objectMap[action.fullyQualifiedName] = action;
        if (action.isBound) {
            const unBoundActionName = action.fullyQualifiedName.split('(')[0];
            if (!objectMap[unBoundActionName]) {
                objectMap[unBoundActionName] = {
                    _type: 'UnboundGenericAction',
                    actions: []
                };
            }
            objectMap[unBoundActionName].actions.push(action);
            const actionSplit = action.fullyQualifiedName.split('(');
            objectMap[`${actionSplit[1].split(')')[0]}/${actionSplit[0]}`] = action;
        }

        for (const parameter of action.parameters) {
            objectMap[parameter.fullyQualifiedName] = parameter;
        }
    }
    for (const actionImport of rawMetadata.schema.actionImports) {
        objectMap[actionImport.fullyQualifiedName] = actionImport;
    }
    for (const complexType of rawMetadata.schema.complexTypes) {
        objectMap[complexType.fullyQualifiedName] = complexType;
        for (const property of complexType.properties) {
            objectMap[property.fullyQualifiedName] = property;
        }
    }
    for (const typeDefinition of rawMetadata.schema.typeDefinitions) {
        objectMap[typeDefinition.fullyQualifiedName] = typeDefinition;
    }
    for (const entityType of rawMetadata.schema.entityTypes) {
        (entityType as EntityType).annotations = {}; // 'annotations' property is mandatory
        objectMap[entityType.fullyQualifiedName] = entityType;
        objectMap[`Collection(${entityType.fullyQualifiedName})`] = entityType;
        for (const property of entityType.entityProperties) {
            objectMap[property.fullyQualifiedName] = property;
            // Handle complex types
            const complexTypeDefinition = objectMap[property.type] as ComplexType | TypeDefinition;
            if (isComplexTypeDefinition(complexTypeDefinition)) {
                for (const complexTypeProp of complexTypeDefinition.properties) {
                    const complexTypePropTarget: RawProperty = Object.assign(complexTypeProp, {
                        _type: 'Property',
                        fullyQualifiedName: property.fullyQualifiedName + '/' + complexTypeProp.name
                    });
                    objectMap[complexTypePropTarget.fullyQualifiedName] = complexTypePropTarget;
                }
            }
        }
        for (const navProperty of entityType.navigationProperties) {
            objectMap[navProperty.fullyQualifiedName] = navProperty;
        }
    }

    for (const annotationSource of Object.keys(rawMetadata.schema.annotations)) {
        for (const annotationList of rawMetadata.schema.annotations[annotationSource]) {
            const currentTargetName = unalias(rawMetadata.references, annotationList.target);
            annotationList.annotations.forEach((annotation) => {
                let annotationFQN = `${currentTargetName}@${unalias(rawMetadata.references, annotation.term)}`;
                if (annotation.qualifier) {
                    annotationFQN += `#${annotation.qualifier}`;
                }
                objectMap[annotationFQN] = annotation;
                (annotation as Annotation).fullyQualifiedName = annotationFQN;
            });
        }
    }
    return objectMap;
}

/**
 * Combine two strings representing path in the metamodel while ensuring their specificities (annotation...) are respected.
 *
 * @param currentTarget the current path
 * @param path the part we want to append
 * @returns the complete path including the extension.
 */
function combinePath(currentTarget: string, path: string): string {
    if (path.startsWith('@')) {
        return currentTarget + unalias(defaultReferences, path);
    } else {
        return currentTarget + '/' + path;
    }
}

const ALL_ANNOTATION_ERRORS: any = {};
let ANNOTATION_ERRORS: { message: string }[] = [];

/**
 * @param path
 * @param oErrorMsg
 */
function addAnnotationErrorMessage(path: string, oErrorMsg: any) {
    if (!ALL_ANNOTATION_ERRORS[path]) {
        ALL_ANNOTATION_ERRORS[path] = [oErrorMsg];
    } else {
        ALL_ANNOTATION_ERRORS[path].push(oErrorMsg);
    }
}

/**
 * Resolves a specific path based on the objectMap.
 *
 * @param objectMap
 * @param currentTarget
 * @param path
 * @param pathOnly
 * @param includeVisitedObjects
 * @param annotationsTerm
 * @returns the resolved object
 */
function _resolveTarget(
    objectMap: any,
    currentTarget: any,
    path: string,
    pathOnly: boolean = false,
    includeVisitedObjects: boolean = false,
    annotationsTerm?: string
) {
    let oErrorMsg;
    if (!path) {
        return undefined;
    }
    const aVisitedObjects: any[] = [];
    if (currentTarget && currentTarget._type === 'Property') {
        currentTarget = objectMap[currentTarget.fullyQualifiedName.split('/')[0]];
    }
    path = combinePath(currentTarget.fullyQualifiedName, path);

    const pathSplit = path.split('/');
    const targetPathSplit: string[] = [];
    pathSplit.forEach((pathPart) => {
        // Separate out the annotation
        if (pathPart.indexOf('@') !== -1) {
            const [splittedPath, annotationPath] = pathPart.split('@');
            targetPathSplit.push(splittedPath);
            targetPathSplit.push(`@${annotationPath}`);
        } else {
            targetPathSplit.push(pathPart);
        }
    });
    let currentPath = path;
    let currentContext = currentTarget;
    const target = targetPathSplit.reduce((currentValue: any, pathPart) => {
        if (pathPart === '$Type' && currentValue._type === 'EntityType') {
            return currentValue;
        }
        if (pathPart === '$' && currentValue._type === 'EntitySet') {
            return currentValue;
        }
        if ((pathPart === '@$ui5.overload' || pathPart === '0') && currentValue._type === 'Action') {
            return currentValue;
        }
        if (pathPart.length === 0) {
            // Empty Path after an entitySet means entityType
            if (
                currentValue &&
                (currentValue._type === 'EntitySet' || currentValue._type === 'Singleton') &&
                currentValue.entityType
            ) {
                if (includeVisitedObjects) {
                    aVisitedObjects.push(currentValue);
                }
                currentValue = currentValue.entityType;
            }
            if (currentValue && currentValue._type === 'NavigationProperty' && currentValue.targetType) {
                if (includeVisitedObjects) {
                    aVisitedObjects.push(currentValue);
                }
                currentValue = currentValue.targetType;
            }
            return currentValue;
        }
        if (includeVisitedObjects && currentValue !== null && currentValue !== undefined) {
            aVisitedObjects.push(currentValue);
        }
        if (!currentValue) {
            currentPath = pathPart;
        } else if ((currentValue._type === 'EntitySet' || currentValue._type === 'Singleton') && pathPart === '$Type') {
            currentValue = currentValue.targetType;
            return currentValue;
        } else if (
            (currentValue._type === 'EntitySet' || currentValue._type === 'Singleton') &&
            pathPart === '$NavigationPropertyBinding'
        ) {
            currentValue = currentValue.navigationPropertyBinding;
            return currentValue;
        } else if (
            (currentValue._type === 'EntitySet' || currentValue._type === 'Singleton') &&
            currentValue.entityType
        ) {
            currentPath = combinePath(currentValue.entityTypeName, pathPart);
        } else if (currentValue._type === 'NavigationProperty') {
            currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);
            if (!objectMap[currentPath]) {
                // Fallback log error
                currentPath = combinePath(currentValue.targetTypeName, pathPart);
            }
        } else if (currentValue._type === 'Property') {
            // ComplexType or Property
            if (currentValue.targetType) {
                currentPath = combinePath(currentValue.targetType.fullyQualifiedName, pathPart);
            } else {
                currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);
            }
        } else if (currentValue._type === 'Action' && currentValue.isBound) {
            currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);
            if (pathPart === '$Parameter') {
                return currentValue.parameters;
            }

            if (!objectMap[currentPath]) {
                currentPath = combinePath(currentValue.sourceType, pathPart);
            }
        } else if (currentValue._type === 'ActionParameter') {
            currentPath = combinePath(
                currentTarget.fullyQualifiedName.substring(0, currentTarget.fullyQualifiedName.lastIndexOf('/')),
                pathPart
            );
            if (!objectMap[currentPath]) {
                let lastIdx = currentTarget.fullyQualifiedName.lastIndexOf('/');
                if (lastIdx === -1) {
                    lastIdx = currentTarget.fullyQualifiedName.length;
                }
                currentPath = combinePath(
                    (objectMap[currentTarget.fullyQualifiedName.substring(0, lastIdx)] as Action).sourceType,
                    pathPart
                );
            }
        } else {
            currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);
            if (pathPart !== 'name' && currentValue[pathPart] !== undefined) {
                return currentValue[pathPart];
            } else if (pathPart === '$AnnotationPath' && currentValue.$target) {
                const contextToResolve = objectMap[currentValue.fullyQualifiedName.split('@')[0]];
                const subTarget: any = _resolveTarget(objectMap, contextToResolve, currentValue.value, false, true);
                subTarget.visitedObjects.forEach((visitedSubObject: any) => {
                    if (aVisitedObjects.indexOf(visitedSubObject) === -1) {
                        aVisitedObjects.push(visitedSubObject);
                    }
                });
                return subTarget.target;
            } else if (pathPart === '$Path' && currentValue.$target) {
                currentContext = aVisitedObjects
                    .concat()
                    .reverse()
                    .find(
                        (obj) =>
                            obj._type === 'EntityType' ||
                            obj._type === 'EntitySet' ||
                            obj._type === 'Singleton' ||
                            obj._type === 'NavigationProperty'
                    );
                if (currentContext) {
                    const subTarget: any = _resolveTarget(objectMap, currentContext, currentValue.path, false, true);
                    subTarget.visitedObjects.forEach((visitedSubObject: any) => {
                        if (aVisitedObjects.indexOf(visitedSubObject) === -1) {
                            aVisitedObjects.push(visitedSubObject);
                        }
                    });
                    return subTarget.target;
                }
                return currentValue.$target;
            } else if (pathPart.startsWith('$Path') && currentValue.$target) {
                const intermediateTarget = currentValue.$target;
                currentPath = combinePath(intermediateTarget.fullyQualifiedName, pathPart.substring(5));
            } else if (currentValue.hasOwnProperty('$Type') && !objectMap[currentPath]) {
                // This is now an annotation value
                const entityType = objectMap[currentValue.fullyQualifiedName.split('@')[0]];
                if (entityType) {
                    currentPath = combinePath(entityType.fullyQualifiedName, pathPart);
                }
            }
        }
        return objectMap[currentPath];
    }, null);
    if (!target) {
        if (annotationsTerm) {
            const annotationType = inferTypeFromTerm(annotationsTerm, currentTarget);
            oErrorMsg = {
                message:
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
            };
            addAnnotationErrorMessage(path, oErrorMsg);
        } else {
            oErrorMsg = {
                message:
                    'Unable to resolve the path expression: ' +
                    path +
                    '\n' +
                    '\n' +
                    'Hint: Check and correct the path values under the following structure in the metadata (annotation.xml file or CDS annotations for the application): \n\n' +
                    '<Annotation Term = ' +
                    pathSplit[0] +
                    '>' +
                    '\n' +
                    '<PropertyValue  Path= ' +
                    pathSplit[1] +
                    '>'
            };
            addAnnotationErrorMessage(path, oErrorMsg);
        }
    }
    if (pathOnly) {
        return currentPath;
    }
    if (includeVisitedObjects) {
        return {
            visitedObjects: aVisitedObjects,
            target: target
        };
    }
    return target;
}

/**
 * Typeguard to check if the path contains an annotation.
 *
 * @param pathStr the path to evaluate
 * @returns true if there is an annotation in the path.
 */
function isAnnotationPath(pathStr: string): boolean {
    return pathStr.indexOf('@') !== -1;
}

function parseValue(propertyValue: Expression, valueFQN: string, objectMap: any, context: ConversionContext) {
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
            const aliasedEnum = alias(context.rawMetadata.references, propertyValue.EnumMember);
            const splitEnum = aliasedEnum.split(' ');
            if (splitEnum[0]) {
                if (EnumIsFlag[splitEnum[0].split('/')[0]]) {
                    return splitEnum;
                }
            }
            return aliasedEnum;

        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                value: propertyValue.PropertyPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    objectMap,
                    context.currentTarget,
                    propertyValue.PropertyPath,
                    false,
                    false,
                    context.currentTerm
                )
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                value: propertyValue.NavigationPropertyPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    objectMap,
                    context.currentTarget,
                    propertyValue.NavigationPropertyPath,
                    false,
                    false,
                    context.currentTerm
                )
            };
        case 'AnnotationPath':
            const annotationTarget = _resolveTarget(
                objectMap,
                context.currentTarget,
                unalias(context.rawMetadata.references, propertyValue.AnnotationPath) as string,
                true,
                false,
                context.currentTerm
            );
            const annotationPath = {
                type: 'AnnotationPath',
                value: propertyValue.AnnotationPath,
                fullyQualifiedName: valueFQN,
                $target: annotationTarget,
                annotationsTerm: context.currentTerm,
                term: '',
                path: ''
            };
            context.unresolvedAnnotations.push({ inline: false, toResolve: annotationPath });
            return annotationPath;
        case 'Path':
            const $target = _resolveTarget(
                objectMap,
                context.currentTarget,
                propertyValue.Path,
                true,
                false,
                context.currentTerm
            );
            const path = new Path(propertyValue, $target, context.currentTerm, '');
            context.unresolvedAnnotations.push({
                inline: isAnnotationPath(propertyValue.Path),
                toResolve: path
            });
            return path;

        case 'Record':
            return parseRecord(propertyValue.Record, valueFQN, objectMap, context);
        case 'Collection':
            return parseCollection(propertyValue.Collection, valueFQN, objectMap, context);
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
function inferTypeFromTerm(annotationsTerm: string, annotationTarget: string, currentProperty?: string) {
    let targetType = (TermToTypes as any)[annotationsTerm];
    if (currentProperty) {
        annotationsTerm = annotationsTerm.split('.').slice(0, -1).join('.') + '.' + currentProperty;
        targetType = (TermToTypes as any)[annotationsTerm];
    }
    const oErrorMsg = {
        isError: false,
        message: `The type of the record used within the term ${annotationsTerm} was not defined and was inferred as ${targetType}.
Hint: If possible, try to maintain the Type property for each Record.
<Annotations Target="${annotationTarget}">
	<Annotation Term="${annotationsTerm}">
		<Record>...</Record>
	</Annotation>
</Annotations>`
    };
    addAnnotationErrorMessage(annotationTarget + '/' + annotationsTerm, oErrorMsg);
    return targetType;
}

function isDataFieldWithForAction(annotationContent: any, annotationTerm: any) {
    return (
        annotationContent.hasOwnProperty('Action') &&
        (annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction' ||
            annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldWithAction')
    );
}

function parseRecordType(recordDefinition: AnnotationRecord, context: ConversionContext) {
    let targetType;
    if (!recordDefinition.type && context.currentTerm) {
        targetType = inferTypeFromTerm(
            context.currentTerm,
            context.currentTarget.fullyQualifiedName,
            context.currentProperty
        );
    } else {
        targetType = unalias(context.rawMetadata.references, recordDefinition.type);
    }
    return targetType;
}

function parseRecord(
    recordDefinition: AnnotationRecord,
    currentFQN: string,
    objectMap: any,
    context: ConversionContext
) {
    const targetType = parseRecordType(recordDefinition, context);

    const annotationTerm: any = {
        $Type: targetType,
        fullyQualifiedName: currentFQN,
        annotations: {}
    };
    const annotationContent: any = {};
    if (Array.isArray(recordDefinition.annotations)) {
        const subAnnotationList = {
            target: currentFQN,
            annotations: recordDefinition.annotations,
            __source: context.currentSource
        };
        context.additionalAnnotations.push(subAnnotationList);
    }
    if (recordDefinition.propertyValues) {
        recordDefinition.propertyValues.forEach((propertyValue: PropertyValue) => {
            context.currentProperty = propertyValue.name;
            annotationContent[propertyValue.name] = parseValue(
                propertyValue.value,
                `${currentFQN}/${propertyValue.name}`,
                objectMap,
                context
            );
            if (Array.isArray(propertyValue.annotations)) {
                const subAnnotationList = {
                    target: `${currentFQN}/${propertyValue.name}`,
                    annotations: propertyValue.annotations,
                    __source: context.currentSource
                };
                context.additionalAnnotations.push(subAnnotationList);
            }
            if (isDataFieldWithForAction(annotationContent, annotationTerm)) {
                // try to resolve to a bound action of the annotation target
                annotationContent.ActionTarget = context.currentTarget.actions?.[annotationContent.Action];

                if (!annotationContent.ActionTarget) {
                    const action = objectMap[annotationContent.Action];
                    if (action?.isBound) {
                        // bound action of a different entity type
                        annotationContent.ActionTarget = action;
                    } else if (action) {
                        // unbound action --> resolve via the action import
                        annotationContent.ActionTarget = action.action;
                    }
                }

                if (!annotationContent.ActionTarget) {
                    // Add to diagnostics debugger;
                    ANNOTATION_ERRORS.push({
                        message:
                            'Unable to resolve the action ' +
                            annotationContent.Action +
                            ' defined for ' +
                            annotationTerm.fullyQualifiedName
                    });
                }
            }
        });
        context.currentProperty = undefined;
    }
    return Object.assign(annotationTerm, annotationContent);
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

function parseCollection(collectionDefinition: any[], parentFQN: string, objectMap: any, context: ConversionContext) {
    const collectionDefinitionType = getOrInferCollectionType(collectionDefinition);
    switch (collectionDefinitionType) {
        case 'PropertyPath':
            return collectionDefinition.map((propertyPath, propertyIdx) => {
                return {
                    type: 'PropertyPath',
                    value: propertyPath.PropertyPath,
                    fullyQualifiedName: `${parentFQN}/${propertyIdx}`,
                    $target: _resolveTarget(
                        objectMap,
                        context.currentTarget,
                        propertyPath.PropertyPath,
                        false,
                        false,
                        context.currentTerm
                    )
                };
            });
        case 'Path':
            return collectionDefinition.map((pathValue) => {
                const $target = _resolveTarget(
                    objectMap,
                    context.currentTarget,
                    pathValue.Path,
                    true,
                    false,
                    context.currentTerm
                );
                const path = new Path(pathValue, $target, context.currentTerm, '');
                context.unresolvedAnnotations.push({
                    inline: isAnnotationPath(pathValue.Path),
                    toResolve: path
                });
                return path;
            });
        case 'AnnotationPath':
            return collectionDefinition.map((annotationPath, annotationIdx) => {
                const annotationTarget = _resolveTarget(
                    objectMap,
                    context.currentTarget,
                    annotationPath.AnnotationPath,
                    true,
                    false,
                    context.currentTerm
                );
                const annotationCollectionElement = {
                    type: 'AnnotationPath',
                    value: annotationPath.AnnotationPath,
                    fullyQualifiedName: `${parentFQN}/${annotationIdx}`,
                    $target: annotationTarget,
                    annotationsTerm: context.currentTerm,
                    term: '',
                    path: ''
                };
                context.unresolvedAnnotations.push({
                    inline: false,
                    toResolve: annotationCollectionElement
                });
                return annotationCollectionElement;
            });
        case 'NavigationPropertyPath':
            return collectionDefinition.map((navPropertyPath, navPropIdx) => {
                return {
                    type: 'NavigationPropertyPath',
                    value: navPropertyPath.NavigationPropertyPath,
                    fullyQualifiedName: `${parentFQN}/${navPropIdx}`,
                    $target: _resolveTarget(
                        objectMap,
                        context.currentTarget,
                        navPropertyPath.NavigationPropertyPath,
                        false,
                        false,
                        context.currentTerm
                    )
                };
            });
        case 'Record':
            return collectionDefinition.map((recordDefinition, recordIdx) => {
                return parseRecord(recordDefinition, `${parentFQN}/${recordIdx}`, objectMap, context);
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
            return collectionDefinition.map((ifValue) => {
                return ifValue;
            });
        case 'String':
            return collectionDefinition.map((stringValue) => {
                if (typeof stringValue === 'string') {
                    return stringValue;
                } else if (stringValue === undefined) {
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

type Resolveable = {
    inline: boolean;
    toResolve: {
        $target: string;
        targetString?: string;
        annotationsTerm?: string;
        annotationType?: string;
        term: string;
        path: string;
    };
};

function convertAnnotation(annotation: Annotation, objectMap: any, context: ConversionContext): any {
    if (annotation.record) {
        return parseRecord(annotation.record, annotation.fullyQualifiedName, objectMap, context);
    } else if (annotation.collection === undefined) {
        if (annotation.value) {
            return parseValue(annotation.value, annotation.fullyQualifiedName, objectMap, context);
        } else {
            return true;
        }
    } else if (annotation.collection) {
        const collection: any = parseCollection(
            annotation.collection,
            annotation.fullyQualifiedName,
            objectMap,
            context
        );
        collection.fullyQualifiedName = annotation.fullyQualifiedName;
        return collection;
    } else {
        throw new Error('Unsupported case');
    }
}

/**
 * Creates a resolvePath function for a given entityType.
 *
 * @param entityType The entityType for which the function should be created
 * @param objectMap The current objectMap
 * @returns the resolvePath function that starts at the entityType
 */
function createResolvePathFn(entityType: EntityType, objectMap: Record<string, any>) {
    return function (relativePath: string, includeVisitedObjects: boolean): any {
        const annotationTerm: string = '';
        return _resolveTarget(objectMap, entityType, relativePath, false, includeVisitedObjects, annotationTerm);
    };
}

function resolveV2NavigationProperty(
    navProp: RawV2NavigationProperty,
    associations: RawAssociation[],
    objectMap: Record<string, any>,
    outNavProp: NavigationProperty
): void {
    const targetAssociation = associations.find(
        (association) => association.fullyQualifiedName === navProp.relationship
    );
    if (targetAssociation) {
        const associationEnd = targetAssociation.associationEnd.find((end) => end.role === navProp.toRole);
        if (associationEnd) {
            outNavProp.targetType = objectMap[associationEnd.type];
            outNavProp.isCollection = associationEnd.multiplicity === '*';
        }
    }
    outNavProp.referentialConstraint = navProp.referentialConstraint || [];
}

function resolveV4NavigationProperty(
    navProp: RawV4NavigationProperty,
    objectMap: Record<string, any>,
    outNavProp: NavigationProperty
): void {
    outNavProp.targetType = objectMap[navProp.targetTypeName];
    outNavProp.partner = navProp.partner;
    outNavProp.isCollection = navProp.isCollection;
    outNavProp.containsTarget = navProp.containsTarget;
    outNavProp.referentialConstraint = navProp.referentialConstraint;
}

function isV4NavigationProperty(
    navProp: RawV2NavigationProperty | RawV4NavigationProperty
): navProp is RawV4NavigationProperty {
    return !!(navProp as BaseNavigationProperty).targetTypeName;
}

function prepareNavigationProperties(
    navigationProperties: (RawV4NavigationProperty | RawV2NavigationProperty)[],
    associations: RawAssociation[],
    objectMap: Record<string, any>
) {
    return navigationProperties.map((navProp) => {
        const outNavProp: NavigationProperty = {
            _type: 'NavigationProperty',
            name: navProp.name,
            fullyQualifiedName: navProp.fullyQualifiedName,
            isCollection: false,
            containsTarget: false,
            referentialConstraint: [],
            annotations: {},
            partner: '',
            targetType: undefined as any,
            targetTypeName: ''
        };
        if (isV4NavigationProperty(navProp)) {
            resolveV4NavigationProperty(navProp, objectMap, outNavProp);
        } else {
            resolveV2NavigationProperty(navProp, associations, objectMap, outNavProp);
        }
        if (outNavProp.targetType) {
            outNavProp.targetTypeName = outNavProp.targetType.fullyQualifiedName;
        }
        objectMap[outNavProp.fullyQualifiedName] = outNavProp;
        return outNavProp;
    });
}

/**
 * @param entityTypes
 * @param associations
 * @param objectMap
 */
function resolveNavigationProperties(
    entityTypes: RawEntityType[],
    associations: RawAssociation[],
    objectMap: Record<string, any>
): void {
    entityTypes.forEach((entityType) => {
        entityType.navigationProperties = prepareNavigationProperties(
            entityType.navigationProperties,
            associations,
            objectMap
        );
        (entityType as EntityType).resolvePath = createResolvePathFn(entityType as EntityType, objectMap);
    });
}

/**
 * @param namespace
 * @param actions
 * @param objectMap
 */
function linkActionsToEntityType(namespace: string, actions: Action[], objectMap: Record<string, any>): void {
    actions.forEach((action) => {
        if (!action.annotations) {
            action.annotations = {};
        }
        if (action.isBound) {
            const sourceEntityType = objectMap[action.sourceType];
            action.sourceEntityType = sourceEntityType;
            if (sourceEntityType) {
                if (!sourceEntityType.actions) {
                    sourceEntityType.actions = {};
                }
                sourceEntityType.actions[`${namespace}.${action.name}`] = action;
            }
            action.returnEntityType = objectMap[action.returnType];
        }
    });
}

function linkActionImportsToActions(actionImports: ActionImport[], objectMap: Record<string, any>): void {
    actionImports.forEach((actionImport) => {
        actionImport.action = objectMap[actionImport.actionName];
    });
}

/**
 * @param entitySets
 * @param objectMap
 * @param references
 */
function linkEntityTypeToEntitySet(
    entitySets: EntitySet[],
    objectMap: Record<string, any>,
    references: ReferencesWithMap
): void {
    entitySets.forEach((entitySet) => {
        entitySet.entityType = objectMap[entitySet.entityTypeName];
        if (!entitySet.entityType) {
            entitySet.entityType = objectMap[unalias(references, entitySet.entityTypeName) as string];
        }
        if (!entitySet.annotations) {
            entitySet.annotations = {};
        }
        if (!entitySet.entityType.annotations) {
            entitySet.entityType.annotations = {};
        }
        entitySet.entityType.keys.forEach((keyProp: Property) => {
            keyProp.isKey = true;
        });
    });
}

/**
 * @param singletons
 * @param objectMap
 * @param references
 */
function linkEntityTypeToSingleton(
    singletons: Singleton[],
    objectMap: Record<string, any>,
    references: ReferencesWithMap
): void {
    singletons.forEach((singleton) => {
        singleton.entityType = objectMap[singleton.entityTypeName];
        if (!singleton.entityType) {
            singleton.entityType = objectMap[unalias(references, singleton.entityTypeName) as string];
        }
        if (!singleton.annotations) {
            singleton.annotations = {};
        }
        if (!singleton.entityType.annotations) {
            singleton.entityType.annotations = {};
        }
        singleton.entityType.keys.forEach((keyProp: Property) => {
            keyProp.isKey = true;
        });
    });
}

/**
 * @param entityTypes
 * @param objectMap
 */
function linkPropertiesToComplexTypes(entityTypes: EntityType[], objectMap: Record<string, any>) {
    /**
     * @param property
     */
    function link(property: Property) {
        if (!property.annotations) {
            property.annotations = {};
        }

        try {
            if (property.type.indexOf('Edm') !== 0) {
                let complexType: ComplexType | TypeDefinition;
                if (property.type.startsWith('Collection')) {
                    const complexTypeName = property.type.substring(11, property.type.length - 1);
                    complexType = objectMap[complexTypeName] as ComplexType;
                } else {
                    complexType = objectMap[property.type] as ComplexType;
                }
                if (complexType) {
                    property.targetType = complexType;
                    if (complexType.properties) {
                        complexType.properties.forEach(link);
                    }
                }
            }
        } catch (sError) {
            throw new Error('Property Type is not defined');
        }
    }

    entityTypes.forEach((entityType) => {
        entityType.entityProperties.forEach(link);
    });
}

/**
 * @param complexTypes
 * @param associations
 * @param objectMap
 */
function prepareComplexTypes(
    complexTypes: RawComplexType[],
    associations: RawAssociation[],
    objectMap: Record<string, any>
) {
    complexTypes.forEach((complexType) => {
        (complexType as ComplexType).annotations = {};
        complexType.properties.forEach((property) => {
            if (!(property as Property).annotations) {
                (property as Property).annotations = {};
            }
        });

        complexType.navigationProperties = prepareNavigationProperties(
            complexType.navigationProperties,
            associations,
            objectMap
        );
    });
}

/**
 * Split the alias from the term value.
 *
 * @param references the current set of references
 * @param termValue the value of the term
 * @returns the term alias and the actual term value
 */
function splitTerm(references: ReferencesWithMap, termValue: string) {
    const aliasedTerm = alias(references, termValue);
    const lastDot = aliasedTerm.lastIndexOf('.');
    const termAlias = aliasedTerm.substring(0, lastDot);
    const term = aliasedTerm.substring(lastDot + 1);
    return [termAlias, term];
}

/**
 * Creates the function that will resolve a specific path.
 *
 * @param convertedOutput
 * @param objectMap
 * @returns the function that will allow to resolve element globally.
 */
function createGlobalResolve(convertedOutput: ConvertedMetadata, objectMap: Record<string, any>) {
    return function resolvePath<T>(sPath: string, resolveDirectly: boolean = false): ResolutionTarget<T> {
        if (resolveDirectly) {
            let targetPath = sPath;
            if (!sPath.startsWith('/')) {
                targetPath = `/${sPath}`;
            }
            const targetResolution: any = _resolveTarget(objectMap, convertedOutput, targetPath, false, true);
            if (targetResolution.target) {
                targetResolution.visitedObjects.push(targetResolution.target);
            }
            return {
                target: targetResolution.target,
                objectPath: targetResolution.visitedObjects
            };
        }
        const aPathSplit = sPath.split('/');
        if (aPathSplit.shift() !== '') {
            throw new Error('Cannot deal with relative path');
        }
        const entitySetName = aPathSplit.shift();
        const entitySet = convertedOutput.entitySets.find((et: EntitySet) => et.name === entitySetName);
        const singleton = convertedOutput.singletons.find((et: Singleton) => et.name === entitySetName);
        if (!entitySet && !singleton) {
            return {
                target: convertedOutput.entityContainer,
                objectPath: [convertedOutput.entityContainer]
            } as ResolutionTarget<T>;
        }
        if (aPathSplit.length === 0) {
            return {
                target: entitySet || singleton,
                objectPath: [convertedOutput.entityContainer, entitySet || singleton]
            } as ResolutionTarget<T>;
        } else {
            const targetResolution: any = _resolveTarget(
                objectMap,
                entitySet || singleton,
                '/' + aPathSplit.join('/'),
                false,
                true
            );
            if (targetResolution.target) {
                targetResolution.visitedObjects.push(targetResolution.target);
            }
            return {
                target: targetResolution.target,
                objectPath: targetResolution.visitedObjects
            };
        }
    };
}

type ConversionContext = {
    unresolvedAnnotations: Resolveable[];
    additionalAnnotations: AnnotationList[];
    rawMetadata: RawMetadata;
    currentSource: string;
    currentTarget: any;
    currentProperty?: string;
    currentTerm: string;
};

function ensureAnnotations(currentTarget: any, vocAlias: string) {
    if (!currentTarget.annotations) {
        currentTarget.annotations = {};
    }
    if (!currentTarget.annotations[vocAlias]) {
        currentTarget.annotations[vocAlias] = {};
    }
    if (!currentTarget.annotations._annotations) {
        currentTarget.annotations._annotations = {};
    }
}

function processAnnotations(
    currentContext: ConversionContext,
    annotationList: AnnotationList,
    objectMap: Record<string, any>,
    bOverrideExisting: boolean
) {
    const currentTarget = currentContext.currentTarget;
    const currentTargetName = currentTarget.fullyQualifiedName;
    annotationList.annotations.forEach((annotation: RawAnnotation) => {
        currentContext.currentSource = (annotation as any).__source || (annotationList as any).__source;
        const [vocAlias, vocTerm] = splitTerm(defaultReferences, annotation.term);
        ensureAnnotations(currentTarget, vocAlias);

        const vocTermWithQualifier = `${vocTerm}${annotation.qualifier ? '#' + annotation.qualifier : ''}`;
        if (!bOverrideExisting && currentTarget.annotations?.[vocAlias]?.[vocTermWithQualifier] !== undefined) {
            return;
        }
        currentContext.currentTerm = annotation.term;
        currentTarget.annotations[vocAlias][vocTermWithQualifier] = convertAnnotation(
            annotation as Annotation,
            objectMap,
            currentContext
        );

        switch (typeof currentTarget.annotations[vocAlias][vocTermWithQualifier]) {
            case 'string':
                // eslint-disable-next-line no-new-wrappers
                currentTarget.annotations[vocAlias][vocTermWithQualifier] = new String(
                    currentTarget.annotations[vocAlias][vocTermWithQualifier]
                );
                break;
            case 'boolean':
                // eslint-disable-next-line no-new-wrappers
                currentTarget.annotations[vocAlias][vocTermWithQualifier] = new Boolean(
                    currentTarget.annotations[vocAlias][vocTermWithQualifier]
                );
                break;
            default:
                // do nothing
                break;
        }
        if (
            currentTarget.annotations[vocAlias][vocTermWithQualifier] !== null &&
            typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === 'object' &&
            !currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations
        ) {
            currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations = {};
        }
        if (
            currentTarget.annotations[vocAlias][vocTermWithQualifier] !== null &&
            typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === 'object'
        ) {
            currentTarget.annotations[vocAlias][vocTermWithQualifier].term = unalias(
                defaultReferences,
                `${vocAlias}.${vocTerm}`
            );
            currentTarget.annotations[vocAlias][vocTermWithQualifier].qualifier = annotation.qualifier;
            currentTarget.annotations[vocAlias][vocTermWithQualifier].__source = currentContext.currentSource;
        }
        const annotationTarget = `${currentTargetName}@${unalias(
            defaultReferences,
            vocAlias + '.' + vocTermWithQualifier
        )}`;
        if (Array.isArray(annotation.annotations)) {
            const subAnnotationList = {
                target: annotationTarget,
                annotations: annotation.annotations,
                __source: currentContext.currentSource
            };
            currentContext.additionalAnnotations.push(subAnnotationList);
        } else if (annotation.annotations && !currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations) {
            currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations = annotation.annotations;
        }
        currentTarget.annotations._annotations[`${vocAlias}.${vocTermWithQualifier}`] =
            currentTarget.annotations._annotations[unalias(defaultReferences, `${vocAlias}.${vocTermWithQualifier}`)!] =
                currentTarget.annotations[vocAlias][vocTermWithQualifier];
        objectMap[annotationTarget] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
    });
}

/**
 * Process all the unresolved targets so far to try and see if they are resolveable in the end.
 *
 * @param unresolvedTargets
 * @param objectMap
 */
function processUnresolvedTargets(unresolvedTargets: Resolveable[], objectMap: Record<string, any>) {
    unresolvedTargets.forEach((resolvable) => {
        const targetToResolve = resolvable.toResolve;
        const targetStr = targetToResolve.$target;
        const resolvedTarget = objectMap[targetStr];
        const { annotationsTerm, annotationType } = targetToResolve;
        delete targetToResolve.annotationType;
        delete targetToResolve.annotationsTerm;

        if (resolvable.inline && !(resolvedTarget instanceof String)) {
            // inline the resolved target
            let keys: keyof typeof targetToResolve;
            for (keys in targetToResolve) {
                delete targetToResolve[keys];
            }

            Object.assign(targetToResolve, resolvedTarget);
        } else {
            // assign the resolved target
            targetToResolve.$target = resolvedTarget;
        }

        if (!resolvedTarget) {
            targetToResolve.targetString = targetStr;
            if (annotationsTerm && annotationType) {
                const oErrorMsg = {
                    message:
                        'Unable to resolve the path expression: ' +
                        targetStr +
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
                        targetStr +
                        '>'
                };
                addAnnotationErrorMessage(targetStr, oErrorMsg);
            } else {
                const property = targetToResolve.term;
                const path = targetToResolve.path;
                const termInfo = targetStr ? targetStr.split('/')[0] : targetStr;
                const oErrorMsg = {
                    message:
                        'Unable to resolve the path expression: ' +
                        targetStr +
                        '\n' +
                        '\n' +
                        'Hint: Check and correct the path values under the following structure in the metadata (annotation.xml file or CDS annotations for the application): \n\n' +
                        '<Annotation Term = ' +
                        termInfo +
                        '>' +
                        '\n' +
                        '<PropertyValue Property = ' +
                        property +
                        '        Path= ' +
                        path +
                        '>'
                };
                addAnnotationErrorMessage(targetStr, oErrorMsg);
            }
        }
    });
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
                    annotations: annotationList.annotations.concat(),
                    target: currentTargetName
                };
                (annotationListPerTarget[currentTargetName] as any).__source = annotationSource;
            } else {
                annotationList.annotations.forEach((annotation) => {
                    const findIndex = annotationListPerTarget[currentTargetName].annotations.findIndex(
                        (referenceAnnotation) => {
                            return (
                                referenceAnnotation.term === annotation.term &&
                                referenceAnnotation.qualifier === annotation.qualifier
                            );
                        }
                    );
                    (annotation as any).__source = annotationSource;
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
    ANNOTATION_ERRORS = [];
    const objectMap = buildObjectMap(rawMetadata);
    resolveNavigationProperties(
        rawMetadata.schema.entityTypes as EntityType[],
        rawMetadata.schema.associations,
        objectMap
    );
    (rawMetadata.schema.entityContainer as EntityContainer).annotations = {};
    linkActionsToEntityType(rawMetadata.schema.namespace, rawMetadata.schema.actions as Action[], objectMap);
    linkActionImportsToActions(rawMetadata.schema.actionImports, objectMap);
    linkEntityTypeToEntitySet(rawMetadata.schema.entitySets as EntitySet[], objectMap, rawMetadata.references);
    linkEntityTypeToSingleton(rawMetadata.schema.singletons as Singleton[], objectMap, rawMetadata.references);
    linkPropertiesToComplexTypes(rawMetadata.schema.entityTypes as EntityType[], objectMap);
    prepareComplexTypes(rawMetadata.schema.complexTypes as ComplexType[], rawMetadata.schema.associations, objectMap);
    const unresolvedTargets: Resolveable[] = [];
    const unresolvedAnnotations: AnnotationList[] = [];
    const annotationListPerTarget: Record<string, AnnotationList> = mergeAnnotations(rawMetadata);
    Object.keys(annotationListPerTarget).forEach((currentTargetName) => {
        const annotationList = annotationListPerTarget[currentTargetName];
        const objectMapElement = objectMap[currentTargetName];
        if (!objectMapElement && currentTargetName?.indexOf('@') > 0) {
            unresolvedAnnotations.push(annotationList);
        } else if (objectMapElement) {
            let allTargets = [objectMapElement];
            let bOverrideExisting = true;
            if (objectMapElement._type === 'UnboundGenericAction') {
                allTargets = objectMapElement.actions;
                bOverrideExisting = false;
            }
            allTargets.forEach((currentTarget) => {
                const currentContext: ConversionContext = {
                    additionalAnnotations: unresolvedAnnotations,
                    currentSource: (annotationList as any).__source,
                    currentTarget: currentTarget,
                    currentTerm: '',
                    rawMetadata: rawMetadata,
                    unresolvedAnnotations: unresolvedTargets
                };
                processAnnotations(currentContext, annotationList, objectMap, bOverrideExisting);
            });
        }
    });

    const extraUnresolvedAnnotations: AnnotationList[] = [];
    unresolvedAnnotations.forEach((annotationList) => {
        const currentTargetName = unalias(rawMetadata.references, annotationList.target) as string;
        let [baseObj, annotationPart] = currentTargetName.split('@');
        const targetSplit = annotationPart.split('/');
        baseObj = baseObj + '@' + targetSplit[0];
        const currentTarget = targetSplit.slice(1).reduce((currentObj, path) => {
            return currentObj?.[path];
        }, objectMap[baseObj]);
        if (!currentTarget || typeof currentTarget !== 'object') {
            ANNOTATION_ERRORS.push({
                message: 'The following annotation target was not found on the service ' + currentTargetName
            });
        } else {
            const currentContext: ConversionContext = {
                additionalAnnotations: extraUnresolvedAnnotations,
                currentSource: (annotationList as any).__source,
                currentTarget: currentTarget,
                currentTerm: '',
                rawMetadata: rawMetadata,
                unresolvedAnnotations: unresolvedTargets
            };
            processAnnotations(currentContext, annotationList, objectMap, false);
        }
    });
    processUnresolvedTargets(unresolvedTargets, objectMap);
    for (const property in ALL_ANNOTATION_ERRORS) {
        ANNOTATION_ERRORS.push(ALL_ANNOTATION_ERRORS[property][0]);
    }
    (rawMetadata as any).entitySets = rawMetadata.schema.entitySets;
    const extraReferences = rawMetadata.references.filter((reference: Reference) => {
        return defaultReferences.find((defaultRef) => defaultRef.namespace === reference.namespace) === undefined;
    });
    const convertedOutput: Partial<ConvertedMetadata> = {
        version: rawMetadata.version,
        annotations: rawMetadata.schema.annotations,
        namespace: rawMetadata.schema.namespace,
        entityContainer: rawMetadata.schema.entityContainer as EntityContainer,
        actions: rawMetadata.schema.actions as Action[],
        actionImports: rawMetadata.schema.actionImports,
        entitySets: rawMetadata.schema.entitySets as EntitySet[],
        singletons: rawMetadata.schema.singletons as Singleton[],
        entityTypes: rawMetadata.schema.entityTypes as EntityType[],
        complexTypes: rawMetadata.schema.complexTypes as ComplexType[],
        typeDefinitions: rawMetadata.schema.typeDefinitions as TypeDefinition[],
        references: defaultReferences.concat(extraReferences),
        diagnostics: ANNOTATION_ERRORS.concat()
    };
    convertedOutput.resolvePath = createGlobalResolve(convertedOutput as ConvertedMetadata, objectMap);
    return convertedOutput as ConvertedMetadata;
}
