declare namespace EDMX {
    type MaybeArray<T> = T | T[];
    export type String = string;

    type InstancePath = {
        _text: string;
    };

    type Boolean = boolean;
    type Byte = number;
    type Int16 = number;
    type Int32 = number;
    type Int64 = number;
    type Time = string;
    type Binary = string;
    type Decimal = number;
    type Double = number;

    type Date = string;
    type Guid = any;
    type Duration = any;
    type DateTimeOffset = any;
    type ComplexType = {
        Property: MaybeArray<Property>;
        NavigationProperty: MaybeArray<NavigationProperty>;
        _attributes: {
            Name: string;
        };
    };

    type TypeDefinition = {
        _attributes: {
            Name: string;
            UnderlyingType: string;
        };
    };
    type GeographyPoint = any;

    type ModelPath = {
        _text: string;
    };

    export interface Edmx {
        'edmx:Edmx': {
            'edmx:DataServices': {
                Schema: Schema;
            };
            'edmx:Reference': MaybeArray<Reference>;
            _attributes: {
                Version: string;
            };
        };
    }

    export interface ReferenceInclude {
        _attributes: {
            Alias: string;
            Namespace: string;
        };
    }

    export interface Reference {
        _attributes: {
            Uri: string;
        };
        'edmx:Include': ReferenceInclude;
    }

    export interface EntityContainer {
        _attributes: {
            Name: string;
        };
        EntitySet: MaybeArray<EntitySet>;
        Singleton: MaybeArray<Singleton>;
        AssociationSet?: MaybeArray<AssociationSet>;
        FunctionImport?: MaybeArray<FunctionImportV2 | FunctionImport>;
        ActionImport: MaybeArray<ActionImport>;
    }

    export interface ReturnType {
        _attributes: {
            Type: string;
        };
    }

    export interface Parameter {
        _attributes: {
            Name: string;
            Type: string;
            Nullable: string;
            MaxLength: string;
            Precision: string;
            Scale: string;
        };
    }

    export interface FunctionImportParameter {
        _attributes: {
            Name: string;
            Type: string;
            Mode: string;
            Nullable: string;
            MaxLength: string;
        };
    }

    /**
     * OData 2.x FunctionImport
     */
    export interface FunctionImportV2 {
        _attributes: {
            Name: string;
            ReturnType: string;
            EntitySet: string;
        };
        Parameter: MaybeArray<FunctionImportParameter>;
    }

    /**
     * OData 4.x FunctionImport
     */
    export interface FunctionImport {
        _attributes: {
            Name: string;
            Function: string;
            EntitySet?: string;
        };
    }

    /**
     * OData 4.x ActionImport
     */
    export interface ActionImport {
        _attributes: {
            Name: string;
            Action: string;
            EntitySet?: string;
        };
    }

    export interface Action {
        _attributes: {
            Name: string;
            IsBound: string;
            EntitySetPath: string;
        };
        Parameter: MaybeArray<Parameter>;
        ReturnType: ReturnType;
    }

    export interface Function {
        _attributes: {
            Name: string;
            IsBound: string;
            EntitySetPath: string;
        };
        Parameter: MaybeArray<Parameter>;
        ReturnType: ReturnType;
    }

    export interface Schema {
        Annotations?: MaybeArray<AnnotationList>;
        EntityType?: MaybeArray<EntityType>;
        ComplexType?: MaybeArray<ComplexType>;
        TypeDefinition?: MaybeArray<TypeDefinition>;
        EntityContainer: EntityContainer;
        Action?: MaybeArray<Action>;
        Function?: MaybeArray<Function>;
        Association?: MaybeArray<Association>;
        _attributes: {
            Namespace: string;
            Alias: string;
        };
    }

    export interface PropertyValue {
        _attributes: InlineExpression & {
            Property: string;
        };
        Annotation?: Annotation[];
    }

    export interface RecordExpression {
        PropertyValue?: MaybeArray<PropertyValue>;
        Annotation?: MaybeArray<Annotation>;
        _attributes: {
            Type: string;
        };
    }

    export interface Association {
        _attributes: {
            Name: string;
        };
        End?: AssociationEnd[];
        ReferentialConstraint?: MaybeArray<V2ReferentialConstraint>;
    }

    export interface AssociationEnd {
        _attributes: {
            Role: string;
            Multiplicity: string;
            Type: string;
        };
    }

    export interface EntityType {
        Key: {
            PropertyRef: MaybeArray<PropertyRef>;
        };
        Property: MaybeArray<Property>;
        NavigationProperty: MaybeArray<NavigationProperty>;
        _attributes: {
            Name: string;
        };
    }

    export interface NavigationPropertyBinding {
        _attributes: {
            Path: string;
            Target: string;
        };
    }

    export interface EntitySet {
        NavigationPropertyBinding: MaybeArray<NavigationPropertyBinding>;
        _attributes: {
            Name: string;
            EntityType: string;
        };
    }

    export interface Singleton {
        NavigationPropertyBinding: MaybeArray<NavigationPropertyBinding>;
        _attributes: {
            Name: string;
            Type: string;
            Nullable: string;
        };
    }

