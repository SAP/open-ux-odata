// PURE EDM Types
import type { EntityType as _EntityType, Action as _Action, Property, NavigationProperty } from './Converter';
import type { RecordAnnotations, TermAnnotations, AnnotationAnnotations } from './generated/Edm_Types';

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

export type InstancePath = string;
export type Byte = Number;
export type Int16 = Number;
export type Int32 = Number;
export type Int64 = Number;
export type Time = string;
export type Binary = string;
export type Decimal = Number;
export type Double = Number;

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

export type ComplexType = {
    annotations?: RecordAnnotations;
};

export type String = InstanceType<StringConstructor>;
export type Boolean = InstanceType<BooleanConstructor>;
export type EntityType = _EntityType;
export type Action = _Action;
