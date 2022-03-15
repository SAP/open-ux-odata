import type {
    Property as ParserProperty,
    EntityType as ParserEntityType,
    EntitySet as ParserEntitySet,
    Action as ParserAction,
    ComplexType as ParserComplexType,
    EntityContainer as ParserEntityContainer,
    TypeDefinition as ParserTypeDefinition,
    Reference,
    ReferentialConstraint,
    Singleton as ParserSingleton
} from './Parser';

import type { Annotation as EdmAnnotation, AnnotationList, FullyQualifiedName, SimpleIdentifier } from './BaseEdm';
import type {
    ActionAnnotations,
    ActionImportAnnotations,
    AnnotationAnnotations,
    ComplexTypeAnnotations,
    EntityContainerAnnotations,
    EntitySetAnnotations,
    EntityTypeAnnotations,
    EnumTypeAnnotations,
    FunctionAnnotations,
    FunctionImportAnnotations,
    IncludeAnnotations,
    NavigationPropertyAnnotations,
    ParameterAnnotations,
    PropertyAnnotations,
    ReferenceAnnotations,
    ReturnTypeAnnotations,
    SchemaAnnotations,
    SingletonAnnotations,
    TermAnnotations,
    TypeDefinitionAnnotations,
    PropertyValueAnnotations,
    RecordAnnotations,
    CollectionAnnotations
} from './generated/Edm_Types';

export type AnyAnnotation =
    | EnumTypeAnnotations
    | PropertyValueAnnotations
    | IncludeAnnotations
    | ReferenceAnnotations
    | ActionAnnotations
    | FunctionImportAnnotations
    | ActionImportAnnotations
    | TypeDefinitionAnnotations
    | SingletonAnnotations
    | EntityContainerAnnotations
    | FunctionAnnotations
    | ReturnTypeAnnotations
    | ParameterAnnotations
    | ComplexTypeAnnotations
    | TermAnnotations
    | RecordAnnotations
    | SchemaAnnotations
    | AnnotationAnnotations
    | EntitySetAnnotations
    | EntityTypeAnnotations
    | PropertyAnnotations
    | NavigationPropertyAnnotations;

export type Property = ParserProperty & {
    annotations: PropertyAnnotations;
    targetType?: ComplexType | TypeDefinition;
    isKey: boolean;
};

export type ComplexType = Omit<ParserComplexType, 'properties' | 'navigationProperties' | '_type'> & {
    _type: 'ComplexType';
    properties: Property[];
    navigationProperties: NavigationProperty[];
    annotations: ComplexTypeAnnotations;
};

export type TypeDefinition = Omit<ParserTypeDefinition, '_type'> & {
    _type: 'TypeDefinition';
    annotations: TypeDefinitionAnnotations;
};

export type NavigationProperty = SingleNavigationProperty | MultipleNavigationProperty;

export type BaseNavigationProperty = {
    _type: 'NavigationProperty';
    name: SimpleIdentifier;
    partner: string;
    fullyQualifiedName: FullyQualifiedName;
    targetTypeName: FullyQualifiedName;
    targetType: EntityType;
    annotations: NavigationPropertyAnnotations;
    isCollection: boolean;
    containsTarget: boolean;
    referentialConstraint?: ReferentialConstraint[];
};
export type SingleNavigationProperty = BaseNavigationProperty & {
    isCollection: false;
    annotations: NavigationPropertyAnnotations;
};
export type MultipleNavigationProperty = BaseNavigationProperty & {
    isCollection: true;
    annotations: NavigationPropertyAnnotations | CollectionAnnotations;
};

export type EntityType = Omit<ParserEntityType, 'entityProperties' | 'navigationProperties' | 'keys' | '_type'> & {
    _type: 'EntityType';
    entityProperties: Property[];
    keys: Property[];
    navigationProperties: NavigationProperty[];
    actions: Record<string, Action>;
    annotations: EntityTypeAnnotations;
    resolvePath(relativePath: string, includeVisitedObjects?: boolean): any;
};

export type EntitySet = Omit<ParserEntitySet, 'entityType' | '_type'> & {
    _type: 'EntitySet';
    entityType: EntityType;
    navigationPropertyBinding: Record<string, EntitySet>;
    annotations: EntitySetAnnotations;
};

export type Singleton = Omit<ParserSingleton, 'entityType' | '_type'> & {
    _type: 'Singleton';
    type: EntityType;
    entityType: EntityType;
    nullable: boolean;
    navigationPropertyBinding: Record<string, Singleton | EntitySet>; //above for entity set?
    annotations: SingletonAnnotations;
};

export type EntityContainer = ParserEntityContainer & {
    _type: 'EntityContainer';
    annotations: EntityContainerAnnotations;
};

export type ActionParameter = {
    _type: 'ActionParameter';
    isEntitySet: boolean;
    name: string;
    fullyQualifiedName: string;
    type: string;
    annotations: ParameterAnnotations;
};
export type Action = ParserAction & {
    _type: 'Action';
    sourceEntityType?: EntityType;
    returnEntityType?: EntityType;
    annotations: ActionAnnotations;
    parameters: ActionParameter[];
};

export type ServiceObject =
    | EntitySet
    | EntityType
    | Property
    | ComplexType
    | NavigationProperty
    | Action
    | EntityContainer;
export type ServiceObjectAndAnnotation = ServiceObject | AnyAnnotation;

export type Annotation = EdmAnnotation & {
    fullyQualifiedName: string;
};

export type ResolutionTarget<T> = {
    target: null | T;
    objectPath: ServiceObjectAndAnnotation[];
};

export type ConverterOutput = {
    version: string;
    annotations: Record<string, AnnotationList[]>;
    namespace: string;
    actions: Action[];
    entityContainer: EntityContainer;
    complexTypes: ComplexType[];
    typeDefinitions: TypeDefinition[];
    entitySets: EntitySet[];
    singletons: Singleton[];
    entityTypes: EntityType[];
    references: Reference[];
    diagnostics: { message: string }[];
    resolvePath: <T>(path: string) => ResolutionTarget<T>;
};

/**
 * @param value the actual decimal value
 * @returns a Decimal object
 */
export function Decimal(value: number) {
    return {
        isDecimal() {
            return true;
        },
        valueOf() {
            return value;
        },
        toString() {
            return value.toString();
        }
    };
}
