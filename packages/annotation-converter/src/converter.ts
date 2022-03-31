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
    ServiceObjectAndAnnotation,
    ResolutionTarget,
    EntityContainer,
    RawAssociationEnd,
    RawAnnotation
} from '@sap-ux/vocabularies-types';
import type { ReferencesWithMap } from './utils';
import { defaultReferences, unalias } from './utils';

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
     * @param annotationType
     * @param term
     */
    constructor(
        pathExpression: PathExpression,
        targetName: string,
        annotationsTerm: string,
        annotationType: string,
        term: string
    ) {
        this.path = pathExpression.Path;
        this.type = 'Path';
        this.$target = targetName;
        this.term = term;
        this.annotationType = annotationType;
        this.annotationsTerm = annotationsTerm;
    }
}

enum TermToTypes {
    'Org.OData.Authorization.V1.SecuritySchemes' = 'Org.OData.Authorization.V1.SecurityScheme',
    'Org.OData.Authorization.V1.Authorizations' = 'Org.OData.Authorization.V1.Authorization',
    'Org.OData.Core.V1.Revisions' = 'Org.OData.Core.V1.RevisionType',
    'Org.OData.Core.V1.Links' = 'Org.OData.Core.V1.Link',
    'Org.OData.Core.V1.Example' = 'Org.OData.Core.V1.ExampleValue',
    'Org.OData.Core.V1.Messages' = 'Org.OData.Core.V1.MessageType',
    'Org.OData.Core.V1.ValueException' = 'Org.OData.Core.V1.ValueExceptionType',
    'Org.OData.Core.V1.ResourceException' = 'Org.OData.Core.V1.ResourceExceptionType',
    'Org.OData.Core.V1.DataModificationException' = 'Org.OData.Core.V1.DataModificationExceptionType',
    'Org.OData.Core.V1.IsLanguageDependent' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.DereferenceableIDs' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.ConventionalIDs' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.Permissions' = 'Org.OData.Core.V1.Permission',
    'Org.OData.Core.V1.DefaultNamespace' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.Immutable' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.Computed' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.ComputedDefaultValue' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.IsURL' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.IsMediaType' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.ContentDisposition' = 'Org.OData.Core.V1.ContentDispositionType',
    'Org.OData.Core.V1.OptimisticConcurrency' = 'Edm.PropertyPath',
    'Org.OData.Core.V1.AdditionalProperties' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.AutoExpand' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.AutoExpandReferences' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.MayImplement' = 'Org.OData.Core.V1.QualifiedTypeName',
    'Org.OData.Core.V1.Ordered' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.PositionalInsert' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Core.V1.AlternateKeys' = 'Org.OData.Core.V1.AlternateKey',
    'Org.OData.Core.V1.OptionalParameter' = 'Org.OData.Core.V1.OptionalParameterType',
    'Org.OData.Core.V1.OperationAvailable' = 'Edm.Boolean',
    'Org.OData.Core.V1.SymbolicName' = 'Org.OData.Core.V1.SimpleIdentifier',
    'Org.OData.Capabilities.V1.ConformanceLevel' = 'Org.OData.Capabilities.V1.ConformanceLevelType',
    'Org.OData.Capabilities.V1.AsynchronousRequestsSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.BatchContinueOnErrorSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.IsolationSupported' = 'Org.OData.Capabilities.V1.IsolationLevel',
    'Org.OData.Capabilities.V1.CrossJoinSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.CallbackSupported' = 'Org.OData.Capabilities.V1.CallbackType',
    'Org.OData.Capabilities.V1.ChangeTracking' = 'Org.OData.Capabilities.V1.ChangeTrackingType',
    'Org.OData.Capabilities.V1.CountRestrictions' = 'Org.OData.Capabilities.V1.CountRestrictionsType',
    'Org.OData.Capabilities.V1.NavigationRestrictions' = 'Org.OData.Capabilities.V1.NavigationRestrictionsType',
    'Org.OData.Capabilities.V1.IndexableByKey' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.TopSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.SkipSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.ComputeSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.SelectSupport' = 'Org.OData.Capabilities.V1.SelectSupportType',
    'Org.OData.Capabilities.V1.BatchSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.BatchSupport' = 'Org.OData.Capabilities.V1.BatchSupportType',
    'Org.OData.Capabilities.V1.FilterRestrictions' = 'Org.OData.Capabilities.V1.FilterRestrictionsType',
    'Org.OData.Capabilities.V1.SortRestrictions' = 'Org.OData.Capabilities.V1.SortRestrictionsType',
    'Org.OData.Capabilities.V1.ExpandRestrictions' = 'Org.OData.Capabilities.V1.ExpandRestrictionsType',
    'Org.OData.Capabilities.V1.SearchRestrictions' = 'Org.OData.Capabilities.V1.SearchRestrictionsType',
    'Org.OData.Capabilities.V1.KeyAsSegmentSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.QuerySegmentSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.InsertRestrictions' = 'Org.OData.Capabilities.V1.InsertRestrictionsType',
    'Org.OData.Capabilities.V1.DeepInsertSupport' = 'Org.OData.Capabilities.V1.DeepInsertSupportType',
    'Org.OData.Capabilities.V1.UpdateRestrictions' = 'Org.OData.Capabilities.V1.UpdateRestrictionsType',
    'Org.OData.Capabilities.V1.DeepUpdateSupport' = 'Org.OData.Capabilities.V1.DeepUpdateSupportType',
    'Org.OData.Capabilities.V1.DeleteRestrictions' = 'Org.OData.Capabilities.V1.DeleteRestrictionsType',
    'Org.OData.Capabilities.V1.CollectionPropertyRestrictions' = 'Org.OData.Capabilities.V1.CollectionPropertyRestrictionsType',
    'Org.OData.Capabilities.V1.OperationRestrictions' = 'Org.OData.Capabilities.V1.OperationRestrictionsType',
    'Org.OData.Capabilities.V1.AnnotationValuesInQuerySupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Capabilities.V1.ModificationQueryOptions' = 'Org.OData.Capabilities.V1.ModificationQueryOptionsType',
    'Org.OData.Capabilities.V1.ReadRestrictions' = 'Org.OData.Capabilities.V1.ReadRestrictionsType',
    'Org.OData.Capabilities.V1.CustomHeaders' = 'Org.OData.Capabilities.V1.CustomParameter',
    'Org.OData.Capabilities.V1.CustomQueryOptions' = 'Org.OData.Capabilities.V1.CustomParameter',
    'Org.OData.Capabilities.V1.MediaLocationUpdateSupported' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Aggregation.V1.ApplySupported' = 'Org.OData.Aggregation.V1.ApplySupportedType',
    'Org.OData.Aggregation.V1.Groupable' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Aggregation.V1.Aggregatable' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Aggregation.V1.ContextDefiningProperties' = 'Edm.PropertyPath',
    'Org.OData.Aggregation.V1.LeveledHierarchy' = 'Edm.PropertyPath',
    'Org.OData.Aggregation.V1.RecursiveHierarchy' = 'Org.OData.Aggregation.V1.RecursiveHierarchyType',
    'Org.OData.Aggregation.V1.AvailableOnAggregates' = 'Org.OData.Aggregation.V1.AvailableOnAggregatesType',
    'Org.OData.Validation.V1.Minimum' = 'Edm.PrimitiveType',
    'Org.OData.Validation.V1.Maximum' = 'Edm.PrimitiveType',
    'Org.OData.Validation.V1.Exclusive' = 'Org.OData.Core.V1.Tag',
    'Org.OData.Validation.V1.AllowedValues' = 'Org.OData.Validation.V1.AllowedValue',
    'Org.OData.Validation.V1.MultipleOf' = 'Edm.Decimal',
    'Org.OData.Validation.V1.Constraint' = 'Org.OData.Validation.V1.ConstraintType',
    'Org.OData.Validation.V1.ItemsOf' = 'Org.OData.Validation.V1.ItemsOfType',
    'Org.OData.Validation.V1.OpenPropertyTypeConstraint' = 'Org.OData.Core.V1.QualifiedTypeName',
    'Org.OData.Validation.V1.DerivedTypeConstraint' = 'Org.OData.Core.V1.QualifiedTypeName',
    'Org.OData.Validation.V1.AllowedTerms' = 'Org.OData.Core.V1.QualifiedTermName',
    'Org.OData.Validation.V1.ApplicableTerms' = 'Org.OData.Core.V1.QualifiedTermName',
    'Org.OData.Validation.V1.MaxItems' = 'Edm.Int64',
    'Org.OData.Validation.V1.MinItems' = 'Edm.Int64',
    'Org.OData.Measures.V1.Scale' = 'Edm.Byte',
    'Org.OData.Measures.V1.DurationGranularity' = 'Org.OData.Measures.V1.DurationGranularityType',
    'com.sap.vocabularies.Analytics.v1.Dimension' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Analytics.v1.Measure' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Analytics.v1.AccumulativeMeasure' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Analytics.v1.RolledUpPropertyCount' = 'Edm.Int16',
    'com.sap.vocabularies.Analytics.v1.PlanningAction' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Analytics.v1.AggregatedProperties' = 'com.sap.vocabularies.Analytics.v1.AggregatedPropertyType',
    'com.sap.vocabularies.Common.v1.ServiceVersion' = 'Edm.Int32',
    'com.sap.vocabularies.Common.v1.ServiceSchemaVersion' = 'Edm.Int32',
    'com.sap.vocabularies.Common.v1.TextFor' = 'Edm.PropertyPath',
    'com.sap.vocabularies.Common.v1.IsLanguageIdentifier' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.TextFormat' = 'com.sap.vocabularies.Common.v1.TextFormatType',
    'com.sap.vocabularies.Common.v1.IsDigitSequence' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsUpperCase' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCurrency' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsUnit' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.UnitSpecificScale' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.Common.v1.UnitSpecificPrecision' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.Common.v1.SecondaryKey' = 'Edm.PropertyPath',
    'com.sap.vocabularies.Common.v1.MinOccurs' = 'Edm.Int64',
    'com.sap.vocabularies.Common.v1.MaxOccurs' = 'Edm.Int64',
    'com.sap.vocabularies.Common.v1.AssociationEntity' = 'Edm.NavigationPropertyPath',
    'com.sap.vocabularies.Common.v1.DerivedNavigation' = 'Edm.NavigationPropertyPath',
    'com.sap.vocabularies.Common.v1.Masked' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.MaskedAlways' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.SemanticObjectMapping' = 'com.sap.vocabularies.Common.v1.SemanticObjectMappingType',
    'com.sap.vocabularies.Common.v1.IsInstanceAnnotation' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.FilterExpressionRestrictions' = 'com.sap.vocabularies.Common.v1.FilterExpressionRestrictionType',
    'com.sap.vocabularies.Common.v1.FieldControl' = 'com.sap.vocabularies.Common.v1.FieldControlType',
    'com.sap.vocabularies.Common.v1.Application' = 'com.sap.vocabularies.Common.v1.ApplicationType',
    'com.sap.vocabularies.Common.v1.Timestamp' = 'Edm.DateTimeOffset',
    'com.sap.vocabularies.Common.v1.ErrorResolution' = 'com.sap.vocabularies.Common.v1.ErrorResolutionType',
    'com.sap.vocabularies.Common.v1.Messages' = 'Edm.ComplexType',
    'com.sap.vocabularies.Common.v1.numericSeverity' = 'com.sap.vocabularies.Common.v1.NumericMessageSeverityType',
    'com.sap.vocabularies.Common.v1.MaximumNumericMessageSeverity' = 'com.sap.vocabularies.Common.v1.NumericMessageSeverityType',
    'com.sap.vocabularies.Common.v1.IsActionCritical' = 'Edm.Boolean',
    'com.sap.vocabularies.Common.v1.Attributes' = 'Edm.PropertyPath',
    'com.sap.vocabularies.Common.v1.RelatedRecursiveHierarchy' = 'Edm.AnnotationPath',
    'com.sap.vocabularies.Common.v1.Interval' = 'com.sap.vocabularies.Common.v1.IntervalType',
    'com.sap.vocabularies.Common.v1.ResultContext' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.WeakReferentialConstraint' = 'com.sap.vocabularies.Common.v1.WeakReferentialConstraintType',
    'com.sap.vocabularies.Common.v1.IsNaturalPerson' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.ValueList' = 'com.sap.vocabularies.Common.v1.ValueListType',
    'com.sap.vocabularies.Common.v1.ValueListRelevantQualifiers' = 'com.sap.vocabularies.Common.v1.SimpleIdentifier',
    'com.sap.vocabularies.Common.v1.ValueListWithFixedValues' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.ValueListMapping' = 'com.sap.vocabularies.Common.v1.ValueListMappingType',
    'com.sap.vocabularies.Common.v1.IsCalendarYear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarHalfyear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarQuarter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarMonth' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarWeek' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsDayOfCalendarMonth' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsDayOfCalendarYear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarYearHalfyear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarYearQuarter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarYearMonth' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarYearWeek' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsCalendarDate' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalYear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalPeriod' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalYearPeriod' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalQuarter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalYearQuarter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalWeek' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalYearWeek' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsDayOfFiscalYear' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsFiscalYearVariant' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.DraftRoot' = 'com.sap.vocabularies.Common.v1.DraftRootType',
    'com.sap.vocabularies.Common.v1.DraftNode' = 'com.sap.vocabularies.Common.v1.DraftNodeType',
    'com.sap.vocabularies.Common.v1.DraftActivationVia' = 'com.sap.vocabularies.Common.v1.SimpleIdentifier',
    'com.sap.vocabularies.Common.v1.EditableFieldFor' = 'Edm.PropertyPath',
    'com.sap.vocabularies.Common.v1.SemanticKey' = 'Edm.PropertyPath',
    'com.sap.vocabularies.Common.v1.SideEffects' = 'com.sap.vocabularies.Common.v1.SideEffectsType',
    'com.sap.vocabularies.Common.v1.DefaultValuesFunction' = 'com.sap.vocabularies.Common.v1.QualifiedName',
    'com.sap.vocabularies.Common.v1.FilterDefaultValue' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.Common.v1.FilterDefaultValueHigh' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.Common.v1.SortOrder' = 'com.sap.vocabularies.Common.v1.SortOrderType',
    'com.sap.vocabularies.Common.v1.RecursiveHierarchy' = 'com.sap.vocabularies.Common.v1.RecursiveHierarchyType',
    'com.sap.vocabularies.Common.v1.CreatedAt' = 'Edm.DateTimeOffset',
    'com.sap.vocabularies.Common.v1.CreatedBy' = 'com.sap.vocabularies.Common.v1.UserID',
    'com.sap.vocabularies.Common.v1.ChangedAt' = 'Edm.DateTimeOffset',
    'com.sap.vocabularies.Common.v1.ChangedBy' = 'com.sap.vocabularies.Common.v1.UserID',
    'com.sap.vocabularies.Common.v1.ApplyMultiUnitBehaviorForSortingAndFiltering' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.CodeList.v1.CurrencyCodes' = 'com.sap.vocabularies.CodeList.v1.CodeListSource',
    'com.sap.vocabularies.CodeList.v1.UnitsOfMeasure' = 'com.sap.vocabularies.CodeList.v1.CodeListSource',
    'com.sap.vocabularies.CodeList.v1.StandardCode' = 'Edm.PropertyPath',
    'com.sap.vocabularies.CodeList.v1.ExternalCode' = 'Edm.PropertyPath',
    'com.sap.vocabularies.CodeList.v1.IsConfigurationDeprecationCode' = 'Edm.Boolean',
    'com.sap.vocabularies.Communication.v1.Contact' = 'com.sap.vocabularies.Communication.v1.ContactType',
    'com.sap.vocabularies.Communication.v1.Address' = 'com.sap.vocabularies.Communication.v1.AddressType',
    'com.sap.vocabularies.Communication.v1.IsEmailAddress' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Communication.v1.IsPhoneNumber' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Communication.v1.Event' = 'com.sap.vocabularies.Communication.v1.EventData',
    'com.sap.vocabularies.Communication.v1.Task' = 'com.sap.vocabularies.Communication.v1.TaskData',
    'com.sap.vocabularies.Communication.v1.Message' = 'com.sap.vocabularies.Communication.v1.MessageData',
    'com.sap.vocabularies.Hierarchy.v1.RecursiveHierarchy' = 'com.sap.vocabularies.Hierarchy.v1.RecursiveHierarchyType',
    'com.sap.vocabularies.PersonalData.v1.EntitySemantics' = 'com.sap.vocabularies.PersonalData.v1.EntitySemanticsType',
    'com.sap.vocabularies.PersonalData.v1.FieldSemantics' = 'com.sap.vocabularies.PersonalData.v1.FieldSemanticsType',
    'com.sap.vocabularies.PersonalData.v1.IsPotentiallyPersonal' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.PersonalData.v1.IsPotentiallySensitive' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Session.v1.StickySessionSupported' = 'com.sap.vocabularies.Session.v1.StickySessionSupportedType',
    'com.sap.vocabularies.UI.v1.HeaderInfo' = 'com.sap.vocabularies.UI.v1.HeaderInfoType',
    'com.sap.vocabularies.UI.v1.Identification' = 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
    'com.sap.vocabularies.UI.v1.Badge' = 'com.sap.vocabularies.UI.v1.BadgeType',
    'com.sap.vocabularies.UI.v1.LineItem' = 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
    'com.sap.vocabularies.UI.v1.StatusInfo' = 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
    'com.sap.vocabularies.UI.v1.FieldGroup' = 'com.sap.vocabularies.UI.v1.FieldGroupType',
    'com.sap.vocabularies.UI.v1.ConnectedFields' = 'com.sap.vocabularies.UI.v1.ConnectedFieldsType',
    'com.sap.vocabularies.UI.v1.GeoLocations' = 'com.sap.vocabularies.UI.v1.GeoLocationType',
    'com.sap.vocabularies.UI.v1.GeoLocation' = 'com.sap.vocabularies.UI.v1.GeoLocationType',
    'com.sap.vocabularies.UI.v1.Contacts' = 'Edm.AnnotationPath',
    'com.sap.vocabularies.UI.v1.MediaResource' = 'com.sap.vocabularies.UI.v1.MediaResourceType',
    'com.sap.vocabularies.UI.v1.DataPoint' = 'com.sap.vocabularies.UI.v1.DataPointType',
    'com.sap.vocabularies.UI.v1.KPI' = 'com.sap.vocabularies.UI.v1.KPIType',
    'com.sap.vocabularies.UI.v1.Chart' = 'com.sap.vocabularies.UI.v1.ChartDefinitionType',
    'com.sap.vocabularies.UI.v1.ValueCriticality' = 'com.sap.vocabularies.UI.v1.ValueCriticalityType',
    'com.sap.vocabularies.UI.v1.CriticalityLabels' = 'com.sap.vocabularies.UI.v1.CriticalityLabelType',
    'com.sap.vocabularies.UI.v1.SelectionFields' = 'Edm.PropertyPath',
    'com.sap.vocabularies.UI.v1.Facets' = 'com.sap.vocabularies.UI.v1.Facet',
    'com.sap.vocabularies.UI.v1.HeaderFacets' = 'com.sap.vocabularies.UI.v1.Facet',
    'com.sap.vocabularies.UI.v1.QuickViewFacets' = 'com.sap.vocabularies.UI.v1.Facet',
    'com.sap.vocabularies.UI.v1.QuickCreateFacets' = 'com.sap.vocabularies.UI.v1.Facet',
    'com.sap.vocabularies.UI.v1.FilterFacets' = 'com.sap.vocabularies.UI.v1.ReferenceFacet',
    'com.sap.vocabularies.UI.v1.SelectionPresentationVariant' = 'com.sap.vocabularies.UI.v1.SelectionPresentationVariantType',
    'com.sap.vocabularies.UI.v1.PresentationVariant' = 'com.sap.vocabularies.UI.v1.PresentationVariantType',
    'com.sap.vocabularies.UI.v1.SelectionVariant' = 'com.sap.vocabularies.UI.v1.SelectionVariantType',
    'com.sap.vocabularies.UI.v1.ThingPerspective' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.IsSummary' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.PartOfPreview' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.Map' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.Gallery' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.IsImageURL' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.IsImage' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.MultiLineText' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.TextArrangement' = 'com.sap.vocabularies.UI.v1.TextArrangementType',
    'com.sap.vocabularies.UI.v1.Importance' = 'com.sap.vocabularies.UI.v1.ImportanceType',
    'com.sap.vocabularies.UI.v1.Hidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.CreateHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.UpdateHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.DeleteHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.HiddenFilter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.DataFieldDefault' = 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
    'com.sap.vocabularies.UI.v1.Criticality' = 'com.sap.vocabularies.UI.v1.CriticalityType',
    'com.sap.vocabularies.UI.v1.CriticalityCalculation' = 'com.sap.vocabularies.UI.v1.CriticalityCalculationType',
    'com.sap.vocabularies.UI.v1.Emphasized' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.OrderBy' = 'Edm.PropertyPath',
    'com.sap.vocabularies.UI.v1.ParameterDefaultValue' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.UI.v1.RecommendationState' = 'com.sap.vocabularies.UI.v1.RecommendationStateType',
    'com.sap.vocabularies.UI.v1.RecommendationList' = 'com.sap.vocabularies.UI.v1.RecommendationListType',
    'com.sap.vocabularies.UI.v1.ExcludeFromNavigationContext' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.HTML5.v1.CssDefaults' = 'com.sap.vocabularies.HTML5.v1.CssDefaultsType'
}