    export interface AssociationSet {
        _attributes: {
            Name: string;
            Association: string;
        };
        End?: AssociationSetEnd[];
    }

    export interface AssociationSetEnd {
        _attributes: {
            Role: string;
            EntitySet: string;
        };
    }

    export interface PropertyRef {
        _attributes: {
            Name: string;
        };
    }

    export interface Property {
        _attributes: {
            Name: string;
            Type: string;
            Nullable: string;
            DefaultValue: string;
            MaxLength: string;
            Precision: string;
            Scale: string;
        };
    }

    export type NavigationPropertyAttributesV2 = {
        Name: string;
        Relationship: string;
        ToRole: string;
        FromRole: string;
    };

    export type NavigationPropertyAttributesV4 = {
        Name: string;
        Type: string;
        Partner: string;
        ContainsTarget: string;
    };

    export interface NavigationProperty {
        _attributes: NavigationPropertyAttributesV2 | NavigationPropertyAttributesV4;
        ReferentialConstraint?: ReferentialConstraint;
    }

    export interface ReferentialConstraint {
        _attributes: {
            Property: string;
            ReferencedProperty: string;
        };
    }

    export interface V2ReferentialConstraint {
        Dependent: {
            PropertyRef: {
                _attributes: {
                    Name: string;
                };
            };
            _attributes: {
                Role: string;
            };
        };
        Principal: {
            PropertyRef: {
                _attributes: {
                    Name: string;
                };
            };
            _attributes: {
                Role: string;
            };
        };
    }

    export type BinaryWrapper = Record<'Binary', Binary>;
    export type BoolWrapper = Record<'Bool', string>;
    export type DateWrapperWrapper = Record<'Date', Date>;
    export type DateTimeOffsetWrapper = Record<'DateTimeOffset', any>;
    export type DecimalWrapper = Record<'Decimal', string>;
    export type DoubleWrapper = Record<'Double', string>;
    export type DurationWrapper = Record<'Duration', any>;
    export type EnumMemberWrapper = Record<'EnumMember', string>;
    export type FloatWrapper = Record<'Float', number>;
    export type GuidWrapper = Record<'Guid', any>;
    export type IntWrapper = Record<'Int', string>;
    export type StringWrapper = Record<'String', string>;
    export type LabeledElementWrapper = Record<'LabeledElement', string>;
    export type TimeOfDayWrapper = Record<'TimeOfDay', Time>;
    export type AnnotationPathWrapper = Record<'AnnotationPath', ModelPath>;
    export type AnnotationPathInlineWrapper = Record<'AnnotationPath', string>;
    export type ModelElementPathWrapper = Record<'ModelElementPath', ModelPath>;
    export type NavigationPropertyPathWrapper = Record<'NavigationPropertyPath', ModelPath>;
    export type NavigationPropertyPathInlineWrapper = Record<'NavigationPropertyPath', string>;
    export type PathWrapper = Record<'Path', InstancePath>;
    export type PathInlineWrapper = Record<'Path', string>;
    export type PropertyPathWrapper = Record<'PropertyPath', ModelPath>;
    export type PropertyPathInlineWrapper = Record<'PropertyPath', string>;
    export type UrlRefWrapper = Record<'UrlRef', URL>;
    export type RecordWrapper = Record<'Record', RecordExpression>;
    export type CollectionWrapper = Record<'Collection', CollectionExpression>;
    export type ApplyWrapper = {
        Apply: ApplyExpression;
        Function: ApplyExpression;
    };
    export type AndWrapper = Record<'And', ApplyExpression>;
    export type NotWrapper = Record<'Not', ApplyExpression>;
    export type NeWrapper = Record<'Ne', ApplyExpression>;
    export type EqWrapper = Record<'Eq', ApplyExpression>;
    export type OrWrapper = Record<'Or', ApplyExpression>;
    export type IfWrapper = Record<'If', IfExpression>;
    export type LtWrapper = Record<'Lt', IfExpression>;
    export type LeWrapper = Record<'Le', IfExpression>;
    export type GeWrapper = Record<'Ge', IfExpression>;
    export type GtWrapper = Record<'Gt', IfExpression>;

    // <Apply Function="odata.fillUriTemplate">
    // 	<String>#SupplierActivity-change?SupplierActivity={RSP}</String>
    // 	<LabeledElement Name="RSP" Path="SupplierActivity"/>
    // </Apply>

    export type ApplyExpression = any;
    export type IfExpression = [ConditionalCheck, OutType, OutType];

    export type InlineExpression = Partial<
        BinaryWrapper &
            BoolWrapper &
            DateWrapperWrapper &
            DateTimeOffsetWrapper &
            DecimalWrapper &
            DoubleWrapper &
            DurationWrapper &
            EnumMemberWrapper &
            FloatWrapper &
            GuidWrapper &
            IntWrapper &
            StringWrapper &
            TimeOfDayWrapper &
            AnnotationPathInlineWrapper &
            ModelElementPathWrapper &
            NavigationPropertyPathInlineWrapper &
            PathInlineWrapper &
            PropertyPathInlineWrapper &
            UrlRefWrapper &
            RecordWrapper &
            ApplyWrapper &
            IfWrapper &
            EqWrapper &
            AndWrapper &
            OrWrapper &
            NotWrapper &
            NeWrapper &
            GeWrapper &
            GtWrapper &
            LeWrapper &
            LtWrapper &
            CollectionWrapper
    >;

