// PURE EDM Types
import type { AnnotationList, FullyQualifiedName, RawAnnotation, SimpleIdentifier } from './BaseEdm';
import type {
    ActionAnnotations,
    ActionImportAnnotations,
    AnnotationAnnotations,
    CollectionAnnotations,
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
    PropertyValueAnnotations,
    RecordAnnotations,
    ReferenceAnnotations,
    ReturnTypeAnnotations,
    SchemaAnnotations,
    SingletonAnnotations,
    TermAnnotations,
    TypeDefinitionAnnotations
} from './vocabularies/Edm_Types';
// Generated EDM Types for the converter

export type PropertyPath = {
    type: 'PropertyPath';
    fullyQualifiedName: FullyQualifiedName;
    value: string;
    __source: string;
    $target: Property | undefined;
};

export type AnyPropertyPath = PropertyPath | NavigationPropertyPath;

export type NavigationPropertyPath = {
    type: 'NavigationPropertyPath';
    fullyQualifiedName: FullyQualifiedName;
    value: string;
    __source: string;
    $target: NavigationProperty | undefined;
};

export type AnnotationPath<P> = {
    type: 'AnnotationPath';
    fullyQualifiedName: FullyQualifiedName;
    value: string;
    __source: string;
    $target: (AnnotationTerm<P> & { term: string }) | undefined;
};

type PrimitiveTypeCast<P, G> =
    | (P extends boolean ? boolean | (Boolean & G) : never)
    | (P extends number ? number | (Number & G) : never)
    | (P extends string ? string | (String & G) : never)
    | (P & G);

export type AnnotationTerm<P> = PrimitiveTypeCast<
    P,
    {
        fullyQualifiedName: string;
        qualifier: string;
        annotations?: TermAnnotations & AnnotationAnnotations;
    }
>;

type TypeToString1 = {
    String: 'Edm.String';
    Decimal: 'Edm.String';
    Double: 'Edm.String';
};
// export type TypeToString<T> = T extends Edm.String ? "Edm.String" :
//                                 T extends Edm.Decimal ? "Edm.Decimal" :
//                                 T extends Edm.
export type PropertyOfType<P extends keyof TypeToString1> = Property & {
    type: TypeToString1[P];
};

export type PathAnnotationExpression<P> = {
    type: 'Path';
    fullyQualifiedName: FullyQualifiedName;
    path: string; // The defined path
    __source: string;
    $target: Property | undefined;
    getValue(): P;
};

export type ConstantExpression<T> = {
    type: 'Constant';
    value: T;
};

export type ApplyAnnotationExpression<P> = {
    type: 'Apply';
    $Apply: PropertyAnnotationValue<P>[];
    $Function: 'odata.concat';
};

