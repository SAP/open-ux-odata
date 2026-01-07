import { merge, parse } from '@sap-ux/edmx-parser';
import type {
    Action,
    ActionParameter,
    AnnotationPath,
    ConvertedMetadata,
    EntitySet,
    EntityType,
    NavigationProperty,
    PathAnnotationExpression,
    Property,
    RawMetadata,
    ResolutionTarget,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import type { EntitySetAnnotations_Capabilities } from '@sap-ux/vocabularies-types/vocabularies/Capabilities_Edm';
import { CommonAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/Common';
import type { ContactType } from '@sap-ux/vocabularies-types/vocabularies/Communication';
import { CommunicationAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/Communication';
import type {
    Criticality,
    DataField,
    DataFieldAbstractTypes,
    DataFieldForAction,
    DataFieldForActionTypes,
    DataFieldForAnnotation,
    FieldGroupType,
    LineItem
} from '@sap-ux/vocabularies-types/vocabularies/UI';
import {
    OperationGroupingType,
    UIAnnotationTerms,
    UIAnnotationTypes
} from '@sap-ux/vocabularies-types/vocabularies/UI';
import { VocabularyReferences } from '@sap-ux/vocabularies-types/vocabularies/VocabularyReferences';
import { convert, CONVERTER_ROOT, defaultReferences, revertTermToGenericType } from '../src';
import { loadFixture } from './fixturesHelper';

describe('Annotation Converter', () => {
    it('can convert EDMX with action annotations', async () => {
        const parsedEDMX = parse(await loadFixture('v4/actions/metadata.xml'));
        const parsedAnnotation = parse(await loadFixture('v4/actions/annotations.xml'), 'annotations');
        const result = merge(parsedEDMX, parsedAnnotation);
        const convertedTypes = convert(result);
        expect(
            convertedTypes.actions.by_fullyQualifiedName(
                'com.sap.gateway.srvd.eam_materialserialnumber.v0001.CreateMassMaterialSerialNumber(Collection(com.sap.gateway.srvd.eam_materialserialnumber.v0001.C_EquipMaterialSerialNumberTPType))'
            )
        ).not.toBeUndefined();
        expect(
            convertedTypes.actions.by_fullyQualifiedName(
                'com.sap.gateway.srvd.eam_materialserialnumber.v0001.CreateMassMaterialSerialNumber(Collection(com.sap.gateway.srvd.eam_materialserialnumber.v0001.C_EquipMaterialSerialNumberTPType))'
            )?.annotations
        ).not.toBeUndefined();
        expect(
            convertedTypes.actions
                .by_fullyQualifiedName(
                    'com.sap.gateway.srvd.eam_materialserialnumber.v0001.CreateMassMaterialSerialNumber(Collection(com.sap.gateway.srvd.eam_materialserialnumber.v0001.C_EquipMaterialSerialNumberTPType))'
                )
                ?.parameters.by_name('_SerialList')
        ).not.toBeUndefined();
        expect(
            convertedTypes.actions
                .by_fullyQualifiedName(
                    'com.sap.gateway.srvd.eam_materialserialnumber.v0001.CreateMassMaterialSerialNumber(Collection(com.sap.gateway.srvd.eam_materialserialnumber.v0001.C_EquipMaterialSerialNumberTPType))'
                )
                ?.parameters.by_name('_SerialList')
                ?.annotations.UI?.Hidden?.valueOf()
        ).not.toBeUndefined();
    });

    it('can convert EDMX with multiple schemas', async () => {
        const parsedEDMX = parse(await loadFixture('northwind.metadata.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
    });

    it('can convert EDMX with aliasing', async () => {
        const parsedEDMX = parse(await loadFixture('v4/with-alias.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(
            (convertedTypes.entitySets['0'].entityType.annotations as any).UI[
                'SelectionPresentationVariant#coffeeSPVList'
            ].PresentationVariant
        ).toBeDefined();
    });

    it('can convert properly side effects enum', async () => {
        const parsedEDMX = parse(await loadFixture('v2/sideEffects.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entityTypes[9].annotations.Common?.SideEffects?.EffectTypes).not.toBeNull();
        expect(
            revertTermToGenericType(defaultReferences, convertedTypes.entityTypes[9].annotations.Common?.SideEffects)
        ).toMatchInlineSnapshot(`
            {
              "qualifier": undefined,
              "record": {
                "propertyValues": [
                  {
                    "name": "TargetEntities",
                    "value": {
                      "Collection": [
                        {
                          "NavigationPropertyPath": "",
                          "type": "NavigationPropertyPath",
                        },
                        {
                          "NavigationPropertyPath": "to_ProductText",
                          "type": "NavigationPropertyPath",
                        },
                        {
                          "NavigationPropertyPath": "to_ProductTextInOriginalLang",
                          "type": "NavigationPropertyPath",
                        },
                      ],
                      "type": "Collection",
                    },
                  },
                  {
                    "name": "EffectTypes",
                    "value": {
                      "EnumMember": "Common.EffectType/ValidationMessage",
                      "type": "EnumMember",
                    },
                  },
                ],
                "type": "com.sap.vocabularies.Common.v1.SideEffectsType",
              },
              "term": "com.sap.vocabularies.Common.v1.SideEffects",
            }
        `);
    });

    it('can convert EDMX with multiple schemas', async () => {
        const parsedEDMX = parse(await loadFixture('bugs/metadata.xml'));
        Object.freeze(parsedEDMX);
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
    });

    it('can convert EDMX with action parameters schemas', async () => {
        const parsedEDMX = parse(await loadFixture('v4/otherSD.xml'));
        const parsedEDMX2 = parse(await loadFixture('v4/otherSDAnno.xml'));
        const merged = merge(parsedEDMX, parsedEDMX2);
        const convertedTypes = convert(merged);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
    });

    it('can convert without annotation EDMX', async () => {
        const parsedEDMX = parse(await loadFixture('v4/noAnno.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entityContainer.annotations).not.toBeUndefined();
        expect(convertedTypes.entitySets[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[0].annotations).not.toBeUndefined();
        expect(convertedTypes.actions[0].annotations).not.toBeUndefined();
        expect(convertedTypes.complexTypes[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[0].entityProperties[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[1].navigationProperties[0].annotations).not.toBeUndefined();
        expect(
            convertedTypes.entityTypes[5].actions['com.sap.gateway.srvd.c_salesordermanage_sd.v0001.PrepareForEdit']
                .annotations
        ).not.toBeUndefined();
    });

    it('can convert with a crappy EDMX', async () => {
        const parsedEDMX = parse(await loadFixture('v4/crappyAnno.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entityContainer.annotations).not.toBeUndefined();
        expect(convertedTypes.entitySets[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[0].annotations).not.toBeUndefined();
        expect(convertedTypes.actions[0].annotations).not.toBeUndefined();
        expect(convertedTypes.complexTypes[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[0].entityProperties[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[1].navigationProperties[0].annotations).not.toBeUndefined();
        expect(
            convertedTypes.entityTypes[5].actions['com.sap.gateway.srvd.c_salesordermanage_sd.v0001.PrepareForEdit']
                .annotations
        ).not.toBeUndefined();
    });

    describe('Converts enums', () => {
        let capabilities: EntitySetAnnotations_Capabilities;

        beforeAll(async () => {
            const parsedEDMX = parse(await loadFixture('v4/metamodelEnums.xml'));
            const convertedTypes = convert(parsedEDMX);
            expect(convertedTypes.entitySets[0].annotations.Capabilities).toBeDefined();
            capabilities = convertedTypes.entitySets[0].annotations.Capabilities!;
        });

        it('should convert an empty value', () => {
            expect(capabilities['SearchRestrictions#Empty']?.UnsupportedExpressions).toMatchInlineSnapshot(`""`);
        });

        it('should convert a single-valued enum', () => {
            expect(capabilities['SearchRestrictions#Alone']?.UnsupportedExpressions).toMatchInlineSnapshot(`
                [
                  "Capabilities.SearchExpressions/AND",
                ]
            `);
        });

        it('should convert a single-valued enum with non-standard alias', () => {
            expect(capabilities['SearchRestrictions#NonStandardAlias']?.UnsupportedExpressions).toMatchInlineSnapshot(`
                [
                  "Capabilities.SearchExpressions/AND",
                ]
            `);
        });

        it('should convert a multi-valued enum', () => {
            expect(capabilities.SearchRestrictions?.UnsupportedExpressions).toMatchInlineSnapshot(`
                [
                  "Capabilities.SearchExpressions/AND",
                  "Capabilities.SearchExpressions/group",
                  "Capabilities.SearchExpressions/phrase",
                ]
            `);
        });

        it('should convert a multi-valued enum with non-standard alias', () => {
            expect(capabilities['SearchRestrictions#NonStandardAliasMultiple']?.UnsupportedExpressions)
                .toMatchInlineSnapshot(`
                [
                  "Capabilities.SearchExpressions/AND",
                  "Capabilities.SearchExpressions/group",
                  "Capabilities.SearchExpressions/phrase",
                ]
            `);
        });

        it('should convert an enum that is not a flag', () => {
            expect(capabilities.NavigationRestrictions?.Navigability).toMatchInlineSnapshot(
                `"Capabilities.NavigationType/Single"`
            );
        });

        it('should convert an enum that is not a flag (with non-standard alias)', () => {
            expect(capabilities['NavigationRestrictions#NonStandardAlias']?.Navigability).toMatchInlineSnapshot(
                `"Capabilities.NavigationType/Single"`
            );
        });
    });

    it('can convert with an error EDMX', async () => {
        const parsedEDMX = parse(await loadFixture('v2/errorAnno.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entityContainer.annotations).not.toBeUndefined();
        expect(convertedTypes.entitySets[0].annotations).not.toBeUndefined();
        expect(convertedTypes.entityTypes[0].annotations).not.toBeUndefined();
    });

    it('can convert analytics EDMX', async () => {
        const parsedEDMX = parse(await loadFixture('analyticsStuff.xml'));
        const convertedTypes = convert(parsedEDMX);
        const aggregationAnnotation = convertedTypes.entitySets[0].entityType.annotations.Aggregation as any;
        expect(aggregationAnnotation['CustomAggregate#SalesAmount']).not.toBeNull();
        expect(aggregationAnnotation['CustomAggregate#SalesAmount'].valueOf()).toEqual('Edm.Decimal');
        expect(aggregationAnnotation['CustomAggregate#SalesAmount'].annotations).not.toBeNull();
        expect(
            aggregationAnnotation['CustomAggregate#SalesAmount'].annotations.Aggregation.ContextDefiningProperties
        ).not.toBeNull();
        //expect(convertedTypes.entitySets[0].annotations.Aggregation.CustomAggregate).not.toBeNull();
    });

    it('can convert tripping stuff', async () => {
        const parsedEDMX = parse(await loadFixture('v4/trippin/metadata.xml'));
        const annoFile = await loadFixture('v4/trippin/annotation.xml');
        const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
        const mergeSchema = merge(parsedEDMX, annoSchema);
        const convertedTypes = convert(mergeSchema);
        expect(convertedTypes.enumTypes).toMatchSnapshot();
    });

    describe('can support resolvePath syntax', () => {
        let convertedTypes: ConvertedMetadata;
        let convertedTypesModified: ConvertedMetadata;

        beforeAll(async () => {
            const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
            const parsedEDMXModified = parse(await loadFixture('v4/v4MetaModified.xml'));
            convertedTypes = convert(parsedEDMX);
            convertedTypesModified = convert(parsedEDMXModified);
        });

        it('can resolve EntitySet', () => {
            const sdManage: ResolutionTarget<EntitySet> = convertedTypes.resolvePath('/SalesOrderManage');
            expect(sdManage.target).not.toBeNull();
            expect(sdManage.target?._type).toEqual('EntitySet');
            expect(sdManage.objectPath.length).toEqual(2); // EntityContainer
        });

        it('can resolve EntitySet by fully-qualified name', () => {
            const sdManage2: ResolutionTarget<EntitySet> = convertedTypes.resolvePath(
                convertedTypes.entitySets[40].fullyQualifiedName
            );
            expect(sdManage2.target).not.toBeNull();
            expect(sdManage2.target?._type).toEqual('EntitySet');
            expect(sdManage2.objectPath.length).toEqual(2); // EntityContainer
        });

        it('can resolve EntityType (via "fully qualified entity type name")', () => {
            const sdManageType: ResolutionTarget<EntityType> = convertedTypes.resolvePath(
                'com.c_salesordermanage_sd.SalesOrderManage'
            );
            expect(sdManageType.target).not.toBeNull();
            expect(sdManageType.target).not.toBeUndefined();
            expect(sdManageType.target?._type).toEqual('EntityType');
            expect(sdManageType.objectPath.length).toEqual(1); // EntityType

            const sdManageProperty: ResolutionTarget<Property> = convertedTypes.resolvePath(
                'com.c_salesordermanage_sd.SalesOrderManage/ImageUrl'
            );
            expect(sdManageProperty.target).not.toBeNull();
            expect(sdManageProperty.target).not.toBeUndefined();
            expect(sdManageProperty.target?._type).toEqual('Property');
            expect(sdManageProperty.objectPath.length).toEqual(2); // EntityType / Property

            const sdManageAnnotaiton: ResolutionTarget<LineItem> = convertedTypes.resolvePath(
                'com.c_salesordermanage_sd.SalesOrderManage/@UI.LineItem'
            );
            expect(sdManageAnnotaiton.target).not.toBeNull();
            expect(sdManageAnnotaiton.target).not.toBeUndefined();
            expect(sdManageAnnotaiton.target?.term).toEqual(UIAnnotationTerms.LineItem);
            expect(sdManageAnnotaiton.objectPath.length).toEqual(2); // EntityType / Annotation
        });

        it('can resolve EntityType (via "[entityset]/")', () => {
            const sdManageType: ResolutionTarget<EntityType> = convertedTypes.resolvePath('/SalesOrderManage/');
            expect(sdManageType.target).not.toBeNull();
            expect(sdManageType.target).not.toBeUndefined();
            expect(sdManageType.target?._type).toEqual('EntityType');
            expect(sdManageType.objectPath.length).toEqual(3); // EntityContainer / EntitySet
        });

        it('can resolve EntityType (via "[entityset]/$Type")', () => {
            const sdManageType2: ResolutionTarget<EntityType> = convertedTypes.resolvePath('/SalesOrderManage/$Type');
            expect(sdManageType2.target).not.toBeNull();
            expect(sdManageType2.target).not.toBeUndefined();
            expect(sdManageType2.target?._type).toEqual('EntityType');
            expect(sdManageType2.objectPath.length).toEqual(3); // EntityContainer / EntitySet
        });

        it('can resolve Property', () => {
            const sdManageProperty: ResolutionTarget<Property> =
                convertedTypes.resolvePath('/SalesOrderManage/ImageUrl');
            expect(sdManageProperty.target).not.toBeNull();
            expect(sdManageProperty.target).not.toBeUndefined();
            expect(sdManageProperty.target?._type).toEqual('Property');
            expect(sdManageProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
        });

        it('can resolve Property from a starting point', () => {
            const sdManageProperty: ResolutionTarget<Property> = convertedTypes.resolvePath(
                'ImageUrl',
                convertedTypes.entitySets[40]
            );
            expect(sdManageProperty.target).not.toBeNull();
            expect(sdManageProperty.target).not.toBeUndefined();
            expect(sdManageProperty.target?._type).toEqual('Property');
            expect(sdManageProperty.objectPath.length).toEqual(3); // EntitySet / EntityType
        });

        it('can resolve Property with annotations', () => {
            const sdRatingProperty: ResolutionTarget<Property> = convertedTypes.resolvePath('/SalesOrderManage/Rating');
            expect(sdRatingProperty.target).not.toBeNull();
            expect(sdRatingProperty.target).not.toBeUndefined();
            expect(sdRatingProperty.target?._type).toEqual('Property');
            expect(sdRatingProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
            if (sdRatingProperty.target) {
                const sdDefault = sdRatingProperty.target.annotations.UI?.DataFieldDefault;
                expect(sdDefault?.$Type).toEqual(UIAnnotationTypes.DataFieldForAnnotation);
                const sdDefaultAsAnnotation: DataFieldForAnnotation = sdDefault as DataFieldForAnnotation;
                expect(sdDefaultAsAnnotation.Target.$target?.$Type).toEqual(UIAnnotationTypes.DataPointType);
            }
        });

        it('can resolve NavigationProperty on ComplexType', () => {
            const sdManageComplexNavProperty: ResolutionTarget<NavigationProperty> = convertedTypes.resolvePath(
                '/SalesOrderManage/ComplexWithNavigation/_SalesOrderType'
            );
            expect(sdManageComplexNavProperty.target).not.toBeNull();
            expect(sdManageComplexNavProperty.target).not.toBeUndefined();
            expect(sdManageComplexNavProperty.target?._type).toEqual('NavigationProperty');
            expect(sdManageComplexNavProperty.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / Property
        });

        it('can resolve a NavigationProperty', () => {
            const sdManageNavProperty: ResolutionTarget<NavigationProperty> =
                convertedTypes.resolvePath('/SalesOrderManage/_Item');
            expect(sdManageNavProperty.target).not.toBeNull();
            expect(sdManageNavProperty.target).not.toBeUndefined();
            expect(sdManageNavProperty.target?._type).toEqual('NavigationProperty');
            expect(sdManageNavProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
        });

        it("can resolve a NavigationProperty's target EntityType", () => {
            const sdManageNavPropertyTarget: ResolutionTarget<EntityType> =
                convertedTypes.resolvePath('/SalesOrderManage/_Item/');
            expect(sdManageNavPropertyTarget.target).not.toBeNull();
            expect(sdManageNavPropertyTarget.target).not.toBeUndefined();
            expect(sdManageNavPropertyTarget.target?._type).toEqual('EntityType');
            expect(sdManageNavPropertyTarget.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / NavProperty
        });

        it('can resolve EntityType Annotations', () => {
            const sdManageLineItem: ResolutionTarget<LineItem> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem'
            );
            expect(sdManageLineItem.target).not.toBeNull();
            expect(sdManageLineItem.target).not.toBeUndefined();
            expect(sdManageLineItem.target?.term).toEqual(UIAnnotationTerms.LineItem);
            expect(sdManageLineItem.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType

            const sdManageLineItem2: ResolutionTarget<LineItem> = convertedTypesModified.resolvePath(
                '/SalesOrderManage/@UI.LineItem'
            );
            expect(sdManageLineItem2.target).not.toBeNull();
            expect(sdManageLineItem2.target).not.toBeUndefined();
            expect(sdManageLineItem2.target?.term).toEqual(UIAnnotationTerms.LineItem);
            expect(sdManageLineItem2.objectPath.length).toEqual(4); // EntityContainer / EntitySe
        });

        it('can resolve EntityType Annotations by index', () => {
            const sdManageLineItemDF: ResolutionTarget<DataFieldAbstractTypes> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem/0'
            );
            expect(sdManageLineItemDF.target).not.toBeNull();
            expect(sdManageLineItemDF.target).not.toBeUndefined();
            expect(sdManageLineItemDF.target?.$Type).toEqual(UIAnnotationTypes.DataFieldForAction);
            expect(sdManageLineItemDF.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / LineItem
        });

        it('can resolve AnnotationPath Targets', () => {
            const sdManageLineItemFG: ResolutionTarget<AnnotationPath<FieldGroupType>> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem/10/Target'
            );
            expect(sdManageLineItemFG.target).not.toBeNull();
            expect(sdManageLineItemFG.target).not.toBeUndefined();
            expect(sdManageLineItemFG.target?.type).toEqual('AnnotationPath');
            expect(sdManageLineItemFG.target?.$target?.$Type).toEqual(UIAnnotationTypes.FieldGroupType);
            expect(sdManageLineItemFG.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation
        });

        it('can resolve AnnotationPath Targets with $AnnotationPath', () => {
            const sdManageLineItemFGTarget: ResolutionTarget<FieldGroupType> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem/10/Target/$AnnotationPath'
            );
            expect(sdManageLineItemFGTarget.target).not.toBeNull();
            expect(sdManageLineItemFGTarget.target).not.toBeUndefined();
            expect(sdManageLineItemFGTarget.target?.$Type).toEqual(UIAnnotationTypes.FieldGroupType);
            expect(sdManageLineItemFGTarget.objectPath.length).toEqual(7); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation / AnnotationPath / FieldGroupType
        });

        it('can resolve an annotation value pointing to a path behind a one to one', () => {
            const sdManageLineItemHiddenOneToOne: ResolutionTarget<Property> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem/11@UI.Hidden'
            );
            expect(sdManageLineItemHiddenOneToOne.target).not.toBeNull();
            expect(sdManageLineItemHiddenOneToOne.target).not.toBeUndefined();
            expect(sdManageLineItemHiddenOneToOne.target?.type).toEqual('Path');
            expect(sdManageLineItemHiddenOneToOne.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / LineItem / DataField
        });

        it("can resolve a NavigationProperty's target EntityType annotations", () => {
            const sdManageNavPropertyTargetAnnotations: ResolutionTarget<LineItem> = convertedTypes.resolvePath(
                '/SalesOrderManage/_Item/@UI.LineItem'
            );
            expect(sdManageNavPropertyTargetAnnotations.target).not.toBeNull();
            expect(sdManageNavPropertyTargetAnnotations.target).not.toBeUndefined();
            expect(sdManageNavPropertyTargetAnnotations.target?.term).toEqual(UIAnnotationTerms.LineItem);
            expect(sdManageNavPropertyTargetAnnotations.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / NavProperty / EntityType
        });

        it('can resolve AnnotationPath Targets with $AnnotationPath and some navigation', () => {
            const sdManageLineItemFGTargetWithOneOne: ResolutionTarget<ContactType> = convertedTypes.resolvePath(
                '/SalesOrderManage/@UI.LineItem/19/Target/$AnnotationPath'
            );
            expect(sdManageLineItemFGTargetWithOneOne.target).not.toBeNull();
            expect(sdManageLineItemFGTargetWithOneOne.target).not.toBeUndefined();
            expect(sdManageLineItemFGTargetWithOneOne.target?.$Type).toEqual(CommunicationAnnotationTypes.ContactType);
            expect(sdManageLineItemFGTargetWithOneOne.objectPath.length).toEqual(9); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation / AnnotationPath / NavigationProperty / EntityType / ContactType
        });

        it('can resolve NavigationPropertyBinding and checking for the parent with $', () => {
            //"sap.fe.core.Service.EntityContainer/RootEntity/$NavigationPropertyBinding/businessPartner/$"
            const sdNavigationPropBinding: ResolutionTarget<EntitySet> = convertedTypes.resolvePath(
                'com.c_salesordermanage_sd.EntityContainer/SalesOrderManage/$NavigationPropertyBinding/_DeliveryBlockReason'
            );
            expect(sdNavigationPropBinding.target).not.toBeNull();
            expect(sdNavigationPropBinding.target).not.toBeUndefined();
            expect(sdNavigationPropBinding.target?._type).toEqual('EntitySet');
            expect(sdNavigationPropBinding.objectPath.length).toEqual(4); // EntityContainer / EntitySet / NavPropBindingArray / EntitySet

            const sdNavigationPropBinding2: ResolutionTarget<EntitySet> = convertedTypes.resolvePath(
                'com.c_salesordermanage_sd.EntityContainer/SalesOrderManage/$NavigationPropertyBinding/_DeliveryBlockReason/$'
            );
            expect(sdNavigationPropBinding2.target).not.toBeNull();
            expect(sdNavigationPropBinding2.target).not.toBeUndefined();
            expect(sdNavigationPropBinding.target?._type).toEqual('EntitySet');
            expect(sdNavigationPropBinding2.objectPath.length).toEqual(4); // EntityContainer / EntitySet / NavPropBindingArray / EntitySet / EntityType / EntyitySet
        });

        it('can resolve $Path', () => {
            const target: ResolutionTarget<any> = convertedTypes.resolvePath(
                '/SalesOrderItem/@UI.LineItem/13/Value/$Path'
            );
            expect(target.target).not.toBeNull();
            expect(target.target).not.toBeUndefined();
            expect(target.objectPath.length).toEqual(9); // EntityContainer / EntitySet / EntityType / LineItem / DataField / Path / NavigationProperty / EntityType / Property
            expect(target.target._type).toEqual('Property');
            expect(target.target.name).toEqual('Material');
        });

        it('can resolve a path starting at an action', () => {
            const target: ResolutionTarget<any> = convertedTypes.resolvePath(
                '/SalesOrderItem/com.c_salesordermanage_sd.draftPrepare/in/owner/_ShipToParty/isVerified'
            );

            expect(target.target).not.toBeNull();
            expect(target.target).not.toBeUndefined();
            expect(target.objectPath.length).toEqual(11); // EntityContainer / EntitySet / EntityType / Action / ActionParameter / EntityType / NavigationProperty / EntityType / NavigationProperty / EntityType / Property
            expect(target.target._type).toEqual('Property');
            expect(target.target.name).toEqual('isVerified');
        });

        it('can resolve a path starting at an unbound action', () => {
            const target: ResolutionTarget<any> = convertedTypes.resolvePath(
                '/com.c_salesordermanage_sd.UnboundAction/0'
            );

            expect(target.target).not.toBeNull();
            expect(target.target).not.toBeUndefined();
            expect(target.objectPath.length).toEqual(1); // Action
            expect(target.target._type).toEqual('Action');
            expect(target.target.name).toEqual('UnboundAction');
        });

        it('can resolve /$Type starting at an entity type', () => {
            const entityType = convertedTypes.entityTypes[0];
            expect(entityType).not.toBeNull();
            expect(entityType).not.toBeUndefined();

            const target = entityType.resolvePath('$Type', true);
            expect(target.visitedObjects.length).toEqual(1); // EntityType
            expect(target.target).toStrictEqual(entityType);
        });

        it('correctly returns an undefined target for invalid paths', () => {
            const entityType = convertedTypes.entityTypes[0];
            expect(entityType).not.toBeNull();
            expect(entityType).not.toBeUndefined();

            // invalid: target is undefined
            const target1 = entityType.resolvePath('@com.sap.vocabularies.Common.v1.Label/XXXXXXXXX', true);
            expect(target1.target).toBeUndefined();
            expect(target1.visitedObjects.length).toEqual(2); // EntityType / Annotation

            // but allow a slash at the end
            const target2 = entityType.resolvePath('@com.sap.vocabularies.Common.v1.Label/', true);
            expect(target2.target).toBeDefined();
            expect(target2.visitedObjects.length).toEqual(2); // EntityType / Annotation
        });
    });

    describe('can support resolution target for singleton as well', () => {
        let convertedTypes: ConvertedMetadata;

        beforeAll(async () => {
            const parsedEDMX = parse(await loadFixture('v4/trippin/metadata.xml'));
            const annoFile = await loadFixture('v4/trippin/annotation.xml');
            const annoSchema: RawMetadata = parse(annoFile, 'annoFile');
            const mergeSchema = merge(parsedEDMX, annoSchema);
            convertedTypes = convert(mergeSchema);
        });

        it('can resolve a singleton', () => {
            const singletonPath: ResolutionTarget<EntitySet> = convertedTypes.resolvePath('/Me');
            expect(singletonPath.target).not.toBeNull();
            expect(singletonPath.target).not.toBeUndefined();
            expect(singletonPath.target?._type).toEqual('Singleton');
            expect(singletonPath.objectPath.length).toEqual(2); // EntityContainer / Singleton
        });

        it('can resolve a property of a singleton', () => {
            const singletonPathProp: ResolutionTarget<EntitySet> = convertedTypes.resolvePath('/Me/FirstName');
            expect(singletonPathProp.target).not.toBeNull();
            expect(singletonPathProp.target).not.toBeUndefined();
            expect(singletonPathProp.target?._type).toEqual('Property');
            expect(singletonPathProp.objectPath.length).toEqual(4); // EntityContainer / Singleton / EntityType / Property
        });

        it('can resolve a NavigationProperty of a singleton', () => {
            const singletonPathNav: ResolutionTarget<EntitySet> = convertedTypes.resolvePath('/Me/Friends');
            expect(singletonPathNav.target).not.toBeNull();
            expect(singletonPathNav.target).not.toBeUndefined();
            expect(singletonPathNav.target?._type).toEqual('NavigationProperty');
            expect(singletonPathNav.objectPath.length).toEqual(4); // EntityContainer / Singleton / EntityType / NavProp
        });

        it('can resolve a Property of an EntityType behind a NavigationProperty of a singleton', () => {
            const singletonPathNavProp: ResolutionTarget<EntitySet> =
                convertedTypes.resolvePath('/Me/Friends/FirstName');
            expect(singletonPathNavProp.target).not.toBeNull();
            expect(singletonPathNavProp.target).not.toBeUndefined();
            expect(singletonPathNavProp.target?._type).toEqual('Property');
            expect(singletonPathNavProp.objectPath.length).toEqual(6); // EntityContainer / Singleton / EntityType / NavProp / EntityType / Property
        });
    });

    it('can support further resolvePath syntax', async () => {
        const parsedEDMX2 = parse(await loadFixture('v4/manageLineItems.xml'));
        const convertedTypes2 = convert(parsedEDMX2);
        // It can resolve action parameters
        const manageLineItem: ResolutionTarget<ActionParameter> = convertedTypes2.resolvePath(
            '/LineItems/sap.fe.manageitems.TechnicalTestingService.testParameterDefaultValue/@$ui5.overload/0/$Parameter/1'
        );
        expect(manageLineItem.target).not.toBeNull();
        expect(manageLineItem.target).not.toBeUndefined();
        expect(manageLineItem.target?._type).toEqual('ActionParameter');
        expect(manageLineItem.target?.typeReference).toBeUndefined();
    });

    describe('converts ComplexType (also nested)', () => {
        let convertedTypes: ConvertedMetadata;

        beforeAll(async () => {
            const parsedEDMX = parse(await loadFixture('v4/ComplexType.xml'));
            convertedTypes = convert(parsedEDMX);
        });

        it('can resolve a complex property', () => {
            const resolvedProperty: ResolutionTarget<any> = convertedTypes.resolvePath('/TestEntity/complexProperty1');
            expect(resolvedProperty.target).not.toBeUndefined();
            expect(resolvedProperty.target).not.toBeNull();
            expect(resolvedProperty.target.targetType).not.toBeUndefined();
            expect(resolvedProperty.target.targetType).not.toBeNull();
            expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual(
                'MyService.TestEntity_complexProperty1'
            );
        });

        it('can resolve a nested complex property (complex -> complex)', () => {
            const resolvedProperty: ResolutionTarget<any> = convertedTypes.resolvePath(
                '/TestEntity/complexProperty1/complexProperty2'
            );
            expect(resolvedProperty.target).not.toBeUndefined();
            expect(resolvedProperty.target).not.toBeNull();
            expect(resolvedProperty.target.targetType).not.toBeUndefined();
            expect(resolvedProperty.target.targetType).not.toBeNull();
            expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual(
                'MyService.TestEntity_complexProperty1_complexProperty2'
            );
        });

        it('can resolve a nested complex property (complex -> complex -> complex)', () => {
            const resolvedProperty: ResolutionTarget<any> = convertedTypes.resolvePath(
                '/TestEntity/complexProperty1/complexProperty2/complexProperty3'
            );
            expect(resolvedProperty.target).not.toBeUndefined();
            expect(resolvedProperty.target).not.toBeNull();
            expect(resolvedProperty.target.targetType).not.toBeUndefined();
            expect(resolvedProperty.target.targetType).not.toBeNull();
            expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual(
                'MyService.TestEntity_complexProperty1_complexProperty2_complexProperty3'
            );
        });
    });

    it('works well with side effects', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[40]).not.toBeNull();
        expect(convertedTypes.entitySets[40].entityType).not.toBeNull();
        const sdEntityType = convertedTypes.entitySets[40].entityType;
        expect(sdEntityType.navigationProperties.by_name('_Item')?.referentialConstraint).toEqual([
            {
                sourceProperty: 'ID',
                targetProperty: 'SalesOrder',
                targetTypeName: 'com.c_salesordermanage_sd.SalesOrderItem'
            }
        ]);
        const sideEffect = sdEntityType.annotations.Common?.['SideEffects#IncotermsChange'];
        expect(sideEffect?.$Type).toEqual(CommonAnnotationTypes.SideEffectsType);

        expect(sideEffect?.SourceEntities[0]?.value).toEqual('');
        expect(sideEffect?.SourceEntities[0]?.$target).toBeUndefined();
        expect(sideEffect?.TargetProperties).toEqual(['IncotermsLocation1']);
    });

    describe('can convert EDMX', () => {
        let convertedTypes: ConvertedMetadata;

        beforeAll(async () => {
            const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
            convertedTypes = convert(parsedEDMX);
        });

        it('run basic checks', () => {
            expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
            expect(convertedTypes.entityTypes[39].annotations.UI).not.toBeNull();
        });

        it('supports access by name and fully-qualified name', () => {
            expect(convertedTypes.entitySets.by_name('SalesOrderManage')).not.toBeUndefined();
            expect(
                convertedTypes.entitySets.by_fullyQualifiedName(
                    'com.c_salesordermanage_sd.EntityContainer/SalesOrderItem'
                )
            ).not.toBeUndefined();
        });

        it('converts annotation with annotation', () => {
            const entity = convertedTypes.entityTypes.find((type) => type.name === 'HeaderShipToParty');
            const property = entity?.entityProperties.find((property) => property.name === 'BusinessPartner');
            expect(
                property?.annotations?.Common?.Text?.annotations?.UI?.TextArrangement?.toString()
            ).toMatchInlineSnapshot(`"UI.TextArrangementType/TextFirst"`);
        });

        it('array-typed annotation', () => {
            const LineItem = convertedTypes.entityTypes[39].annotations.UI!.LineItem;
            const transformedLineItem = revertTermToGenericType(defaultReferences, LineItem);
            expect(transformedLineItem).toMatchSnapshot();
        });

        it('object-typed annotation', () => {
            const HeaderInfo = convertedTypes.entityTypes[39].annotations.UI!.HeaderInfo;
            const transformedHeaderInfo = revertTermToGenericType(defaultReferences, HeaderInfo);
            expect(transformedHeaderInfo).toMatchSnapshot();
        });
    });

    it('can convert EDMX with validation', async () => {
        const parsedEDMX = parse(await loadFixture('v4/withValidation.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
    });

    it("can target action through it's overload", async () => {
        const parsedEDMX = parse(await loadFixture('v4/sideEffectActions/$metadata.xml'));
        const parsedEDMX2 = parse(await loadFixture('v4/sideEffectActions/localAnnotation.xml'), 'localAnno');
        const mergedOutput = merge(parsedEDMX, parsedEDMX2);
        const convertedTypes = convert(mergedOutput);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
    });

    it('can convert things properly', async () => {
        const parsedEDMX = parse(await loadFixture('v4/pathError.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
        const x = convertedTypes.resolvePath('/Incidents@com.sap.vocabularies.UI.v1.Facets/1/Target');
        expect(convertedTypes.diagnostics).not.toBeNull();
        expect(convertedTypes.diagnostics[0].message).toMatchInlineSnapshot(
            `"Annotation 'com.sap.vocabularies.UI.v1.Facets' not found on EntitySet 'IncidentService.EntityContainer/Incidents'"`
        );
    });

    it('can find CollectionPath', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        const entityType = convertedTypes.entityTypes.by_name('MaterialDetails');
        const collectionPath =
            entityType?.entityProperties.by_name('BrandCategory')?.annotations.Common?.ValueList?.CollectionPathTarget;
        expect(collectionPath).not.toBeNull();
        expect(collectionPath?._type).toBe('EntitySet');
        expect(collectionPath?.fullyQualifiedName).toBe('com.c_salesordermanage_sd.EntityContainer/MaterialCategory');
    });
    it('can find CollectionPath when going through value list references', async () => {
        const parsedEDMX = parse(await loadFixture('v4/otherSD.xml'));
        const parsedVHReferences = parse(await loadFixture('v4/vhReference.xml'), 'vhReferences');
        const convertedTypes = convert(parsedEDMX);
        const entitySet = convertedTypes.entitySets.by_name('SalesOrderManage');
        const entityType = convertedTypes.entityTypes.by_name('SalesOrderManageType');
        const vhReferences =
            entityType?.entityProperties.by_name('HeaderBillingBlockReason')?.annotations.Common?.ValueListReferences;
        expect(vhReferences).not.toBeNull();
        convertedTypes.addValueListWithReferences(parsedVHReferences);
        const collectionPath =
            entityType?.entityProperties.by_name('HeaderBillingBlockReason')?.annotations.Common?.ValueListMapping
                ?.CollectionPathTarget;
        expect(collectionPath).not.toBeNull();
        expect(collectionPath?._type).toBe('EntitySet');
        expect(collectionPath?.fullyQualifiedName).toBe(
            'com.sap.gateway.srvd_f4.i_billingblockreason.v0001.Container/I_BillingBlockReason'
        );
    });

    it('dummy bound action', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const parsedEDMX2 = parse(await loadFixture('v4/boundActionOverload.xml'), 'localAnno');
        const mergedOutput = merge(parsedEDMX, parsedEDMX2);
        const convertedTypes = convert(mergedOutput);
        const boundActions = convertedTypes.actions.filter((action: any) => action.name === 'DummyBoundAction');
        //	<Annotations Target="com.c_salesordermanage_sd.DummyBoundAction">
        // 				<Annotation Term="UI.Hidden" Bool="true" />
        //              <Annotation Term="Core.OperationAvailable" Path="Yolo" />
        // 			</Annotations>
        // 			<Annotations Target="com.c_salesordermanage_sd.DummyBoundAction(com.c_salesordermanage_sd.SalesOrderManage)">
        // 				<Annotation Term="UI.Hidden" Path="_it/Delivered" />
        // 			</Annotations>
        // 			<Annotations Target="com.c_salesordermanage_sd.DummyBoundAction(com.c_salesordermanage_sd.SalesOrderItem)">
        // 				<Annotation Term="Core.OperationAvailable" Path="_it/owner/_ShipToParty/isVerified" />
        // 			</Annotations>
        expect(boundActions[0].fullyQualifiedName).toEqual(
            'com.c_salesordermanage_sd.DummyBoundAction(com.c_salesordermanage_sd.SalesOrderItem)'
        );
        expect((boundActions[0].annotations.UI as any)?.Hidden.valueOf()).toEqual(true);
        expect((boundActions[0].annotations.Core?.OperationAvailable as any).path).toEqual(
            '_it/owner/_ShipToParty/isVerified'
        );
        expect(boundActions[1].fullyQualifiedName).toEqual(
            'com.c_salesordermanage_sd.DummyBoundAction(com.c_salesordermanage_sd.SalesOrderManage)'
        );
        expect((boundActions[1].annotations.UI as any)?.Hidden.path).toEqual('_it/Delivered');
        expect((boundActions[1].annotations.UI as any)?.Hidden[CONVERTER_ROOT]()).toBe(convertedTypes);
        expect((boundActions[1].annotations.Core?.OperationAvailable as any).path).toEqual('Yolo');
    });

    it('supports null expression', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        const operationAvail = convertedTypes.actions[28].annotations?.Core?.OperationAvailable;
        expect(operationAvail).not.toBeUndefined();
        expect((operationAvail as any).type).toEqual('Null');
    });

    it('can revert enumMember properly', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
        expect(convertedTypes.entityTypes[39].annotations.UI).not.toBeNull();

        if (convertedTypes.entityTypes[39].annotations?.UI?.LineItem) {
            const LineItem = convertedTypes.entityTypes[39].annotations.UI.LineItem;
            (LineItem[0] as DataFieldForActionTypes).InvocationGrouping = OperationGroupingType.Isolated;
            (LineItem[0] as DataFieldForActionTypes).Action = 'SAP.SEPMRA_PROD_MAN_Entities/SEPMRA_C_PD_ProductCopy';
            const transformedLineItem = revertTermToGenericType(defaultReferences, LineItem) as any;
            expect(transformedLineItem.collection[0].propertyValues[1].name).toEqual('Action');
            expect(transformedLineItem.collection[0].propertyValues[1].value.type).toEqual('String');
            expect(transformedLineItem.collection[0].propertyValues[1].value.String).toEqual(
                'SAP.SEPMRA_PROD_MAN_Entities/SEPMRA_C_PD_ProductCopy'
            );
            expect(transformedLineItem.collection[0].propertyValues[2].name).toEqual('InvocationGrouping');
            expect(transformedLineItem.collection[0].propertyValues[2].value.type).toEqual('EnumMember');
            expect(transformedLineItem.collection[0].propertyValues[2].value.EnumMember).toEqual(
                'UI.OperationGroupingType/Isolated'
            );
        }
    });

    it('can revert a criticality', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);
        if (convertedTypes.entityTypes[39].annotations?.UI?.LineItem) {
            const criticality: Criticality = {
                path: 'OverallSDStatus',
                type: 'Path'
            } as Criticality;
            const LineItem = convertedTypes.entityTypes[39].annotations.UI.LineItem;
            LineItem.annotations = { UI: { Criticality: criticality } };
            const transformedLineItem = revertTermToGenericType(defaultReferences, LineItem) as any;
            expect(transformedLineItem.term).toEqual(UIAnnotationTerms.LineItem);
            expect(transformedLineItem.annotations.length).toEqual(1);
            expect(transformedLineItem.annotations[0].term).toEqual(UIAnnotationTerms.Criticality);
            expect(transformedLineItem.annotations[0].value.Path).toEqual('OverallSDStatus');
        }
    });

    it('can convert v2 EDMX with sap:* annotations', async () => {
        const parsedEDMX = parse(await loadFixture('v2/metadata.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
        expect(convertedTypes.entityTypes[16].entityProperties[0].annotations?.Common?.Label?.toString()).toEqual(
            'Country Key'
        );
        expect(
            (
                convertedTypes.entityTypes[16].entityProperties[0].annotations?.Common
                    ?.Text as PathAnnotationExpression<any>
            ).type
        ).toEqual('Path');
        expect(
            (
                convertedTypes.entityTypes[16].entityProperties[0].annotations?.Common
                    ?.Text as PathAnnotationExpression<any>
            ).path
        ).toEqual('Country_Text');
    });

    it('inlines referenced PresentationVariant (PV before SPV)', async () => {
        const parsedEDMX = parse(await loadFixture('v4/PVbeforeSPV.xml'));
        const convertedTypes = convert(parsedEDMX);
        const selectionPresentationVariant =
            convertedTypes.entityTypes[0].annotations?.UI?.SelectionPresentationVariant;
        expect(selectionPresentationVariant).not.toBeUndefined();
        expect(selectionPresentationVariant).not.toBeNull();

        const presentationVariant = selectionPresentationVariant?.PresentationVariant;
        expect(presentationVariant?.Visualizations).not.toBeUndefined();
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@com.sap.vocabularies.UI.v1.LineItem');
    });

    it('inlines referenced PresentationVariant (PV after SPV)', async () => {
        const parsedEDMX = parse(await loadFixture('v4/PVafterSPV.xml'));
        const convertedTypes = convert(parsedEDMX);
        const selectionPresentationVariant =
            convertedTypes.entityTypes[0].annotations?.UI?.SelectionPresentationVariant;
        expect(selectionPresentationVariant).not.toBeUndefined();
        expect(selectionPresentationVariant).not.toBeNull();

        const presentationVariant = selectionPresentationVariant?.PresentationVariant;
        expect(presentationVariant?.Visualizations).not.toBeUndefined();
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@com.sap.vocabularies.UI.v1.LineItem');
    });

    it('keeps inline annotation of PresentationVariant', async () => {
        const parsedEDMX = parse(await loadFixture('v4/PVinline.xml'));
        const convertedTypes = convert(parsedEDMX);
        const selectionPresentationVariant =
            convertedTypes.entityTypes[0].annotations?.UI?.SelectionPresentationVariant;
        expect(selectionPresentationVariant).not.toBeUndefined();
        expect(selectionPresentationVariant).not.toBeNull();

        const presentationVariant = selectionPresentationVariant?.PresentationVariant;
        expect(presentationVariant?.Visualizations).not.toBeUndefined();
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@com.sap.vocabularies.UI.v1.LineItem');
        expect(presentationVariant?.$Type).toEqual('com.sap.vocabularies.UI.v1.PresentationVariantType');
    });

    it.skip('support all references that are not vocabularies', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sideEffectActions/$metadata.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.references.length).toEqual(14);
        expect(convertedTypes.references[13].alias).toEqual('SAP__self');
        expect(convertedTypes.references[13].namespace).toEqual(
            'com.sap.gateway.srvd.c_slsordreqfrmextsource_sd.v0001'
        );
    });

    it('support typeDefinitions', async () => {
        const parsedEDMX = parse(await loadFixture('v4/withTypeDef.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.typeDefinitions.length).toEqual(1);
        expect(convertedTypes.entityTypes[1].entityProperties[48].type).toEqual('RequisitionUIService.URL');
        expect(convertedTypes.entityTypes[1].entityProperties[48].targetType?._type).toEqual('TypeDefinition');
        expect(
            (convertedTypes.entityTypes[1].entityProperties[48].targetType as TypeDefinition).underlyingType
        ).toEqual('Edm.String');
    });

    it('merge data properly', async () => {
        const parsedMetadata = parse(await loadFixture('merge/metadata.xml'));
        const parsedAnnotations = parse(await loadFixture('merge/annotations.xml'), 'annotation.xml');
        const convertedTypes = convert(merge(parsedMetadata, parsedAnnotations));
        expect(convertedTypes.entityTypes[0].annotations?.UI?.LineItem?.length).toEqual(2);
        expect(
            convertedTypes.entityTypes[0].annotations?.UI?.LineItem?.[0]?.annotations?.UI?.Importance
        ).toBeUndefined();
        const parsedMetadata2 = parse(await loadFixture('merge/metadata.xml'));
        const convertedMetadataTypes = convert(parsedMetadata2);
        expect(convertedMetadataTypes.entityTypes[0].annotations?.UI?.LineItem?.length).toEqual(11);
        expect(
            convertedMetadataTypes.entityTypes[0].annotations?.UI?.LineItem?.[0]?.annotations?.UI?.Importance?.toString()
        ).toEqual('UI.ImportanceType/High');
    });

    function checkAnnotationObject(convertedTypes: ConvertedMetadata) {
        convertedTypes.entityTypes.forEach((entityType) => {
            expect(entityType).toHaveProperty('annotations');
            expect(entityType.annotations).not.toBeUndefined();
            expect(entityType.annotations).not.toBeNull();
        });
    }

    it('should return type-compliant entity types (no containment)', async () => {
        const parsedMetadata = parse(await loadFixture('v4/AnnoNoContainment.xml'));
        const convertedTypes = convert(parsedMetadata);

        checkAnnotationObject(convertedTypes);
    });

    it('should return type-compliant entity types (with containments)', async () => {
        const parsedMetadata = parse(await loadFixture('v4/AnnoWithContainment.xml'));
        const convertedTypes = convert(parsedMetadata);

        checkAnnotationObject(convertedTypes);
    });

    it('should resolve the ActionTarget of a static action', async () => {
        const parsedMetadata = parse(await loadFixture('v4/static-action.xml'));
        const convertedTypes = convert(parsedMetadata);

        const dataFieldForAction = convertedTypes.entityTypes[0]?.annotations.UI?.LineItem?.[0] as any;
        const action = convertedTypes.actions[0];
        expect(dataFieldForAction).toBeDefined();
        expect(dataFieldForAction).not.toBeNull();
        expect(action).toBeDefined();
        expect(action).not.toBeNull();
        expect(dataFieldForAction.ActionTarget).toEqual(action);
    });

    it('should resolve all ActionTargets - unique names', async () => {
        const parsedMetadata = parse(await loadFixture('v4/actions-and-functions.xml'));
        const convertedTypes = convert(parsedMetadata);

        const dataFields = convertedTypes.entityTypes[0]?.annotations.UI?.LineItem as any[];
        expect(dataFields.length).toEqual(7);
        expect(dataFields[0].ActionTarget).toBeDefined();
        expect(dataFields[1].ActionTarget).toBeDefined();
        expect(dataFields[2].ActionTarget).toBeDefined();
        expect(dataFields[3].ActionTarget).not.toBeDefined(); // invalid use: ref to unbound function bypassing the ActionImport
        expect(dataFields[4].ActionTarget).not.toBeDefined(); // invalid use: ref to unbound action bypassing the FunctionImport
        expect(dataFields[5].ActionTarget).toBeDefined();
        expect(dataFields[6].ActionTarget).toBeDefined();
    });

    it('should resolve all ActionTargets - overloaded names', async () => {
        const parsedMetadata = parse(await loadFixture('v4/actions-and-functions-overload.xml'));
        const convertedTypes = convert(parsedMetadata);

        function getAction(name: string) {
            const result = convertedTypes.actions.by_fullyQualifiedName(name);
            expect(result).toBeDefined();
            return result;
        }

        const dataFields1 = convertedTypes.entityTypes[0]?.annotations.UI?.LineItem as any[];
        expect(dataFields1[0].ActionTarget).toBe(getAction('TestService.action(TestService.Entity1)'));
        expect(dataFields1[1].ActionTarget).toBe(getAction('TestService.function(TestService.Entity1)'));
        expect(dataFields1[2].ActionTarget).toBe(getAction('TestService.action()'));
        expect(dataFields1[3].ActionTarget).toBe(getAction('TestService.function()'));
        expect(dataFields1[4].ActionTarget).toBe(getAction('TestService.action(TestService.Entity1)'));
        expect(dataFields1[5].ActionTarget).toBe(undefined);
        expect(dataFields1[6].ActionTarget).toBe(undefined);
        expect(dataFields1[7].ActionTarget).toBe(getAction('TestService.action()'));
        expect(dataFields1[8].ActionTarget).toBe(getAction('TestService.function()'));

        const dataFields2 = convertedTypes.entityTypes[1]?.annotations.UI?.LineItem as any[];
        expect(dataFields2[0].ActionTarget).toBe(getAction('TestService.action(TestService.Entity2)'));
        expect(dataFields2[1].ActionTarget).toBe(getAction('TestService.function(TestService.Entity2)'));
        expect(dataFields2[2].ActionTarget).toBe(getAction('TestService.action()'));
        expect(dataFields2[3].ActionTarget).toBe(getAction('TestService.function()'));
        expect(dataFields2[4].ActionTarget).toBe(getAction('TestService.action(TestService.Entity1)'));
    });

    it('should resolve annotations of unbound actions', async () => {
        const parsedMetadata = parse(await loadFixture('v4/action-enablement.xml'));
        const convertedTypes = convert(parsedMetadata);

        const rootEntityType = (convertedTypes.resolvePath('/RootElement/') as ResolutionTarget<EntityType>)?.target;
        expect(rootEntityType?.name).toEqual('RootElement');

        const dataFieldForAction = rootEntityType?.annotations.UI?.LineItem?.[14];
        expect(dataFieldForAction).toBeDefined();
        expect(dataFieldForAction?.$Type).toEqual(UIAnnotationTypes.DataFieldForAction);
        const action = (dataFieldForAction as DataFieldForAction).ActionTarget;
        expect(action?.annotations?.Core?.OperationAvailable).toBeDefined();
    });

    it('Correctly handles literal values in annotations', async () => {
        const parsedMetadata = parse(await loadFixture('v4/literals.xml'));
        const convertedTypes = convert(parsedMetadata);

        const entityType = convertedTypes.entityTypes[0];
        expect(entityType.name).toEqual('Entity');

        const idProperty = entityType.entityProperties[0];
        expect(idProperty?.annotations?.UI?.Hidden?.valueOf()).toEqual(true);
        expect(idProperty?.annotations?.Validation?.Minimum?.valueOf()).toEqual(10);
        expect(idProperty?.annotations?.Common?.Label?.valueOf()).toEqual('Key');

        expect(entityType.annotations.UI?.Identification?.[0]?.annotations?.UI?.Hidden?.valueOf()).toEqual(true);
        expect(entityType.annotations.UI?.Identification?.[0]?.annotations?.Common?.Heading?.valueOf()).toEqual('Text');
        expect(
            entityType.annotations.UI?.Identification?.[0]?.annotations?.Analytics?.RolledUpPropertyCount?.valueOf()
        ).toEqual(11);
    });

    it('Can handle annotations of complex types', async () => {
        const parsedMetadata = parse(await loadFixture('v4/complexTypeAnnos.xml'));
        const convertedTypes = convert(parsedMetadata);

        const complexType = convertedTypes.complexTypes[0];
        const property = complexType.properties.by_name('name');
        expect(property).toBeDefined();
        const annos = property?.annotations.Common?.Text;
        expect(annos).toBeDefined();
    });

    describe('Aliases', () => {
        const metadata = loadFixture('v4/aliased.xml');
        let convertedTypes: ConvertedMetadata;

        beforeEach(async () => {
            const parsedEDMX = parse(await metadata);
            convertedTypes = convert(parsedEDMX);
        });

        it('transforms aliased annotation terms to the right default aliases', async () => {
            const entityType = convertedTypes.entityTypes.by_name('Entities');
            const annotations = entityType!.annotations;
            expect(Object.keys(annotations)).toMatchInlineSnapshot(`
                [
                  "Common",
                  "UI",
                ]
            `);
            expect(annotations.Common?.Label?.term).toEqual('com.sap.vocabularies.Common.v1.Label');
            expect(annotations.UI?.Identification?.term).toEqual('com.sap.vocabularies.UI.v1.Identification');
        });

        describe('EntityType.resolvePath()', () => {
            it.each([
                // Qualified name of an action or function (foo.bar)
                {
                    path: 'sap.fe.test.JestService.doSomething',
                    targetFQN: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                    targetLabel: 'Label of action doSomething'
                },
                {
                    path: 'MyServiceAlias.doSomething',
                    targetFQN: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                    targetLabel: 'Label of action doSomething'
                },
                // Qualified name of an action or function followed by parentheses with the parameter signature to identify a specific overload, like in an annotation target (foo.bar(baz.qux))
                {
                    path: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                    targetFQN: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                    targetLabel: 'Label of action doSomething'
                },
                {
                    path: 'MyServiceAlias.doSomething(MyServiceAlias.Entities)',
                    targetFQN: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                    targetLabel: 'Label of action doSomething'
                }
            ])('$path', ({ path, targetFQN, targetLabel }) => {
                const entityType = convertedTypes.entityTypes.by_name('Entities')!;
                const resolved = entityType.resolvePath(path) as Action | undefined;

                expect(resolved?.fullyQualifiedName).toEqual(targetFQN);

                expect(resolved?.annotations?.Common?.Label?.valueOf()).toEqual(targetLabel);
            });
        });

        describe('ActionTarget of DataFieldForAction', () => {
            it.each([
                {
                    dataFieldIndex: 0,
                    expectedDataFieldAction: 'MyServiceAlias.doSomething',
                    expectedDataFieldActionTargetFQN:
                        'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)'
                },
                {
                    dataFieldIndex: 1,
                    expectedDataFieldAction: 'MyServiceAlias.doSomething(MyServiceAlias.Entities)',
                    expectedDataFieldActionTargetFQN:
                        'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)'
                },
                {
                    dataFieldIndex: 2,
                    expectedDataFieldAction: 'doSomethingUnbound',
                    expectedDataFieldActionTargetFQN: 'sap.fe.test.JestService.doSomethingUnbound()'
                },
                {
                    dataFieldIndex: 3,
                    expectedDataFieldAction: 'MyServiceAlias.EntityContainer/doSomethingUnbound',
                    expectedDataFieldActionTargetFQN: 'sap.fe.test.JestService.doSomethingUnbound()'
                }
            ])(
                '$expectedDataFieldAction',
                ({ dataFieldIndex, expectedDataFieldAction, expectedDataFieldActionTargetFQN }) => {
                    const entityType = convertedTypes.entityTypes.by_name('Entities');
                    const annotations = entityType!.annotations;
                    const dataFieldForAction = annotations.UI!.Identification![dataFieldIndex] as DataFieldForAction;
                    expect(dataFieldForAction.fullyQualifiedName).toEqual(
                        `sap.fe.test.JestService.Entities@com.sap.vocabularies.UI.v1.Identification/${dataFieldIndex}`
                    );
                    expect(dataFieldForAction.Action).toEqual(expectedDataFieldAction); // this is possibly unaliased because the converter does not transform strings
                    expect(dataFieldForAction.ActionTarget?.fullyQualifiedName).toEqual(
                        expectedDataFieldActionTargetFQN
                    );
                }
            );
        });
    });

    it(`Resolves invalid $targets to undefined`, async () => {
        const metadata = await loadFixture('v4/invalidReferences.xml');
        const parsedEDMX = parse(metadata);
        const convertedTypes: ConvertedMetadata = convert(parsedEDMX);

        const entityType = convertedTypes.entityTypes.by_name('Entity');
        const selectionFields = entityType?.annotations.UI?.SelectionFields;
        expect(selectionFields?.length).toEqual(2);
        selectionFields?.forEach((selectionField) => {
            expect(selectionField.$target).toBeUndefined();
        });

        const dataFields = entityType?.annotations.UI?.FieldGroup?.Data as DataField[] | undefined;
        expect(dataFields?.length).toEqual(2);
        dataFields?.forEach((dataField) => {
            expect(dataField.Value).toBeDefined();
        });
    });

    it('returns the right set of references', () => {
        const convertedTypes = convert({
            identification: '',
            references: [{ alias: 'MyAlias', namespace: 'MyNamespace', uri: 'MyUri' }],
            version: '4.0',
            schema: {
                namespace: '',
                actions: [],
                annotations: {},
                entityTypes: [],
                entitySets: [],
                enumTypes: [],
                associations: [],
                actionImports: [],
                complexTypes: [],
                entityContainer: {
                    _type: 'EntityContainer',
                    name: '',
                    fullyQualifiedName: ''
                },
                singletons: [],
                typeDefinitions: [],
                associationSets: []
            }
        });

        expect(convertedTypes.references).toEqual(VocabularyReferences);

        const hasCollision = convertedTypes.references.some((reference) =>
            convertedTypes.references.some(
                (otherReference) =>
                    otherReference !== reference &&
                    (otherReference.alias === reference.alias || otherReference.namespace === reference.namespace)
            )
        );
        expect(hasCollision).toBeFalsy();
    });

    describe('Annotations on Action Parameters', () => {
        let convertedTypes: ConvertedMetadata;

        beforeAll(async () => {
            const metadata = await loadFixture('v4/action-parameters.xml');
            const parsedEDMX = parse(metadata);
            convertedTypes = convert(parsedEDMX);
        });

        it('Actions: Parameters with annotations on the specific overload', () => {
            // Unbound action: param1
            let action = convertedTypes.actions.by_fullyQualifiedName('TestService.action()');
            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[specific unbound overload] action/param1'
            );

            // Bound action on Entity1: param1
            action = convertedTypes.entityTypes.by_name('Entity1')?.actions['TestService.action'];

            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[specific bound overload] Entity1/action/param1'
            );
        });

        it('Functions: Parameters with annotations on the specific overload', () => {
            // Unbound function: param1
            let action = convertedTypes.actions.by_fullyQualifiedName('TestService.function(Edm.String,Edm.String)');
            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[specific unbound overload] function/param1'
            );

            // Bound function on Entity1: param1
            action = convertedTypes.entityTypes.by_name('Entity1')?.actions['TestService.function'];

            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[specific bound overload] Entity1/function/param1'
            );
        });

        it('Actions: Parameters without annotations on the specific overload', () => {
            // Unbound action: param2
            let action = convertedTypes.actions.by_fullyQualifiedName('TestService.action()');
            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] action/param2'
            );

            // Bound action on Entity1: param2
            action = convertedTypes.entityTypes.by_name('Entity1')?.actions['TestService.action'];

            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] action/param2'
            );

            // Bound action on Entity2: param1 + param2
            action = convertedTypes.entityTypes.by_name('Entity2')?.actions['TestService.action'];

            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] action/param1'
            );

            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] action/param2'
            );
        });

        it('Functions: Parameters without annotations on the specific overload', () => {
            // Unbound function: param2
            let action = convertedTypes.actions.by_fullyQualifiedName('TestService.function(Edm.String,Edm.String)');
            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] function/param2'
            );

            // Bound function on Entity1: param2
            action = convertedTypes.entityTypes.by_name('Entity1')?.actions['TestService.function'];

            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] function/param2'
            );

            // Bound function on Entity2: param1 + param2
            action = convertedTypes.entityTypes.by_name('Entity2')?.actions['TestService.function'];

            expect(action?.parameters.by_name('param1')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] function/param1'
            );

            expect(action?.parameters.by_name('param2')?.annotations.Common?.Label?.valueOf()).toEqual(
                '[unspecific] function/param2'
            );
        });
    });
});
