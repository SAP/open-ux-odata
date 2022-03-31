import { merge, parse } from '@sap-ux/edmx-parser';
import { loadFixture } from './fixturesHelper';
import { convert, defaultReferences, revertTermToGenericType } from '../src';
import type {
    ActionParameter,
    Annotation,
    AnnotationPath,
    EntitySet,
    EntityType,
    EnumValue,
    NavigationProperty,
    PathAnnotationExpression,
    Property,
    RawMetadata,
    ResolutionTarget,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import type {
    CriticalityType,
    DataFieldAbstractTypes,
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
import { CommunicationAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/Communication';
import type { ContactType } from '@sap-ux/vocabularies-types/vocabularies/Communication';
import { CommonAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/Common';

const rawLineItem = {
    term: 'UI.LineItem',
    collection: [
        {
            type: 'UI.DataFieldForAction',
            propertyValues: [
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'Change Order Type'
                    }
                },
                {
                    name: 'Action',
                    value: {
                        type: 'String',
                        String: 'com.c_salesordermanage_sd.CreateWithSalesOrderType'
                    }
                }
            ]
        },
        {
            type: 'UI.DataFieldForAction',
            propertyValues: [
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'Unbound Action'
                    }
                },
                {
                    name: 'Action',
                    value: {
                        type: 'String',
                        String: 'com.c_salesordermanage_sd/UnboundAction'
                    }
                }
            ]
        },
        {
            type: 'UI.DataFieldForAction',
            propertyValues: [
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'Return In Process'
                    }
                },
                {
                    name: 'Action',
                    value: {
                        type: 'String',
                        String: 'com.c_salesordermanage_sd/ReturnInProcess'
                    }
                }
            ]
        },
        {
            type: 'UI.DataFieldForIntentBasedNavigation',
            propertyValues: [
                {
                    name: 'SemanticObject',
                    value: {
                        type: 'String',
                        String: 'SalesOrder'
                    }
                },
                {
                    name: 'Action',
                    value: {
                        type: 'String',
                        String: 'manageInline'
                    }
                },
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'IBN'
                    }
                },
                {
                    name: 'RequiresContext',
                    value: {
                        type: 'Bool',
                        Bool: false
                    }
                }
            ]
        },
        {
            type: 'UI.DataFieldForIntentBasedNavigation',
            propertyValues: [
                {
                    name: 'SemanticObject',
                    value: {
                        type: 'String',
                        String: 'v4Freestyle'
                    }
                },
                {
                    name: 'Action',
                    value: {
                        type: 'String',
                        String: 'Inbound'
                    }
                },
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'IBN with context'
                    }
                },
                {
                    name: 'RequiresContext',
                    value: {
                        type: 'Bool',
                        Bool: true
                    }
                }
            ]
        },
        {
            type: 'UI.DataField',
            propertyValues: [
                {
                    name: 'Value',
                    value: {
                        type: 'Path',
                        Path: 'ID'
                    }
                }
            ]
        },
        {
            type: 'UI.DataField',
            propertyValues: [
                {
                    name: 'Value',
                    value: {
                        type: 'Path',
                        Path: 'ImageUrl'
                    }
                }
            ]
        },
        {
            type: 'UI.DataFieldForAnnotation',
            propertyValues: [
                {
                    name: 'Target',
                    value: {
                        type: 'AnnotationPath',
                        AnnotationPath: '@UI.FieldGroup#multipleActionFields'
                    }
                },
                {
                    name: 'Label',
                    value: {
                        type: 'String',
                        String: 'Sold-To Party'
                    }
                }
            ]
        },
        {
            type: 'UI.DataField',
            propertyValues: [
                {
                    name: 'Value',
                    value: {
                        type: 'Path',
                        Path: 'SalesOrderType'
                    }
                }
            ]
        },
        {
            type: 'UI.DataField',
            propertyValues: [
                {
                    name: 'Value',
                    value: {
                        type: 'Path',
                        Path: 'OverallSDProcessStatus'
                    }
                },
                {
                    name: 'Criticality',
                    value: {
                        type: 'Path',
                        Path: 'StatusCriticality'
                    }
                }
            ]
        },
        {
            type: 'UI.DataField',
            propertyValues: [
                {
                    name: 'Value',
                    value: {
                        type: 'Path',
                        Path: 'TotalNetAmount'
                    }
                }
            ]
        }
    ]
};