/**
 * Transform an unaliased string representation annotation to the aliased version.
 *
 * @param references currentReferences for the project
 * @param unaliasedValue the unaliased value
 * @returns the aliased string representing the same
 */
function alias(references: ReferencesWithMap, unaliasedValue: string): string {
    if (!references.reverseReferenceMap) {
        references.reverseReferenceMap = references.reduce((map: Record<string, Reference>, ref) => {
            map[ref.namespace] = ref;
            return map;
        }, {});
    }
    if (!unaliasedValue) {
        return unaliasedValue;
    }
    const lastDotIndex = unaliasedValue.lastIndexOf('.');
    const namespace = unaliasedValue.substring(0, lastDotIndex);
    const value = unaliasedValue.substring(lastDotIndex + 1);
    const reference = references.reverseReferenceMap[namespace];
    if (reference) {
        return `${reference.alias}.${value}`;
    } else if (unaliasedValue.indexOf('@') !== -1) {
        // Try to see if it's an annotation Path like to_SalesOrder/@UI.LineItem
        const [preAlias, ...postAlias] = unaliasedValue.split('@');
        return `${preAlias}@${alias(references, postAlias.join('@'))}`;
    } else {
        return unaliasedValue;
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
    if (rawMetadata.schema.entityContainer && rawMetadata.schema.entityContainer.fullyQualifiedName) {
        objectMap[rawMetadata.schema.entityContainer.fullyQualifiedName] = rawMetadata.schema.entityContainer;
    }
    rawMetadata.schema.entitySets.forEach((entitySet) => {
        objectMap[entitySet.fullyQualifiedName] = entitySet;
    });
    rawMetadata.schema.actions.forEach((action) => {
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

        action.parameters.forEach((parameter) => {
            objectMap[parameter.fullyQualifiedName] = parameter;
        });
    });
    rawMetadata.schema.complexTypes.forEach((complexType) => {
        objectMap[complexType.fullyQualifiedName] = complexType;
        complexType.properties.forEach((property) => {
            objectMap[property.fullyQualifiedName] = property;
        });
    });
    rawMetadata.schema.typeDefinitions.forEach((typeDefinition) => {
        objectMap[typeDefinition.fullyQualifiedName] = typeDefinition;
    });
    rawMetadata.schema.entityTypes.forEach((entityType) => {
        objectMap[entityType.fullyQualifiedName] = entityType;
        entityType.entityProperties.forEach((property) => {
            objectMap[property.fullyQualifiedName] = property;
            if (property.type.indexOf('Edm') !== 0) {
                // Handle complex types
                const complexTypeDefinition = objectMap[property.type] as ComplexType | TypeDefinition;
                if (
                    complexTypeDefinition &&
                    complexTypeDefinition._type === 'ComplexType' &&
                    complexTypeDefinition.properties
                ) {
                    complexTypeDefinition.properties.forEach((complexTypeProp) => {
                        const complexTypePropTarget: RawProperty = Object.assign(complexTypeProp, {
                            _type: 'Property',
                            fullyQualifiedName: property.fullyQualifiedName + '/' + complexTypeProp.name
                        });
                        objectMap[complexTypePropTarget.fullyQualifiedName] = complexTypePropTarget;
                    });
                }
            }
        });
        entityType.navigationProperties.forEach((navProperty) => {
            objectMap[navProperty.fullyQualifiedName] = navProperty;
        });
    });

    Object.keys(rawMetadata.schema.annotations).forEach((annotationSource) => {
        rawMetadata.schema.annotations[annotationSource].forEach((annotationList) => {
            const currentTargetName = unalias(rawMetadata.references, annotationList.target);
            annotationList.annotations.forEach((annotation) => {
                let annotationFQN = `${currentTargetName}@${unalias(rawMetadata.references, annotation.term)}`;
                if (annotation.qualifier) {
                    annotationFQN += `#${annotation.qualifier}`;
                }
                if (typeof annotation !== 'object') {
                    // debugger;
                }
                objectMap[annotationFQN] = annotation;
                (annotation as Annotation).fullyQualifiedName = annotationFQN;
            });
        });
    });
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
 * @param annotationType
 * @param annotationsTerm
 * @returns the resolved object
 */
function _resolveTarget(
    objectMap: any,
    currentTarget: any,
    path: string,
    pathOnly: boolean = false,
    includeVisitedObjects: boolean = false,
    annotationType?: string,
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
        if ((pathPart === '@$ui5.overload' || pathPart === '0') && currentValue._type === 'Action') {
            return currentValue;
        }
        if (pathPart.length === 0) {
            // Empty Path after an entitySet means entityType
            if (currentValue && currentValue._type === 'EntitySet' && currentValue.entityType) {
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
        } else if (currentValue._type === 'EntitySet' && pathPart === '$Type') {
            currentValue = currentValue.targetType;
            return currentValue;
        } else if (currentValue._type === 'EntitySet' && currentValue.entityType) {
            currentPath = combinePath(currentValue.entityTypeName, pathPart);
        } else if (currentValue._type === 'NavigationProperty' && currentValue.targetTypeName) {
            currentPath = combinePath(currentValue.targetTypeName, pathPart);
        } else if (currentValue._type === 'NavigationProperty' && currentValue.targetType) {
            currentPath = combinePath(currentValue.targetType.fullyQualifiedName, pathPart);
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
        } else if (currentValue._type === 'ActionParameter' && currentValue.isEntitySet) {
            currentPath = combinePath(currentValue.type, pathPart);
        } else if (currentValue._type === 'ActionParameter' && !currentValue.isEntitySet) {
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
        if (annotationsTerm && annotationType) {
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

function parseValue(
    propertyValue: Expression,
    valueFQN: string,
    parserOutput: RawMetadata,
    currentTarget: any,
    objectMap: any,
    toResolve: Resolveable[],
    annotationSource: string,
    unresolvedAnnotations: AnnotationList[],
    annotationType: string,
    annotationsTerm: string
) {
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
            return propertyValue.Decimal;
        case 'Date':
            return propertyValue.Date;
        case 'EnumMember':
            return alias(parserOutput.references, propertyValue.EnumMember);
        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                value: propertyValue.PropertyPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    objectMap,
                    currentTarget,
                    propertyValue.PropertyPath,
                    false,
                    false,
                    annotationType,
                    annotationsTerm
                )
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                value: propertyValue.NavigationPropertyPath,
                fullyQualifiedName: valueFQN,
                $target: _resolveTarget(
                    objectMap,
                    currentTarget,
                    propertyValue.NavigationPropertyPath,
                    false,
                    false,
                    annotationType,
                    annotationsTerm
                )
            };
        case 'AnnotationPath':
            const annotationTarget = _resolveTarget(
                objectMap,
                currentTarget,
                unalias(parserOutput.references, propertyValue.AnnotationPath) as string,
                true,
                false,
                annotationType,
                annotationsTerm
            );
            const annotationPath = {
                type: 'AnnotationPath',
                value: propertyValue.AnnotationPath,
                fullyQualifiedName: valueFQN,
                $target: annotationTarget,
                annotationType: annotationType,
                annotationsTerm: annotationsTerm,
                term: '',
                path: ''
            };
            toResolve.push({ inline: false, toResolve: annotationPath });
            return annotationPath;
        case 'Path':
            const $target = _resolveTarget(
                objectMap,
                currentTarget,
                propertyValue.Path,
                true,
                false,
                annotationType,
                annotationsTerm
            );
            const path = new Path(propertyValue, $target, annotationsTerm, annotationType, '');
            toResolve.push({
                inline: isAnnotationPath(propertyValue.Path),
                toResolve: path
            });
            return path;

        case 'Record':
            return parseRecord(
                propertyValue.Record,
                valueFQN,
                parserOutput,
                currentTarget,
                objectMap,
                toResolve,
                annotationSource,
                unresolvedAnnotations,
                annotationType,
                annotationsTerm
            );
        case 'Collection':
            return parseCollection(
                propertyValue.Collection,
                valueFQN,
                parserOutput,
                currentTarget,
                objectMap,
                toResolve,
                annotationSource,
                unresolvedAnnotations,
                annotationType,
                annotationsTerm
            );
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
 * @returns the inferred type.
 */
function inferTypeFromTerm(annotationsTerm: string, annotationTarget: string) {
    const targetType = (TermToTypes as any)[annotationsTerm];
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

function parseRecord(
    recordDefinition: AnnotationRecord,
    currentFQN: string,
    parserOutput: RawMetadata,
    currentTarget: any,
    objectMap: any,
    toResolve: Resolveable[],
    annotationSource: string,
    unresolvedAnnotations: AnnotationList[],
    annotationType: string,
    annotationsTerm: string
) {
    let targetType;
    if (!recordDefinition.type && annotationsTerm) {
        targetType = inferTypeFromTerm(annotationsTerm, currentTarget.fullyQualifiedName);
    } else {
        targetType = unalias(parserOutput.references, recordDefinition.type);
    }
    const annotationTerm: any = {
        $Type: targetType,
        fullyQualifiedName: currentFQN
    };
    const annotationContent: any = {};
    if (recordDefinition.annotations && Array.isArray(recordDefinition.annotations)) {
        const subAnnotationList = {
            target: currentFQN,
            annotations: recordDefinition.annotations,
            __source: annotationSource
        };
        unresolvedAnnotations.push(subAnnotationList);
    }
    if (recordDefinition.propertyValues) {
        recordDefinition.propertyValues.forEach((propertyValue: PropertyValue) => {
            annotationContent[propertyValue.name] = parseValue(
                propertyValue.value,
                `${currentFQN}/${propertyValue.name}`,
                parserOutput,
                currentTarget,
                objectMap,
                toResolve,
                annotationSource,
                unresolvedAnnotations,
                annotationType,
                annotationsTerm
            );
            if (propertyValue.annotations && Array.isArray(propertyValue.annotations)) {
                const subAnnotationList = {
                    target: `${currentFQN}/${propertyValue.name}`,
                    annotations: propertyValue.annotations,
                    __source: annotationSource
                };
                unresolvedAnnotations.push(subAnnotationList);
            }
            if (
                annotationContent.hasOwnProperty('Action') &&
                (annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction' ||
                    annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldWithAction')
            ) {
                annotationContent.ActionTarget =
                    (currentTarget.actions && currentTarget.actions[annotationContent.Action]) ||
                    objectMap[annotationContent.Action];
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

function parseCollection(
    collectionDefinition: any[],
    parentFQN: string,
    parserOutput: RawMetadata,
    currentTarget: any,
    objectMap: any,
    toResolve: Resolveable[],
    annotationSource: string,
    unresolvedAnnotations: AnnotationList[],
    annotationType: string,
    annotationsTerm: string
) {
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
                        currentTarget,
                        propertyPath.PropertyPath,
                        false,
                        false,
                        annotationType,
                        annotationsTerm
                    )
                };
            });
        case 'Path':
            return collectionDefinition.map((pathValue) => {
                const $target = _resolveTarget(
                    objectMap,
                    currentTarget,
                    pathValue.Path,
                    true,
                    false,
                    annotationType,
                    annotationsTerm
                );
                const path = new Path(pathValue, $target, annotationsTerm, annotationType, '');
                toResolve.push({
                    inline: isAnnotationPath(pathValue.Path),
                    toResolve: path
                });
                return path;
            });
        case 'AnnotationPath':
            return collectionDefinition.map((annotationPath, annotationIdx) => {
                const annotationTarget = _resolveTarget(
                    objectMap,
                    currentTarget,
                    annotationPath.AnnotationPath,
                    true,
                    false,
                    annotationType,
                    annotationsTerm
                );
                const annotationCollectionElement = {
                    type: 'AnnotationPath',
                    value: annotationPath.AnnotationPath,
                    fullyQualifiedName: `${parentFQN}/${annotationIdx}`,
                    $target: annotationTarget,
                    annotationType: annotationType,
                    annotationsTerm: annotationsTerm,
                    term: '',
                    path: ''
                };
                toResolve.push({
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
                        currentTarget,
                        navPropertyPath.NavigationPropertyPath,
                        false,
                        false,
                        annotationType,
                        annotationsTerm
                    )
                };
            });
        case 'Record':
            return collectionDefinition.map((recordDefinition, recordIdx) => {
                return parseRecord(
                    recordDefinition,
                    `${parentFQN}/${recordIdx}`,
                    parserOutput,
                    currentTarget,
                    objectMap,
                    toResolve,
                    annotationSource,
                    unresolvedAnnotations,
                    annotationType,
                    annotationsTerm
                );
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

function convertAnnotation(
    annotation: Annotation,
    parserOutput: RawMetadata,
    currentTarget: any,
    objectMap: any,
    toResolve: Resolveable[],
    annotationSource: string,
    unresolvedAnnotations: AnnotationList[]
): any {
    if (annotation.record) {
        const annotationType = annotation.record.type
            ? unalias(parserOutput.references, annotation.record.type)
            : inferTypeFromTerm(annotation.term, currentTarget.fullyQualifiedName);
        const annotationTerm: any = {
            $Type: annotationType,
            fullyQualifiedName: annotation.fullyQualifiedName,
            qualifier: annotation.qualifier
        };
        const annotationContent: any = {};
        annotation.record.propertyValues.forEach((propertyValue: PropertyValue) => {
            annotationContent[propertyValue.name] = parseValue(
                propertyValue.value,
                `${annotation.fullyQualifiedName}/${propertyValue.name}`,
                parserOutput,
                currentTarget,
                objectMap,
                toResolve,
                annotationSource,
                unresolvedAnnotations,
                annotationType,
                annotation.term
            );
            if (
                annotationContent.hasOwnProperty('Action') &&
                (!annotation.record ||
                    annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction' ||
                    annotationTerm.$Type === 'com.sap.vocabularies.UI.v1.DataFieldWithAction')
            ) {
                annotationContent.ActionTarget =
                    (currentTarget.actions && currentTarget.actions[annotationContent.Action]) ||
                    objectMap[annotationContent.Action];
                if (!annotationContent.ActionTarget) {
                    ANNOTATION_ERRORS.push({
                        message:
                            'Unable to resolve the action ' +
                            annotationContent.Action +
                            ' defined for ' +
                            annotation.fullyQualifiedName
                    });
                    // Add to diagnostics
                    // debugger;
                }
            }
        });
        return Object.assign(annotationTerm, annotationContent);
    } else if (annotation.collection === undefined) {
        if (annotation.value) {
            return parseValue(
                annotation.value,
                annotation.fullyQualifiedName,
                parserOutput,
                currentTarget,
                objectMap,
                toResolve,
                annotationSource,
                unresolvedAnnotations,
                '',
                annotation.term
            );
        } else {
            return true;
        }
    } else if (annotation.collection) {
        const collection: any = parseCollection(
            annotation.collection,
            annotation.fullyQualifiedName,
            parserOutput,
            currentTarget,
            objectMap,
            toResolve,
            annotationSource,
            unresolvedAnnotations,
            '',
            annotation.term
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
        const annotationType: string = '';
        return _resolveTarget(
            objectMap,
            entityType,
            relativePath,
            false,
            includeVisitedObjects,
            annotationType,
            annotationTerm
        );
    };
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
        entityType.navigationProperties = entityType.navigationProperties.map((navProp) => {
            const outNavProp: Partial<NavigationProperty> = {
                _type: 'NavigationProperty',
                name: navProp.name,
                fullyQualifiedName: navProp.fullyQualifiedName,
                partner: (navProp as any).hasOwnProperty('partner') ? (navProp as any).partner : undefined,
                isCollection: (navProp as any).hasOwnProperty('isCollection') ? (navProp as any).isCollection : false,
                containsTarget: (navProp as any).hasOwnProperty('containsTarget')
                    ? (navProp as any).containsTarget
                    : false,
                referentialConstraint: (navProp as any).referentialConstraint
                    ? (navProp as any).referentialConstraint
                    : [],
                annotations: {}
            };
            if ((navProp as BaseNavigationProperty).targetTypeName) {
                outNavProp.targetType = objectMap[(navProp as RawV4NavigationProperty).targetTypeName];
            } else if ((navProp as RawV2NavigationProperty).relationship) {
                const targetAssociation = associations.find(
                    (association) =>
                        association.fullyQualifiedName === (navProp as RawV2NavigationProperty).relationship
                );
                if (targetAssociation) {
                    const associationEnd = targetAssociation.associationEnd.find(
                        (end) => end.role === (navProp as RawV2NavigationProperty).toRole
                    );
                    if (associationEnd) {
                        outNavProp.targetType = objectMap[associationEnd.type];
                        outNavProp.isCollection = associationEnd.multiplicity === '*';
                    }
                }
            }
            if (outNavProp.targetType) {
                outNavProp.targetTypeName = outNavProp.targetType.fullyQualifiedName;
            }
            const outNavPropReq = outNavProp as NavigationProperty;
            objectMap[outNavPropReq.fullyQualifiedName] = outNavPropReq;
            return outNavPropReq;
        });
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
                sourceEntityType.actions[action.name] = action;
                sourceEntityType.actions[`${namespace}.${action.name}`] = action;
            }
            action.returnEntityType = objectMap[action.returnType];
        }
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
        complexType.navigationProperties = complexType.navigationProperties.map((navProp) => {
            if (!(navProp as NavigationProperty).annotations) {
                (navProp as NavigationProperty).annotations = {};
            }
            const outNavProp: Partial<NavigationProperty> = {
                _type: 'NavigationProperty',
                name: navProp.name,
                fullyQualifiedName: navProp.fullyQualifiedName,
                partner: (navProp as any).hasOwnProperty('partner') ? (navProp as any).partner : undefined,
                isCollection: (navProp as any).hasOwnProperty('isCollection') ? (navProp as any).isCollection : false,
                containsTarget: (navProp as any).hasOwnProperty('containsTarget')
                    ? (navProp as any).containsTarget
                    : false,
                referentialConstraint: (navProp as any).referentialConstraint
                    ? (navProp as any).referentialConstraint
                    : []
            };
            if ((navProp as BaseNavigationProperty).targetTypeName) {
                outNavProp.targetType = objectMap[(navProp as RawV4NavigationProperty).targetTypeName];
            } else if ((navProp as RawV2NavigationProperty).relationship) {
                const targetAssociation = associations.find(
                    (association) =>
                        association.fullyQualifiedName === (navProp as RawV2NavigationProperty).relationship
                );
                if (targetAssociation) {
                    const associationEnd = targetAssociation.associationEnd.find(
                        (end: RawAssociationEnd) => end.role === (navProp as RawV2NavigationProperty).toRole
                    );
                    if (associationEnd) {
                        outNavProp.targetType = objectMap[associationEnd.type];
                        outNavProp.isCollection = associationEnd.multiplicity === '*';
                    }
                }
            }
            if (outNavProp.targetType) {
                outNavProp.targetTypeName = outNavProp.targetType.fullyQualifiedName;
            }
            const outNavPropReq = outNavProp as NavigationProperty;
            objectMap[outNavPropReq.fullyQualifiedName] = outNavPropReq;
            return outNavPropReq;
        });
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
    return function resolvePath<T extends ServiceObjectAndAnnotation>(sPath: string): ResolutionTarget<T> {
        const aPathSplit = sPath.split('/');
        if (aPathSplit.shift() !== '') {
            throw new Error('Cannot deal with relative path');
        }
        const entitySetName = aPathSplit.shift();
        const entitySet = convertedOutput.entitySets.find((et: EntitySet) => et.name === entitySetName);
        if (!entitySet) {
            return {
                target: convertedOutput.entityContainer,
                objectPath: [convertedOutput.entityContainer]
            } as ResolutionTarget<T>;
        }
        if (aPathSplit.length === 0) {
            return {
                target: entitySet,
                objectPath: [convertedOutput.entityContainer, entitySet]
            } as ResolutionTarget<T>;
        } else {
            const targetResolution: any = _resolveTarget(objectMap, entitySet, '/' + aPathSplit.join('/'), false, true);
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
    if (!(rawMetadata.schema.entityContainer as EntityContainer).annotations) {
        (rawMetadata.schema.entityContainer as EntityContainer).annotations = {};
    }
    linkActionsToEntityType(rawMetadata.schema.namespace, rawMetadata.schema.actions as Action[], objectMap);
    linkEntityTypeToEntitySet(rawMetadata.schema.entitySets as EntitySet[], objectMap, rawMetadata.references);
    linkEntityTypeToSingleton(rawMetadata.schema.singletons as Singleton[], objectMap, rawMetadata.references);
    linkPropertiesToComplexTypes(rawMetadata.schema.entityTypes as EntityType[], objectMap);
    prepareComplexTypes(rawMetadata.schema.complexTypes as ComplexType[], rawMetadata.schema.associations, objectMap);
    const unresolvedTargets: Resolveable[] = [];
    const unresolvedAnnotations: AnnotationList[] = [];

    Object.keys(rawMetadata.schema.annotations).forEach((annotationSource) => {
        rawMetadata.schema.annotations[annotationSource].forEach((annotationList: AnnotationList) => {
            let currentTargetName = unalias(rawMetadata.references, annotationList.target) as string;
            const objectMapElement = objectMap[currentTargetName];
            if (!objectMapElement) {
                if (currentTargetName && currentTargetName.indexOf('@') !== -1) {
                    (annotationList as any).__source = annotationSource;
                    unresolvedAnnotations.push(annotationList);
                }
            } else if (typeof objectMapElement === 'object') {
                let allTargets = [objectMapElement];
                let bOverrideExisting = true;
                if (objectMapElement._type === 'UnboundGenericAction') {
                    allTargets = objectMapElement.actions;
                    bOverrideExisting = false;
                }
                allTargets.forEach((currentTarget) => {
                    if (currentTargetName !== currentTarget.fullyQualifiedName) {
                        currentTargetName = currentTarget.fullyQualifiedName;
                    }
                    if (!currentTarget.annotations) {
                        currentTarget.annotations = {};
                    }
                    annotationList.annotations.forEach((annotation: RawAnnotation) => {
                        const [vocAlias, vocTerm] = splitTerm(defaultReferences, annotation.term);
                        if (!currentTarget.annotations[vocAlias]) {
                            currentTarget.annotations[vocAlias] = {};
                        }
                        if (!currentTarget.annotations._annotations) {
                            currentTarget.annotations._annotations = {};
                        }

                        const vocTermWithQualifier = `${vocTerm}${
                            annotation.qualifier ? `#${annotation.qualifier}` : ''
                        }`;
                        if (
                            !bOverrideExisting &&
                            currentTarget.annotations?.[vocAlias]?.[vocTermWithQualifier] !== undefined
                        ) {
                            return;
                        }
                        currentTarget.annotations[vocAlias][vocTermWithQualifier] = convertAnnotation(
                            annotation as Annotation,
                            rawMetadata,
                            currentTarget,
                            objectMap,
                            unresolvedTargets,
                            annotationSource,
                            unresolvedAnnotations
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
                            typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === 'object'
                        ) {
                            currentTarget.annotations[vocAlias][vocTermWithQualifier].term = unalias(
                                defaultReferences,
                                `${vocAlias}.${vocTerm}`
                            );
                            currentTarget.annotations[vocAlias][vocTermWithQualifier].qualifier = annotation.qualifier;
                            currentTarget.annotations[vocAlias][vocTermWithQualifier].__source = annotationSource;
                        }
                        const annotationTarget = `${currentTargetName}@${unalias(
                            defaultReferences,
                            vocAlias + '.' + vocTermWithQualifier
                        )}`;
                        if (annotation.annotations && Array.isArray(annotation.annotations)) {
                            const subAnnotationList = {
                                target: annotationTarget,
                                annotations: annotation.annotations,
                                __source: annotationSource
                            };
                            unresolvedAnnotations.push(subAnnotationList);
                        } else if (
                            annotation.annotations &&
                            !currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations
                        ) {
                            currentTarget.annotations[vocAlias][vocTermWithQualifier].annotations =
                                annotation.annotations;
                        }
                        currentTarget.annotations._annotations[`${vocAlias}.${vocTermWithQualifier}`] =
                            currentTarget.annotations[vocAlias][vocTermWithQualifier];
                        objectMap[annotationTarget] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
                    });
                });
            }
        });
    });
    const extraUnresolvedAnnotations: AnnotationList[] = [];
    unresolvedAnnotations.forEach((annotationList) => {
        const currentTargetName = unalias(rawMetadata.references, annotationList.target) as string;
        let [baseObj, annotationPart] = currentTargetName.split('@');
        const targetSplit = annotationPart.split('/');
        baseObj = baseObj + '@' + targetSplit[0];
        const currentTarget = targetSplit.slice(1).reduce((currentObj, path) => {
            if (!currentObj) {
                return null;
            }
            return currentObj[path];
        }, objectMap[baseObj]);
        if (!currentTarget) {
            ANNOTATION_ERRORS.push({
                message: 'The following annotation target was not found on the service ' + currentTargetName
            });
        } else if (typeof currentTarget === 'object') {
            if (!currentTarget.annotations) {
                currentTarget.annotations = {};
            }
            annotationList.annotations.forEach((annotation: RawAnnotation) => {
                const [vocAlias, vocTerm] = splitTerm(defaultReferences, annotation.term);
                if (!currentTarget.annotations[vocAlias]) {
                    currentTarget.annotations[vocAlias] = {};
                }
                if (!currentTarget.annotations._annotations) {
                    currentTarget.annotations._annotations = {};
                }

                const vocTermWithQualifier = `${vocTerm}${annotation.qualifier ? '#' + annotation.qualifier : ''}`;
                currentTarget.annotations[vocAlias][vocTermWithQualifier] = convertAnnotation(
                    annotation as Annotation,
                    rawMetadata,
                    currentTarget,
                    objectMap,
                    unresolvedTargets,
                    (annotationList as any).__source,
                    extraUnresolvedAnnotations
                );
                if (
                    currentTarget.annotations[vocAlias][vocTermWithQualifier] !== null &&
                    typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === 'object'
                ) {
                    currentTarget.annotations[vocAlias][vocTermWithQualifier].term = unalias(
                        defaultReferences,
                        `${vocAlias}.${vocTerm}`
                    );
                    currentTarget.annotations[vocAlias][vocTermWithQualifier].qualifier = annotation.qualifier;
                    currentTarget.annotations[vocAlias][vocTermWithQualifier].__source = (
                        annotationList as any
                    ).__source;
                }
                currentTarget.annotations._annotations[`${vocAlias}.${vocTermWithQualifier}`] =
                    currentTarget.annotations[vocAlias][vocTermWithQualifier];
                objectMap[`${currentTargetName}@${unalias(defaultReferences, vocAlias + '.' + vocTermWithQualifier)}`] =
                    currentTarget.annotations[vocAlias][vocTermWithQualifier];
            });
        }
    });
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