export type EqConditionalExpression = {
    $Eq: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type NeConditionalExpression = {
    $Ne: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type GtConditionalExpression = {
    $Gt: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type GeConditionalExpression = {
    $Ge: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type LtConditionalExpression = {
    $Lt: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type LeConditionalExpression = {
    $Le: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type AndConditionalExpression = {
    $And: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type OrConditionalExpression = {
    $Or: [ConditionalCheckOrValue, ConditionalCheckOrValue];
};

export type NotConditionalExpression = {
    $Not: ConditionalCheckOrValue;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type PathConditionExpression<T> = {
    $Path: string;
};
export type ConditionalCheck =
    | OrConditionalExpression
    | AndConditionalExpression
    | NotConditionalExpression
    | EqConditionalExpression
    | NeConditionalExpression
    | GtConditionalExpression
    | GeConditionalExpression
    | LtConditionalExpression
    | LeConditionalExpression;
export type ConditionalCheckOrValue =
    | null
    | string
    | number
    | boolean
    | ConditionalCheck
    | PathConditionExpression<string | number | boolean>;
export type IfAnnotationExpressionValue<OutType> = [ConditionalCheck, OutType, OutType];
export type IfAnnotationExpression<P> = {
    type: 'If';
    $If: IfAnnotationExpressionValue<P>;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AndAnnotationExpression<P> = {
    type: 'And';
    $And: AndConditionalExpression[];
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type OrAnnotationExpression<P> = {
    type: 'Or';
    $Or: OrConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type EqAnnotationExpression<P> = {
    type: 'Eq';
    $Eq: EqConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type NeAnnotationExpression<P> = {
    type: 'Ne';
    $Ne: NeConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type NotAnnotationExpression<P> = {
    type: 'Not';
    $Not: NotConditionalExpression;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GtAnnotationExpression<P> = {
    type: 'Gt';
    $Gt: GtConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GeAnnotationExpression<P> = {
    type: 'Ge';
    $Ge: GeConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type LtAnnotationExpression<P> = {
    type: 'Lt';
    $Lt: LtConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type LeAnnotationExpression<P> = {
    type: 'Le';
    $Le: LeConditionalExpression[];
};

export type PropertyAnnotationValue<P> = DynamicAnnotationExpression<P>;

export type DynamicAnnotationExpression<P> =
    | PathAnnotationExpression<P>
    | ApplyAnnotationExpression<P>
    | AndAnnotationExpression<P>
    | OrAnnotationExpression<P>
    | EqAnnotationExpression<P>
    | NeAnnotationExpression<P>
    | NotAnnotationExpression<P>
    | GtAnnotationExpression<P>
    | GeAnnotationExpression<P>
    | LtAnnotationExpression<P>
    | LeAnnotationExpression<P>
    | IfAnnotationExpression<P>
    | ConstantExpression<P>;

export type IDecimal = {
    isDecimal(): boolean;
    valueOf(): number;
    toString(): string;
};
export type InstancePath = string;
export type Byte = Number;
export type Int16 = Number;
export type Int32 = Number;
export type Int64 = Number;
export type Time = string;
export type Binary = string;
export type Decimal = IDecimal | Number;
export type Double = IDecimal | Number;

export type Date = string;
export type Guid = any;
export type Duration = any;
export type DateTimeOffset = any;
export type Untyped = any;
export type Stream = any;

export type GeographyPoint = any;

export type Geometry = any;

export type PrimitiveType =
    | Binary
    | Boolean
    | Byte
    | Date
    | DateTimeOffset
    | Decimal
    | Double
    | Duration
    | Guid
    | Int16
    | Int32
    | Int64
    // | Edm.SByte
    // | Edm.Single
    // | Edm.Stream
    | String
    // | Edm.TimeOfData
    // | Edm.Geography
    | GeographyPoint;
// | Edm.GeographyLineString
// | Edm.GeographyPolygon
// | Edm.GeographyMultiPoint
// | Edm.GeographyMultiLineString
// | Edm.GeographyMultiPolygon
// | Edm.GeographyCollection
// | Edm.Geometry
// | Edm.GeometryPoint
// | Edm.GeometryLineString
// | Edm.GeometryPolygon
// | Edm.GeometryMultiPoint
// | Edm.GeometryMultiLineString
// | Edm.GeometryMultiPolygon
// | Edm.GeometryCollection;

export type String = InstanceType<StringConstructor>;
export type Boolean = InstanceType<BooleanConstructor>;

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

export type Property = {
    _type: 'Property';
    name: SimpleIdentifier;
    type: FullyQualifiedName;
    fullyQualifiedName: FullyQualifiedName;
    maxLength?: number;
    precision?: number;
    scale?: number;
    nullable?: boolean;
    defaultValue?: string | boolean | number;
    unicode?: boolean;
    annotations: PropertyAnnotations;
    targetType?: ComplexType | TypeDefinition;
    isKey: boolean;
};

export type RecordComplexType = {
    annotations?: RecordAnnotations;
    fullyQualifiedName: string;
};

export type ComplexType = {
    _type: 'ComplexType';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    properties: ArrayWithIndex<Property, 'name'>;
    navigationProperties: ArrayWithIndex<NavigationProperty, 'name'>;
    annotations: ComplexTypeAnnotations;
};

export type TypeDefinition = {
    _type: 'TypeDefinition';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    underlyingType: string;
    annotations: TypeDefinitionAnnotations;
};

export type NavigationProperty = SingleNavigationProperty | MultipleNavigationProperty;

export type ReferentialConstraint = {
    sourceTypeName: FullyQualifiedName;
    sourceProperty: SimpleIdentifier;
    targetTypeName: FullyQualifiedName;
    targetProperty: SimpleIdentifier;
};

export type BaseNavigationProperty = {
    _type: 'NavigationProperty';
    name: SimpleIdentifier;
    partner?: string;
    fullyQualifiedName: FullyQualifiedName;
    targetTypeName: FullyQualifiedName;
    targetType: EntityType;
    annotations: NavigationPropertyAnnotations;
    isCollection: boolean;
    containsTarget: boolean;
    referentialConstraint: ReferentialConstraint[];
};
export type SingleNavigationProperty = BaseNavigationProperty & {
    isCollection: false;
    annotations: NavigationPropertyAnnotations;
};
export type MultipleNavigationProperty = BaseNavigationProperty & {
    isCollection: true;
    annotations: NavigationPropertyAnnotations | CollectionAnnotations;
};

export type EntityType = {
    _type: 'EntityType';
    fullyQualifiedName: FullyQualifiedName;
    entityProperties: ArrayWithIndex<Property, 'name' | 'fullyQualifiedName'>;
    keys: ArrayWithIndex<Property, 'name' | 'fullyQualifiedName'>;
    navigationProperties: ArrayWithIndex<NavigationProperty, 'name' | 'fullyQualifiedName'>;
    actions: Record<string, Action>;
    annotations: EntityTypeAnnotations;
    name: SimpleIdentifier;
    resolvePath(relativePath: string, includeVisitedObjects?: boolean): any;
};

export type EntitySet = {
    _type: 'EntitySet';
    name: SimpleIdentifier;
    entityTypeName: FullyQualifiedName;
    entityType: EntityType;
    fullyQualifiedName: SimpleIdentifier;
    navigationPropertyBinding: Record<string, EntitySet | Singleton>;
    annotations: EntitySetAnnotations;
};

export type Singleton = {
    _type: 'Singleton';
    name: SimpleIdentifier;
    entityTypeName: FullyQualifiedName;
    fullyQualifiedName: SimpleIdentifier;
    entityType: EntityType;
    nullable: boolean;
    navigationPropertyBinding: Record<string, EntitySet | Singleton>;
    annotations: SingletonAnnotations;
};

export type EntityContainer = {
    _type: 'EntityContainer';
    name?: string;
    fullyQualifiedName: string;
    annotations: EntityContainerAnnotations;

    actionImports: ArrayWithIndex<ActionImport, 'name' | 'fullyQualifiedName'>;
    entitySets: ArrayWithIndex<EntitySet, 'name' | 'fullyQualifiedName'>;
    singletons: ArrayWithIndex<Singleton, 'name' | 'fullyQualifiedName'>;
};

export type ActionParameter = {
    _type: 'ActionParameter';
    isCollection: boolean;
    name: string;
    fullyQualifiedName: string;
    type: string;
    maxLength?: number;
    precision?: number;
    scale?: number;
    nullable?: boolean;
    typeReference?: TypeDefinition | ComplexType | EntityType;
    annotations: ParameterAnnotations;
};
export type Action = {
    _type: 'Action';
    name: SimpleIdentifier;
    fullyQualifiedName: SimpleIdentifier;
    isBound: boolean;
    sourceType: string;
    returnType: string;
    returnCollection: boolean;
    isFunction: boolean;
    sourceEntityType?: EntityType;
    returnEntityType?: EntityType;
    annotations: ActionAnnotations;
    parameters: ArrayWithIndex<ActionParameter, 'name' | 'fullyQualifiedName'>;
};

/**
 * ActionImport or FunctionImport
 */
export type ActionImport = {
    _type: 'ActionImport';
    name: SimpleIdentifier;
    fullyQualifiedName: SimpleIdentifier;
    actionName: string;
    action: Action;
    annotations: ActionImportAnnotations;
};

export type ServiceObject =
    | EntitySet
    | Singleton
    | EntityType
    | Property
    | ComplexType
    | TypeDefinition
    | NavigationProperty
    | Action
    | ActionParameter
    | ActionImport
    | EntityContainer;
export type ServiceObjectAndAnnotation = ServiceObject | AnyAnnotation;

export type ResolutionTarget<T> = {
    target: undefined | T;
    objectPath: ServiceObjectAndAnnotation[];
    messages: { message: string }[];
};

export type Reference = {
    uri: string;
    alias: string;
    namespace: string;
};

export type Index<T, P extends Extract<keyof T, string>> = Record<`by_${P}`, (value: T[P]) => T | undefined>;
export type ArrayWithIndex<T, P extends Extract<keyof T, string>> = Array<T> & Index<T, P>;

export type ConvertedMetadata = {
    version: string;
    annotations: Record<string, AnnotationList[]>;
    namespace: string;
    actions: ArrayWithIndex<Action, 'fullyQualifiedName'>;
    actionImports: ArrayWithIndex<ActionImport, 'name' | 'fullyQualifiedName'>;
    entityContainer: EntityContainer;
    complexTypes: ArrayWithIndex<ComplexType, 'name' | 'fullyQualifiedName'>;
    typeDefinitions: ArrayWithIndex<TypeDefinition, 'name' | 'fullyQualifiedName'>;
    entitySets: ArrayWithIndex<EntitySet, 'name' | 'fullyQualifiedName'>;
    singletons: ArrayWithIndex<Singleton, 'name' | 'fullyQualifiedName'>;
    entityTypes: ArrayWithIndex<EntityType, 'name' | 'fullyQualifiedName'>;
    references: Reference[];
    diagnostics: { message: string }[];
    resolvePath: <T>(path: string) => ResolutionTarget<T>;
};

// All the Raw types are meant for usage when providing data to the converter

// Removes things which will be provided by the converter, annotations, targetType and other things to improve usability
export type RemoveAnnotationAndType<T> = {
    [K in keyof Omit<
        T,
        | 'annotations'
        | 'targetType'
        | 'isKey'
        | 'resolvePath'
        | 'entityType'
        | 'navigationProperties'
        | 'navigationPropertyBinding'
        | 'entitySets'
        | 'singletons'
        | 'actionImports'
        | 'action'
    >]: T[K] extends object
        ? T[K] extends Array<infer Item>
            ? RemoveAnnotationAndType<Item>[]
            : RemoveAnnotationAndType<T[K]>
        : T[K];
};
export type RawMetadata = {
    identification: string;
    version: string;
    schema: RawSchema;
    references: Reference[];
};
export type RawAssociation = {
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    associationEnd: RawAssociationEnd[];
    referentialConstraints: ReferentialConstraint[];
};

export type RawAssociationSet = {
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    association: string;
    associationEnd: RawAssociationSetEnd[];
};

export type RawAssociationEnd = {
    type: FullyQualifiedName;
    role: SimpleIdentifier;
    multiplicity: string;
};

export type RawAssociationSetEnd = {
    entitySet: FullyQualifiedName;
    role: SimpleIdentifier;
};
export type RawSchema = {
    namespace: string;
    associations: RawAssociation[];
    associationSets: RawAssociationSet[];
    annotations: { [id: string]: AnnotationList[] };
    entitySets: RawEntitySet[];
    singletons: RawSingleton[];
    complexTypes: RawComplexType[];
    typeDefinitions: RawTypeDefinition[];
    entityContainer: RawEntityContainer;
    actions: RawAction[];
    actionImports: RawActionImport[];
    entityTypes: RawEntityType[];
};

export type RawAction = RemoveAnnotationAndType<Action> & {
    parameters: RawActionParameter[];
};
export type RawActionImport = RemoveAnnotationAndType<ActionImport>;
export type RawActionParameter = RemoveAnnotationAndType<ActionParameter>;
export type RawEntityType = RemoveAnnotationAndType<EntityType> & {
    navigationProperties: (RawV2NavigationProperty | RawV4NavigationProperty)[];
};
export type RawProperty = RemoveAnnotationAndType<Property>;
export type RawNavigationPropertyBinding = Record<string, FullyQualifiedName>;

export type RawEntitySet = RemoveAnnotationAndType<EntitySet> & {
    navigationPropertyBinding: RawNavigationPropertyBinding;
};

export type RawSingleton = RemoveAnnotationAndType<Singleton> & {
    navigationPropertyBinding: RawNavigationPropertyBinding;
};

export type RawEntityContainer = RemoveAnnotationAndType<EntityContainer>;
export type RawTypeDefinition = RemoveAnnotationAndType<TypeDefinition>;
export type RawComplexType = RemoveAnnotationAndType<ComplexType> & {
    navigationProperties: (RawV2NavigationProperty | RawV4NavigationProperty)[];
};
export type RawV2NavigationProperty = {
    _type: 'NavigationProperty';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    relationship: FullyQualifiedName;
    toRole: SimpleIdentifier;
    fromRole: SimpleIdentifier;
    referentialConstraint?: ReferentialConstraint[];
};

export type RawV4NavigationProperty = RemoveAnnotationAndType<BaseNavigationProperty>;

export type Annotation = RawAnnotation & {
    fullyQualifiedName: string;
};
