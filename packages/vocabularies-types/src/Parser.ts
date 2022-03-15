import type { AnnotationList, FullyQualifiedName, SimpleIdentifier } from './BaseEdm';

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
};

export type ComplexType = {
    _type: 'ComplexType';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    properties: Property[];
    navigationProperties: (V2NavigationProperty | V4NavigationProperty | GenericNavigationProperty)[];
};

export type TypeDefinition = {
    _type: 'TypeDefinition';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    underlyingType: string;
};

export type ReferentialConstraint = {
    sourceTypeName: FullyQualifiedName;
    sourceProperty: SimpleIdentifier;
    targetTypeName: FullyQualifiedName;
    targetProperty: SimpleIdentifier;
};

export type GenericNavigationProperty = {
    _type: 'NavigationProperty';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    targetTypeName: FullyQualifiedName;
};

export type V2NavigationProperty = {
    _type: 'NavigationProperty';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    relationship: FullyQualifiedName;
    toRole: SimpleIdentifier;
    fromRole: SimpleIdentifier;
    referentialConstraint?: ReferentialConstraint[];
};

export type V4NavigationProperty = GenericNavigationProperty & {
    partner: string;
    isCollection: boolean;
    containsTarget: boolean;
    referentialConstraint?: ReferentialConstraint[];
};

export type EntityType = {
    _type: 'EntityType';
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    entityProperties: Property[];
    keys: Property[];
    navigationProperties: (V2NavigationProperty | V4NavigationProperty | GenericNavigationProperty)[];
};

export type EntitySet = {
    _type: 'EntitySet';
    name: SimpleIdentifier;
    entityTypeName: FullyQualifiedName;
    navigationPropertyBinding: Record<string, EntitySet | Singleton>;
    fullyQualifiedName: SimpleIdentifier;
};

export type Singleton = {
    _type: 'Singleton';
    name: SimpleIdentifier;
    typeName: FullyQualifiedName;
    entityTypeName: FullyQualifiedName;
    nullable: boolean;
    navigationPropertyBinding: Record<string, Singleton | EntitySet>;
    fullyQualifiedName: SimpleIdentifier;
};

export type Action = {
    _type: 'Action';
    name: SimpleIdentifier;
    fullyQualifiedName: SimpleIdentifier;
    isBound: boolean;
    sourceType: string;
    returnType: string;
    isFunction: boolean;
    parameters: {
        _type: 'ActionParameter';
        name: string;
        isEntitySet: boolean;
        fullyQualifiedName: string;
        type: string;
    }[];
};

// Parser Types

export type Association = {
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    associationEnd: AssociationEnd[];
    referentialConstraints: ReferentialConstraint[];
};

export type AssociationSet = {
    name: SimpleIdentifier;
    fullyQualifiedName: FullyQualifiedName;
    association: string;
    associationEnd: AssociationSetEnd[];
};

export enum Multiplicity {
    One = '1',
    ZeroOrOne = '0..1',
    Many = '*',
    Unknown = 'unknown'
}

export type AssociationEnd = {
    type: FullyQualifiedName;
    role: SimpleIdentifier;
    multiplicity: Multiplicity;
};

export type AssociationSetEnd = {
    entitySet: FullyQualifiedName;
    role: SimpleIdentifier;
};

export type EntityContainer = {
    name?: string;
    fullyQualifiedName?: string;
};

export type Schema = {
    namespace: string;
    associations: Association[];
    associationSets: AssociationSet[];
    annotations: { [id: string]: AnnotationList[] };
    entitySets: EntitySet[];
    singletons: Singleton[];
    complexTypes: ComplexType[];
    typeDefinitions: TypeDefinition[];
    entityContainer: EntityContainer;
    actions: Action[];
    entityTypes: EntityType[];
};

export type Reference = {
    uri: string;
    alias: string;
    namespace: string;
};

export type ParserOutput = {
    identification: string;
    version: string;
    schema: Schema;
    references: Reference[];
};