const headerInfoAnnotation = {
    qualifier: undefined,
    term: 'com.sap.vocabularies.UI.v1.HeaderInfo',
    record: {
        type: 'com.sap.vocabularies.UI.v1.HeaderInfoType',
        propertyValues: [
            {
                name: 'Description',
                value: {
                    type: 'Record',
                    Record: {
                        type: 'com.sap.vocabularies.UI.v1.DataField',
                        propertyValues: [
                            {
                                name: 'Value',
                                value: {
                                    type: 'Path',
                                    Path: 'SalesOrderTypeName'
                                }
                            }
                        ]
                    }
                }
            },
            {
                name: 'ImageUrl',
                value: {
                    type: 'Path',
                    Path: 'ImageUrl'
                }
            },
            {
                name: 'Title',
                value: {
                    type: 'Record',
                    Record: {
                        type: 'com.sap.vocabularies.UI.v1.DataField',
                        propertyValues: [
                            {
                                name: 'Value',
                                value: {
                                    type: 'Path',
                                    Path: 'SalesOrder'
                                }
                            }
                        ]
                    }
                }
            },
            {
                name: 'TypeName',
                value: {
                    type: 'String',
                    String: 'Sales Order'
                }
            },
            {
                name: 'TypeNamePlural',
                value: {
                    type: 'String',
                    String: 'Sales Orders'
                }
            }
        ]
    }
};

const FilterDefaultValue = Object.assign('String', {
    term: 'com.sap.vocabularies.Common.v1.FilterDefaultValue',
    qualifier: undefined,
    isString() {
        return true;
    }
});

