import { loadFixture } from './fixturesHelper';
import { convert, defaultReferences, revertTermToGenericType } from '../src';
import { parse } from '@sap-ux/edmx-parser';
import type { CollectionFacet } from '@sap-ux/vocabularies-types/vocabularies/UI';

const FilterDefaultValue = Object.assign('String', {
    term: 'com.sap.vocabularies.Common.v1.FilterDefaultValue',
    qualifier: undefined,
    isString() {
        return true;
    }
});

describe('Writeback capabilities', () => {
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
    it('can revert a Line Item definition', async () => {
        const parsedEDMX = parse(await loadFixture('v4/manageLineItems.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.entityTypes[0].annotations?.UI?.LineItem
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile[11].annotations[2] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(transformedFilterDefaultValue.collection.length).toEqual(target.collection.length);
        expect(transformedFilterDefaultValue.collection[0]).toEqual(target.collection[0]);
        expect(transformedFilterDefaultValue.collection[1]).toEqual(target.collection[1]);
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can revert a Value Help definition', async () => {
        const parsedEDMX = parse(await loadFixture('v4/manageLineItems.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.entityTypes['13'].entityProperties['8']?.annotations?.Common?.ValueList
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['224'].annotations['3'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });
    it('can revert a SelectionFields definition', async () => {
        const parsedEDMX = parse(await loadFixture('v4/manageLineItems.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.entityTypes[0].annotations?.UI?.SelectionFields
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile[11].annotations[1] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });
    it('can revert a SideEffects definition', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['39']?.annotations?.Common as any)?.['SideEffects#ShipToPartyChange']
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['301'].annotations['5'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });
    it('can revert further SideEffects definition', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);
        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['25']?.annotations?.Common as any)?.[
                'SideEffects#MaterialDetailsModelYearChange'
            ]
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['177'].annotations['2'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });
    it('can revert a Navigation Restriction', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.entitySets['38'].annotations?.Capabilities?.NavigationRestrictions
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['302'].annotations['0'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can revert a SelectionPresentationVariant', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['41']?.annotations?.UI as any)['SelectionPresentationVariant#SPVPath']
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['395'].annotations['37'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can deal with Decimal', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['5'].annotations.UI as any)['DataPoint#CustomerCreditExposureAmount']
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['20'].annotations['5'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can deal with Integer and Decimal "naturally"', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['15'].annotations.UI as any)['DataPoint#Progress2']
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['82'].annotations['2'] as any;
        delete target.fullyQualifiedName;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();

        (convertedTypes.entityTypes['15'].annotations.UI as any)['DataPoint#Progress2'].TargetValue = 99.5;
        const transformedFilterDefaultValue2 = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['15'].annotations.UI as any)['DataPoint#Progress2']
        ) as any;
        expect(transformedFilterDefaultValue2).toMatchSnapshot();
    });
    it('can deal with Null', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4Meta.xml'));
        const target = Object.assign({}, parsedEDMX.schema.annotations.serviceFile['451'].annotations['0'] as any);
        target.value = Object.assign({}, target.value);
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.actions['28'].annotations.Core?.OperationAvailable
        ) as any;

        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can deal with annotation on collection', async () => {
        const parsedEDMX = parse(await loadFixture('v4/sdMeta.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            (convertedTypes.entityTypes['6'].annotations?.UI?.Facets?.[0] as CollectionFacet)?.Facets
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['30'].annotations['2'] as any;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        //expect(JSON.stringify(transformedFilterDefaultValue)).toStrictEqual(JSON.stringify(target));
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });

    it('can deal with weird things such as annotation on collection', async () => {
        const parsedEDMX = parse(await loadFixture('v4/v4MetaModified.xml'));
        const convertedTypes = convert(parsedEDMX);

        const transformedFilterDefaultValue = revertTermToGenericType(
            defaultReferences,
            convertedTypes.entityTypes['15'].annotations?.UI?.LineItem
        ) as any;
        const target = parsedEDMX.schema.annotations.serviceFile['84'].annotations['6'] as any;
        expect(transformedFilterDefaultValue).not.toBeUndefined();
        expect(transformedFilterDefaultValue).toMatchSnapshot();
    });
});
