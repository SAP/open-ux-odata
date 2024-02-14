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
