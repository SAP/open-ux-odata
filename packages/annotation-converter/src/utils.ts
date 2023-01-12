import type { Reference, ComplexType, TypeDefinition } from '@sap-ux/vocabularies-types';
export const defaultReferences: ReferencesWithMap = [
    { alias: 'Capabilities', namespace: 'Org.OData.Capabilities.V1', uri: '' },
    { alias: 'Aggregation', namespace: 'Org.OData.Aggregation.V1', uri: '' },
    { alias: 'Validation', namespace: 'Org.OData.Validation.V1', uri: '' },
    { namespace: 'Org.OData.Core.V1', alias: 'Core', uri: '' },
    { namespace: 'Org.OData.Measures.V1', alias: 'Measures', uri: '' },
    { namespace: 'com.sap.vocabularies.Common.v1', alias: 'Common', uri: '' },
    { namespace: 'com.sap.vocabularies.UI.v1', alias: 'UI', uri: '' },
    { namespace: 'com.sap.vocabularies.Session.v1', alias: 'Session', uri: '' },
    { namespace: 'com.sap.vocabularies.Analytics.v1', alias: 'Analytics', uri: '' },
    { namespace: 'com.sap.vocabularies.CodeList.v1', alias: 'CodeList', uri: '' },
    { namespace: 'com.sap.vocabularies.PersonalData.v1', alias: 'PersonalData', uri: '' },
    { namespace: 'com.sap.vocabularies.Communication.v1', alias: 'Communication', uri: '' },
    { namespace: 'com.sap.vocabularies.HTML5.v1', alias: 'HTML5', uri: '' }
];

export type ReferencesWithMap = Reference[] & {
    referenceMap?: Record<string, Reference>;
    reverseReferenceMap?: Record<string, Reference>;
};

/**
 * Transform an unaliased string representation annotation to the aliased version.
 *
 * @param references currentReferences for the project
 * @param unaliasedValue the unaliased value
 * @returns the aliased string representing the same
 */
