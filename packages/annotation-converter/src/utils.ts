import type { Reference } from '@sap-ux/vocabularies-types';
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
