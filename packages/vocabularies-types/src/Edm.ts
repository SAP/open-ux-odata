// PURE EDM Types
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
} from './vocabularies/Edm_Types';
import type { AnnotationList, FullyQualifiedName, RawAnnotation, SimpleIdentifier } from './BaseEdm';
// Generated EDM Types for the converter

export type PropertyPath = {
    fullyQualifiedName: string;
    type: 'PropertyPath';
    value: string;
    $target: Property;
};
export type NavigationPropertyPath = {
    type: 'NavigationPropertyPath';
    value: string;
    $target: NavigationProperty;
};

export type AnnotationPath<P> = {
    type: 'AnnotationPath';
    value: string;
    $target: AnnotationTerm<P>;
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
        term: string;
        qualifier: string;
        annotations?: TermAnnotations & AnnotationAnnotations;
    }
>;

export type PathAnnotationExpression<P> = {
    type: 'Path';
    path: string; // The defined path
    $target: P;
    getValue(): P;
};

export type ApplyAnnotationExpression<P> = {
    type: 'Apply';
    Apply: PropertyAnnotationValue<P>[];
    Function: 'odata.concat';
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
    $Not: [ConditionalCheckOrValue];
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
    If: IfAnnotationExpressionValue<P>;
    getValue(): P;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AndAnnotationExpression<P> = {
    type: 'And';
    And: AndConditionalExpression[];
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type OrAnnotationExpression<P> = {
    type: 'Or';
    Or: OrConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type EqAnnotationExpression<P> = {
    type: 'Eq';
    Eq: EqConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type NeAnnotationExpression<P> = {
    type: 'Ne';
    Ne: NeConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type NotAnnotationExpression<P> = {
    type: 'Not';
    Not: NotConditionalExpression;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GtAnnotationExpression<P> = {
    type: 'Gt';
    Gt: GtConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GeAnnotationExpression<P> = {
    type: 'Ge';
    Ge: GeConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type LtAnnotationExpression<P> = {
    type: 'Lt';
    Lt: LtConditionalExpression[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type LeAnnotationExpression<P> = {
    type: 'Le';
    Le: LeConditionalExpression[];
};

export type PropertyAnnotationValue<P> =
    | P
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
    | IfAnnotationExpression<P>;

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

export type EnumValue<P> = P | PathAnnotationExpression<P> | ApplyAnnotationExpression<P> | IfAnnotationExpression<P>;

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

export type ComplexType = {
    _type: 'ComplexType';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    properties: Property[];
    navigationProperties: NavigationProperty[];
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
    partner: string;
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
    entityProperties: Property[];
    keys: Property[];
    navigationProperties: NavigationProperty[];
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
    navigationPropertyBinding: Record<string, Singleton | EntitySet>; //above for entity set?
    annotations: SingletonAnnotations;
};

export type EntityContainer = {
    _type: 'EntityContainer';
    name?: string;
    fullyQualifiedName: string;
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
export type Action = {
    _type: 'Action';
    name: SimpleIdentifier;
    fullyQualifiedName: SimpleIdentifier;
    isBound: boolean;
    sourceType: string;
    returnType: string;
    isFunction: boolean;
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

export type ResolutionTarget<T> = {
    target: null | T;
    objectPath: ServiceObjectAndAnnotation[];
};

export type Reference = {
    uri: string;
    alias: string;
    namespace: string;
};

export type ConvertedMetadata = {
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

// All the Raw types are meant for usage when providing data to the converter

// Removes things which will be provided by the converter, annotations, targetType and other things to improve usability
type RemoveAnnotationAndType<T> = {
    [K in keyof Omit<
        T,
        'annotations' | 'targetType' | 'isKey' | 'resolvePath' | 'entityType' | 'navigationProperties'
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
    entityTypes: RawEntityType[];
};

export type RawAction = RemoveAnnotationAndType<Action>;
export type RawEntityType = RemoveAnnotationAndType<EntityType> & {
    navigationProperties: (RawV2NavigationProperty | RawV4NavigationProperty)[];
};
export type RawEntitySet = RemoveAnnotationAndType<EntitySet>;
export type RawProperty = RemoveAnnotationAndType<Property>;
export type RawSingleton = RemoveAnnotationAndType<Singleton>;
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