export function alias(references: ReferencesWithMap, unaliasedValue: string): string {
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
 * Transform an aliased string representation annotation to the unaliased version.
 *
 * @param references currentReferences for the project
 * @param aliasedValue the aliased value
 * @returns the unaliased string representing the same
 */
export function unalias(references: ReferencesWithMap, aliasedValue: string | undefined): string | undefined {
    if (!references.referenceMap) {
        references.referenceMap = references.reduce((map: Record<string, Reference>, ref) => {
            map[ref.alias] = ref;
            return map;
        }, {});
    }
    if (!aliasedValue) {
        return aliasedValue;
    }
    const [vocAlias, ...value] = aliasedValue.split('.');
    const reference = references.referenceMap[vocAlias];
    if (reference) {
        return `${reference.namespace}.${value.join('.')}`;
    } else if (aliasedValue.indexOf('@') !== -1) {
        // Try to see if it's an annotation Path like to_SalesOrder/@UI.LineItem
        const [preAlias, ...postAlias] = aliasedValue.split('@');
        return `${preAlias}@${unalias(references, postAlias.join('@'))}`;
    } else {
        return aliasedValue;
    }
}
export const EnumIsFlag: Record<string, boolean> = {
    'Auth.KeyLocation': false,
    'Core.RevisionKind': false,
    'Core.DataModificationOperationKind': false,
    'Core.Permission': true,
    'Capabilities.ConformanceLevelType': false,
    'Capabilities.IsolationLevel': true,
    'Capabilities.NavigationType': false,
    'Capabilities.SearchExpressions': true,
    'Capabilities.HttpMethod': true,
    'Aggregation.RollupType': false,
    'Common.TextFormatType': false,
    'Common.FilterExpressionType': false,
    'Common.FieldControlType': false,
    'Common.EffectType': true,
    'Communication.KindType': false,
    'Communication.ContactInformationType': true,
    'Communication.PhoneType': true,
    'Communication.GenderType': false,
    'UI.VisualizationType': false,
    'UI.CriticalityType': false,
    'UI.ImprovementDirectionType': false,
    'UI.TrendType': false,
    'UI.ChartType': false,
    'UI.ChartAxisScaleBehaviorType': false,
    'UI.ChartAxisAutoScaleDataScopeType': false,
    'UI.ChartDimensionRoleType': false,
    'UI.ChartMeasureRoleType': false,
    'UI.SelectionRangeSignType': false,
    'UI.SelectionRangeOptionType': false,
    'UI.TextArrangementType': false,
    'UI.ImportanceType': false,
    'UI.CriticalityRepresentationType': false,
    'UI.OperationGroupingType': false
};
export enum TermToTypes {
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
    'Org.OData.Core.V1.AppliesViaContainer' = 'Org.OData.Core.V1.Tag',
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
    'Org.OData.Core.V1.GeometryFeature' = 'Org.OData.Core.V1.GeometryFeatureType',
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
    'Org.OData.Aggregation.V1.ApplySupportedDefaults' = 'Org.OData.Aggregation.V1.ApplySupportedBase',
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
    'Org.OData.Validation.V1.OpenPropertyTypeConstraint' = 'Org.OData.Validation.V1.SingleOrCollectionType',
    'Org.OData.Validation.V1.DerivedTypeConstraint' = 'Org.OData.Validation.V1.SingleOrCollectionType',
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
    'com.sap.vocabularies.Analytics.v1.AggregatedProperty' = 'com.sap.vocabularies.Analytics.v1.AggregatedPropertyType',
    'com.sap.vocabularies.Analytics.v1.AnalyticalContext' = 'com.sap.vocabularies.Analytics.v1.AnalyticalContextType',
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
    'com.sap.vocabularies.Common.v1.RevealOnDemand' = 'Edm.Boolean',
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
    'com.sap.vocabularies.Common.v1.SAPObjectNodeType' = 'com.sap.vocabularies.Common.v1.SAPObjectNodeTypeType',
    'com.sap.vocabularies.Common.v1.Composition' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.IsNaturalPerson' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.Common.v1.ValueList' = 'com.sap.vocabularies.Common.v1.ValueListType',
    'com.sap.vocabularies.Common.v1.ValueListRelevantQualifiers' = 'Org.OData.Core.V1.SimpleIdentifier',
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
    'com.sap.vocabularies.Common.v1.DraftActivationVia' = 'Org.OData.Core.V1.SimpleIdentifier',
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
    'com.sap.vocabularies.Common.v1.PrimitivePropertyPath' = 'Org.OData.Core.V1.Tag',
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
    'com.sap.vocabularies.UI.v1.IsCopyAction' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.CreateHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.UpdateHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.DeleteHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.HiddenFilter' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.AdaptationHidden' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.DataFieldDefault' = 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
    'com.sap.vocabularies.UI.v1.Criticality' = 'com.sap.vocabularies.UI.v1.CriticalityType',
    'com.sap.vocabularies.UI.v1.CriticalityCalculation' = 'com.sap.vocabularies.UI.v1.CriticalityCalculationType',
    'com.sap.vocabularies.UI.v1.Emphasized' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.OrderBy' = 'Edm.PropertyPath',
    'com.sap.vocabularies.UI.v1.ParameterDefaultValue' = 'Edm.PrimitiveType',
    'com.sap.vocabularies.UI.v1.RecommendationState' = 'com.sap.vocabularies.UI.v1.RecommendationStateType',
    'com.sap.vocabularies.UI.v1.RecommendationList' = 'com.sap.vocabularies.UI.v1.RecommendationListType',
    'com.sap.vocabularies.UI.v1.ExcludeFromNavigationContext' = 'Org.OData.Core.V1.Tag',
    'com.sap.vocabularies.UI.v1.DoNotCheckScaleOfMeasuredQuantity' = 'Edm.Boolean',
    'com.sap.vocabularies.HTML5.v1.CssDefaults' = 'com.sap.vocabularies.HTML5.v1.CssDefaultsType'
}

/**
 * Differentiate between a ComplexType and a TypeDefinition.
 * @param complexTypeDefinition
 * @returns true if the value is a complex type
 */
export function isComplexTypeDefinition(
    complexTypeDefinition?: ComplexType | TypeDefinition
): complexTypeDefinition is ComplexType {
    return (
        !!complexTypeDefinition && complexTypeDefinition._type === 'ComplexType' && !!complexTypeDefinition.properties
    );
}

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
