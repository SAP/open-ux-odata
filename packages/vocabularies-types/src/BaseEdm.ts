export type SimpleIdentifier = string;
export type FullyQualifiedName = string;

type GenericExpression<K extends keyof any, T> = {
    [P in K]: T;
} & {
    type: K;
};

export type Apply = any;
export type If = any;
export type And = any;
export type Or = any;
export type Not = any;
export type Le = any;
export type Lt = any;
export type Ge = any;
export type Gt = any;
export type Ne = any;
export type Eq = any;

export type StringExpression = GenericExpression<'String', string>;
export type BoolExpression = GenericExpression<'Bool', boolean>;
export type DecimalExpression = GenericExpression<'Decimal', number>;
export type DateExpression = GenericExpression<'Date', string>;
export type IntExpression = GenericExpression<'Int', number>;
export type PathExpression = GenericExpression<'Path', string>;
export type PropertyPathExpression = GenericExpression<'PropertyPath', string>;
export type AnnotationPathExpression = GenericExpression<'AnnotationPath', string>;
export type NavigationPropertyPathExpression = GenericExpression<'NavigationPropertyPath', string>;
export type EnumMemberExpression = GenericExpression<'EnumMember', string>;
export type CollectionExpression = GenericExpression<'Collection', Collection>;
export type RecordExpression = GenericExpression<'Record', AnnotationRecord>;
export type ApplyExpression = GenericExpression<'Apply', Apply>;
export type IfExpression = GenericExpression<'If', If>;
export type AndExpression = GenericExpression<'And', And>;
export type OrExpression = GenericExpression<'Or', Or>;
export type LeExpression = GenericExpression<'Le', Le>;
export type LtExpression = GenericExpression<'Lt', Lt>;
export type GeExpression = GenericExpression<'Ge', Ge>;
export type GtExpression = GenericExpression<'Gt', Gt>;
export type EqExpression = GenericExpression<'Eq', Eq>;
export type NeExpression = GenericExpression<'Ne', Ne>;
export type NotExpression = GenericExpression<'Not', Not>;
export type UnknownExpression = {
    type: 'Unknown';
};
export type NullExpression = {
    type: 'Null';
};
export type Expression =
    | NullExpression
    | UnknownExpression
    | StringExpression
    | BoolExpression
    | DecimalExpression
    | IntExpression
    | DateExpression
    | PathExpression
    | PropertyPathExpression
    | AnnotationPathExpression
    | NavigationPropertyPathExpression
    | EnumMemberExpression
    | CollectionExpression
    | RecordExpression
    | ApplyExpression
    | IfExpression
    | AndExpression
    | OrExpression
    | EqExpression
    | NotExpression
    | NeExpression
    | GtExpression
    | GeExpression
    | LtExpression
    | LeExpression;

export type Collection =
    | AnnotationRecord[]
    | string[]
    | PropertyPathExpression[]
    | PathExpression[]
    | NavigationPropertyPathExpression[]
    | AnnotationPathExpression[];

export type AnnotationList = {
    target: FullyQualifiedName;
    annotations: Annotation[];
};

export type Annotation = {
    term: FullyQualifiedName;
    qualifier?: SimpleIdentifier;
    value?: Expression;
    collection?: Collection;
    record?: AnnotationRecord;
    annotations?: Annotation[];
};

export type PropertyValue = {
    name: SimpleIdentifier;
    value: Expression;
    annotations?: Annotation[];
};
export type AnnotationRecord = {
    type?: FullyQualifiedName;
    propertyValues: PropertyValue[];
    annotations?: Annotation[];
};
