export type SimpleIdentifier = string;
export type FullyQualifiedName = string;

type GenericExpression<K extends keyof any, T> = {
    [P in K]: T;
} & {
    type: K;
};
type ArrayWithType<T, K> = T[] & { type?: K };

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
export type LabeledElementExpression = {
    type: 'LabeledElement';
    $Name: string;
    $LabeledElement: any;
};
export type BoolExpression = GenericExpression<'Bool', boolean>;
export type DecimalExpression = GenericExpression<'Decimal', number>;
export type DateExpression = GenericExpression<'Date', string>;
export type IntExpression = GenericExpression<'Int', number>;
export type FloatExpression = GenericExpression<'Float', number>;
export type PathExpression = GenericExpression<'Path', string>;
export type PropertyPathExpression = GenericExpression<'PropertyPath', string>;
export type AnnotationPathExpression = GenericExpression<'AnnotationPath', string>;
export type NavigationPropertyPathExpression = GenericExpression<'NavigationPropertyPath', string>;
export type EnumMemberExpression = GenericExpression<'EnumMember', string>;
export type CollectionExpression = GenericExpression<'Collection', Collection>;
export type RecordExpression = GenericExpression<'Record', AnnotationRecord>;
export type ApplyExpression = {
    type: 'Apply';
    $Apply: any;
    $Function: any;
};
export type IfExpression = {
    type: 'If';
    $If: [Expression, Expression, Expression];
};
export type AndExpression = {
    type: 'And';
    $And: [Expression, Expression];
};

export type OrExpression = {
    type: 'Or';
    $Or: [Expression, Expression];
};
export type LeExpression = {
    type: 'Le';
    $Le: [Expression, Expression];
};
export type LtExpression = {
    type: 'Lt';
    $Lt: [Expression, Expression];
};
export type GeExpression = {
    type: 'Ge';
    $Ge: [Expression, Expression];
};
export type GtExpression = {
    type: 'Gt';
    $Gt: [Expression, Expression];
};
export type EqExpression = {
    type: 'Eq';
    $Eq: [Expression, Expression];
};
export type NeExpression = {
    type: 'Ne';
    $Ne: [Expression, Expression];
};
export type NotExpression = {
    type: 'Not';
    $Not: Expression;
};
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
    | LabeledElementExpression
    | BoolExpression
    | DecimalExpression
    | FloatExpression
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
    | ArrayWithType<AnnotationRecord, 'Record'>
    | ArrayWithType<StringExpression, 'String'>
    | ArrayWithType<PropertyPathExpression, 'PropertyPath'>
    | ArrayWithType<PathExpression, 'Path'>
    | ArrayWithType<NavigationPropertyPathExpression, 'NavigationPropertyPath'>
    | ArrayWithType<AnnotationPathExpression, 'AnnotationPath'>
    | ArrayWithType<EnumMemberExpression, 'EnumMember'>
    | ArrayWithType<BoolExpression, 'Bool'>
    | ArrayWithType<DecimalExpression, 'Decimal'>
    | ArrayWithType<DateExpression, 'Date'>
    | ArrayWithType<IntExpression, 'Int'>
    | ArrayWithType<FloatExpression, 'Float'>
    | ArrayWithType<ApplyExpression, 'Apply'>
    | ArrayWithType<NullExpression, 'Null'>
    | ArrayWithType<IfExpression, 'If'>
    | ArrayWithType<AndExpression, 'And'>
    | ArrayWithType<OrExpression, 'Or'>
    | ArrayWithType<EqExpression, 'Eq'>
    | ArrayWithType<NotExpression, 'Not'>
    | ArrayWithType<NeExpression, 'Ne'>
    | ArrayWithType<GtExpression, 'Gt'>
    | ArrayWithType<GeExpression, 'Ge'>
    | ArrayWithType<LtExpression, 'Lt'>
    | ArrayWithType<LeExpression, 'Le'>;

export type AnnotationList = {
    target: FullyQualifiedName;
    annotations: RawAnnotation[];
};

export type RawAnnotation = {
    term: FullyQualifiedName;
    qualifier?: SimpleIdentifier;
    value?: Expression;
    collection?: Collection;
    record?: AnnotationRecord;
    annotations?: RawAnnotation[];
};

export type PropertyValue = {
    name: SimpleIdentifier;
    value: Expression;
    annotations?: RawAnnotation[];
};
export type AnnotationRecord = {
    type?: FullyQualifiedName;
    propertyValues: PropertyValue[];
    annotations?: RawAnnotation[];
};