describe('Annotation Converter', () => {
    it('can convert EDMX with multiple schemas', async () => {
        const parsedEDMX = parse(await loadFixture('northwind.metadata.xml'));
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
        expect(convertedTypes.entityTypes[5].actions['PrepareForEdit'].annotations).not.toBeUndefined();
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
        expect(convertedTypes.entityTypes[5].actions['PrepareForEdit'].annotations).not.toBeUndefined();
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
    });
    it('can support resolvePath syntax', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        // It can resolve EntitySet
        const sdManage: ResolutionTarget<EntitySet> = convertedTypes.resolvePath('/SalesOrderManage');
        expect(sdManage.target).not.toBeNull();
        expect(sdManage.target?._type).toEqual('EntitySet');
        expect(sdManage.objectPath.length).toEqual(2); // EntityContainer
        // It can resolve EntityType
        const sdManageType: ResolutionTarget<EntityType> = convertedTypes.resolvePath('/SalesOrderManage/');
        expect(sdManageType.target).not.toBeNull();
        expect(sdManageType.target).not.toBeUndefined();
        expect(sdManageType.target?._type).toEqual('EntityType');
        expect(sdManageType.objectPath.length).toEqual(3); // EntityContainer / EntitySet
        const sdManageType2: ResolutionTarget<EntityType> = convertedTypes.resolvePath('/SalesOrderManage/$Type');
        expect(sdManageType2.target).not.toBeNull();
        expect(sdManageType2.target).not.toBeUndefined();
        expect(sdManageType2.target?._type).toEqual('EntityType');
        expect(sdManageType2.objectPath.length).toEqual(3); // EntityContainer / EntitySet
        // It can resolve Property
        const sdManageProperty: ResolutionTarget<Property> = convertedTypes.resolvePath('/SalesOrderManage/ImageUrl');
        expect(sdManageProperty.target).not.toBeNull();
        expect(sdManageProperty.target).not.toBeUndefined();
        expect(sdManageProperty.target?._type).toEqual('Property');
        expect(sdManageProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType

        // It can resolve Property
        const sdRatingProperty: ResolutionTarget<Property> = convertedTypes.resolvePath('/SalesOrderManage/Rating');
        expect(sdRatingProperty.target).not.toBeNull();
        expect(sdRatingProperty.target).not.toBeUndefined();
        expect(sdRatingProperty.target?._type).toEqual('Property');
        expect(sdRatingProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
        if (sdRatingProperty.target) {
            const sdDefault = sdRatingProperty.target.annotations.UI?.DataFieldDefault;
            expect(sdDefault?.$Type).toEqual(UIAnnotationTypes.DataFieldForAnnotation);
            const sdDefaultAsAnotation: DataFieldForAnnotation = sdDefault as DataFieldForAnnotation;
            expect(sdDefaultAsAnotation.Target.$target.$Type).toEqual(UIAnnotationTypes.DataPointType);
        }

        // It can resolve NavigationProperty on ComplexType
        const sdManageComplexNavProperty: ResolutionTarget<NavigationProperty> = convertedTypes.resolvePath(
            '/SalesOrderManage/ComplexWithNavigation/_SalesOrderType'
        );
        expect(sdManageComplexNavProperty.target).not.toBeNull();
        expect(sdManageComplexNavProperty.target).not.toBeUndefined();
        expect(sdManageComplexNavProperty.target?._type).toEqual('NavigationProperty');
        expect(sdManageComplexNavProperty.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / Property

        // It can resolve NavigationProperty
        const sdManageNavProperty: ResolutionTarget<NavigationProperty> =
            convertedTypes.resolvePath('/SalesOrderManage/_Item');
        expect(sdManageNavProperty.target).not.toBeNull();
        expect(sdManageNavProperty.target).not.toBeUndefined();
        expect(sdManageNavProperty.target?._type).toEqual('NavigationProperty');
        expect(sdManageNavProperty.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
        // It can resolve NavigationProperty Target EntityType
        const sdManageNavPropertyTarget: ResolutionTarget<EntityType> =
            convertedTypes.resolvePath('/SalesOrderManage/_Item/');
        expect(sdManageNavPropertyTarget.target).not.toBeNull();
        expect(sdManageNavPropertyTarget.target).not.toBeUndefined();
        expect(sdManageNavPropertyTarget.target?._type).toEqual('EntityType');
        expect(sdManageNavPropertyTarget.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / NavProperty
        // It can resolve EntityType Annotations
        const sdManageLineItem: ResolutionTarget<LineItem> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem'
        );
        expect(sdManageLineItem.target).not.toBeNull();
        expect(sdManageLineItem.target).not.toBeUndefined();
        expect(sdManageLineItem.target?.term).toEqual(UIAnnotationTerms.LineItem);
        expect(sdManageLineItem.objectPath.length).toEqual(4); // EntityContainer / EntitySet / EntityType
        // It can resolve EntityType Annotations
        const sdManageLineItemDF: ResolutionTarget<DataFieldAbstractTypes> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem/0'
        );
        expect(sdManageLineItemDF.target).not.toBeNull();
        expect(sdManageLineItemDF.target).not.toBeUndefined();
        expect(sdManageLineItemDF.target?.$Type).toEqual(UIAnnotationTypes.DataFieldForAction);
        expect(sdManageLineItemDF.objectPath.length).toEqual(5); // EntityContainer / EntitySet / EntityType / LineItem
        // It can resolve AnnotationPath Targets
        const sdManageLineItemFG: ResolutionTarget<AnnotationPath<FieldGroupType>> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem/10/Target'
        );
        expect(sdManageLineItemFG.target).not.toBeNull();
        expect(sdManageLineItemFG.target).not.toBeUndefined();
        expect(sdManageLineItemFG.target?.type).toEqual('AnnotationPath');
        expect(sdManageLineItemFG.target?.$target.$Type).toEqual(UIAnnotationTypes.FieldGroupType);
        expect(sdManageLineItemFG.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation
        // It can resolve AnnotationPath Targets with $AnnotationPath
        const sdManageLineItemFGTarget: ResolutionTarget<FieldGroupType> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem/10/Target/$AnnotationPath'
        );
        expect(sdManageLineItemFGTarget.target).not.toBeNull();
        expect(sdManageLineItemFGTarget.target).not.toBeUndefined();
        expect(sdManageLineItemFGTarget.target?.$Type).toEqual(UIAnnotationTypes.FieldGroupType);
        expect(sdManageLineItemFGTarget.objectPath.length).toEqual(7); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation / AnnotationPath / FieldGroupType
        // It can resolve an annotation value pointing to a path behind a one to one
        const sdManageLineItemHiddenOneToOne: ResolutionTarget<Property> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem/11@UI.Hidden'
        );
        expect(sdManageLineItemHiddenOneToOne.target).not.toBeNull();
        expect(sdManageLineItemHiddenOneToOne.target).not.toBeUndefined();
        expect(sdManageLineItemHiddenOneToOne.target?.type).toEqual('Path');
        expect(sdManageLineItemHiddenOneToOne.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / LineItem / DataField
        // It can resolve NavigationProperty Target EntityType Annotations
        const sdManageNavPropertyTargetAnnotations: ResolutionTarget<LineItem> = convertedTypes.resolvePath(
            '/SalesOrderManage/_Item/@UI.LineItem'
        );
        expect(sdManageNavPropertyTargetAnnotations.target).not.toBeNull();
        expect(sdManageNavPropertyTargetAnnotations.target).not.toBeUndefined();
        expect(sdManageNavPropertyTargetAnnotations.target?.term).toEqual(UIAnnotationTerms.LineItem);
        expect(sdManageNavPropertyTargetAnnotations.objectPath.length).toEqual(6); // EntityContainer / EntitySet / EntityType / NavProperty / EntityType
        // It can resolve AnnotationPath Targets with $AnnotationPath and some navigation
        const sdManageLineItemFGTargetWithOneOne: ResolutionTarget<ContactType> = convertedTypes.resolvePath(
            '/SalesOrderManage/@UI.LineItem/19/Target/$AnnotationPath'
        );
        expect(sdManageLineItemFGTargetWithOneOne.target).not.toBeNull();
        expect(sdManageLineItemFGTargetWithOneOne.target).not.toBeUndefined();
        expect(sdManageLineItemFGTargetWithOneOne.target?.$Type).toEqual(CommunicationAnnotationTypes.ContactType);
        expect(sdManageLineItemFGTargetWithOneOne.objectPath.length).toEqual(8); // EntityContainer / EntitySet / EntityType / LineItem / DataFieldForAnnotation / AnnotationPath / NavigationProperty / ContactType
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
    });
    it('converts ComplexType (also nested)', async () => {
        const parsedEDMX = parse(await loadFixture('v4/ComplexType.xml'));
        const convertedTypes = convert(parsedEDMX);

        let resolvedProperty: ResolutionTarget<any> = convertedTypes.resolvePath('/TestEntity/complexProperty1');
        expect(resolvedProperty.target).not.toBeUndefined();
        expect(resolvedProperty.target).not.toBeNull();
        expect(resolvedProperty.target.targetType).not.toBeUndefined();
        expect(resolvedProperty.target.targetType).not.toBeNull();
        expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual('MyService.TestEntity_complexProperty1');

        resolvedProperty = convertedTypes.resolvePath('/TestEntity/complexProperty1/complexProperty2');
        expect(resolvedProperty.target).not.toBeUndefined();
        expect(resolvedProperty.target).not.toBeNull();
        expect(resolvedProperty.target.targetType).not.toBeUndefined();
        expect(resolvedProperty.target.targetType).not.toBeNull();
        expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual(
            'MyService.TestEntity_complexProperty1_complexProperty2'
        );

        resolvedProperty = convertedTypes.resolvePath('/TestEntity/complexProperty1/complexProperty2/complexProperty3');
        expect(resolvedProperty.target).not.toBeUndefined();
        expect(resolvedProperty.target).not.toBeNull();
        expect(resolvedProperty.target.targetType).not.toBeUndefined();
        expect(resolvedProperty.target.targetType).not.toBeNull();
        expect(resolvedProperty.target.targetType.fullyQualifiedName).toEqual(
            'MyService.TestEntity_complexProperty1_complexProperty2_complexProperty3'
        );
    });
    it('works well with side effects', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[40]).not.toBeNull();
        expect(convertedTypes.entitySets[40].entityType).not.toBeNull();
        const sdEntityType = convertedTypes.entitySets[40].entityType;
        expect((sdEntityType.annotations as any).Common['SideEffects#IncotermsChange'].$Type).toEqual(
            CommonAnnotationTypes.SideEffectsType
        );
        expect((sdEntityType.annotations as any).Common['SideEffects#IncotermsChange']).not.toBeNull();
        expect((sdEntityType.annotations as any).Common['SideEffects#IncotermsChange'].TargetProperties[0]).toEqual(
            'IncotermsLocation1'
        );
    });
    it('can convert EDMX', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
        expect(convertedTypes.entityTypes[39].annotations.UI).not.toBeNull();

        if (convertedTypes.entityTypes[39].annotations?.UI?.LineItem) {
            const LineItem = convertedTypes.entityTypes[39].annotations.UI.LineItem;
            const transformedLineItem = revertTermToGenericType(defaultReferences, LineItem);
            // assert.deepEqual(transformedLineItem, rawLineItem, "Different");
        }
        if (convertedTypes.entityTypes[39].annotations?.UI?.HeaderInfo) {
            const HeaderInfo = convertedTypes.entityTypes[39].annotations.UI.HeaderInfo;
            const transformedHeaderInfo = revertTermToGenericType(defaultReferences, HeaderInfo);
            expect(transformedHeaderInfo).toEqual(headerInfoAnnotation as Annotation); // 'Different');
        }
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
            const criticality: EnumValue<CriticalityType> = {
                path: 'OverallSDStatus',
                type: 'Path'
            } as EnumValue<CriticalityType>;
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
                    ?.Text as PathAnnotationExpression<String>
            ).type
        ).toEqual('Path');
        expect(
            (
                convertedTypes.entityTypes[16].entityProperties[0].annotations?.Common
                    ?.Text as PathAnnotationExpression<String>
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
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@UI.LineItem');
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
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@UI.LineItem');
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
        expect(presentationVariant?.Visualizations?.[0]?.value).toEqual('@UI.LineItem');
    });

    it('can revert Apply expression', async () => {
        const parsedEDMX = parse(await loadFixture('v2/metadataWithApply.xml'));
        const rawData: any = (parsedEDMX.schema.annotations.serviceFile?.[83]?.annotations?.[3]?.collection?.[2] as any)
            ?.propertyValues;
        const convertedTypes = convert(parsedEDMX);
        const dfWithUrlApply: any = convertedTypes.entityTypes[1].annotations?.UI?.LineItem?.[2];
        const reverted = revertTermToGenericType(convertedTypes.references, dfWithUrlApply);
        expect(reverted.record?.propertyValues[0].value).not.toBeUndefined();
        expect(reverted?.record?.propertyValues).toEqual(rawData); //, 'Different');
    });

    it('support all references that are not vocabuleries', async () => {
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

    it('can revert string which is of type Object', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);
        expect(convertedTypes.entitySets[0].annotations).not.toBeNull();
        expect(convertedTypes.entityTypes[25].entityProperties[2]?.annotations?.Common?.FieldControl).not.toBeNull();

        if (convertedTypes.entityTypes[25].entityProperties?.[2].annotations?.Common?.FieldControl) {
            let FieldControl = convertedTypes.entityTypes[25].entityProperties[2].annotations?.Common?.FieldControl;
            FieldControl = Object.assign(FieldControl, {
                isString() {
                    return true;
                }
            });
            const transformedFieldControl = revertTermToGenericType(defaultReferences, FieldControl) as any;
            expect(transformedFieldControl).not.toBeUndefined();
            expect(transformedFieldControl.value.type).toEqual('EnumMember');
        }

        const transformedFilterDefaultValue = revertTermToGenericType(defaultReferences, FilterDefaultValue) as any;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(transformedFilterDefaultValue.value.type).toEqual('String');
    });
});