    export type Expression<T> = Partial<
        BinaryWrapper &
            BoolWrapper &
            DateWrapperWrapper &
            DateTimeOffsetWrapper &
            DecimalWrapper &
            DoubleWrapper &
            DurationWrapper &
            EnumMemberWrapper &
            FloatWrapper &
            GuidWrapper &
            IntWrapper &
            StringWrapper &
            LabeledElementWrapper &
            TimeOfDayWrapper &
            AnnotationPathWrapper &
            ModelElementPathWrapper &
            NavigationPropertyPathWrapper &
            PathWrapper &
            PropertyPathWrapper &
            UrlRefWrapper &
            RecordWrapper &
            ApplyWrapper &
            IfWrapper &
            OrWrapper &
            AndWrapper &
            EqWrapper &
            NotWrapper &
            NeWrapper &
            GeWrapper &
            GtWrapper &
            LeWrapper &
            LtWrapper &
            CollectionWrapper
    > &
        T;

    export type BinaryCollectionWrapper = Record<'Binary', Binary[]>;
    export type BooleanCollectionWrapper = Record<'Boolean', Boolean[]>;
    export type DateCollectionWrapperCollectionWrapper = Record<'Date', Date[]>;
    export type DateTimeOffsetCollectionWrapper = Record<'DateTimeOffset', any[]>;
    export type DecimalCollectionWrapper = Record<'Decimal', number[]>;
    export type DoubleCollectionWrapper = Record<'Double', number[]>;
    export type DurationCollectionWrapper = Record<'Duration', any[]>;
    export type EnumMemberCollectionWrapper = Record<'EnumMember', any[]>;
    export type FloatCollectionWrapper = Record<'Float', number[]>;
    export type GuidCollectionWrapper = Record<'Guid', any[]>;
    export type IntCollectionWrapper = Record<'Int', number[]>;
    export type StringCollectionWrapper = Record<'String', ModelPath[]>;
    export type IfCollectionWrapper = Record<'If', any[]>;
    export type TimeOfDayCollectionWrapper = Record<'TimeOfDay', Time[]>;
    export type AnnotationPathCollectionWrapper = Record<'AnnotationPath', ModelPath[]>;
    export type ModelElementPathCollectionWrapper = Record<'ModelElementPath', ModelPath[]>;
    export type NavigationPropertyPathCollectionWrapper = Record<'NavigationPropertyPath', ModelPath[]>;
    export type PathCollectionWrapper = Record<'Path', ModelPath[]>;
    export type PropertyPathCollectionWrapper = Record<'PropertyPath', ModelPath[]>;
    export type UrlRefCollectionWrapper = Record<'UrlRef', URL[]>;
    export type RecordCollectionWrapper = Record<'Record', RecordExpression[]>;

    export type CollectionExpression =
        | BinaryCollectionWrapper
        | BooleanCollectionWrapper
        | DateCollectionWrapperCollectionWrapper
        | DateTimeOffsetCollectionWrapper
        | DecimalCollectionWrapper
        | DoubleCollectionWrapper
        | DurationCollectionWrapper
        | EnumMemberCollectionWrapper
        | FloatCollectionWrapper
        | GuidCollectionWrapper
        | IntCollectionWrapper
        | StringCollectionWrapper
        | TimeOfDayCollectionWrapper
        | AnnotationPathCollectionWrapper
        | ModelElementPathCollectionWrapper
        | NavigationPropertyPathCollectionWrapper
        | PathCollectionWrapper
        | PropertyPathCollectionWrapper
        | UrlRefCollectionWrapper
        | RecordCollectionWrapper;

    export type AnnotationAttribute = {
        _attributes: {
            Term: string;
            Qualifier?: string;
        } & InlineExpression;
    };
    export type Annotation = Expression<AnnotationAttribute> & {
        Annotation: Annotation[];
    };

    export interface AnnotationCollection {
        Record: MaybeArray<RecordExpression>;
        PropertyPath: {
            _text: string;
        };
        Path: MaybeArray<AnnotationPropertyPath>;
    }

    export type AnnotationPropertyPath = string;

    export interface AnnotationProperties {
        Path?: string;
        PropertyPath?: string;
        AnnotationPath?: string;
        NavigationPropertyPath?: string;
        String?: string;
        Bool?: string;
        EnumMember?: string;
        Decimal?: string;
        Double?: string;
    }

    export interface AnnotationList {
        _attributes: {
            Target: string;
        };
        Annotation: MaybeArray<Annotation>;
    }
}

declare module '@sap-ux/vocabularies/EDMX' {
    export = EDMX;
}
