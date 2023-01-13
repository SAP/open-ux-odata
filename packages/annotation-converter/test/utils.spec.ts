import { splitAtFirst, splitAtLast, substringBeforeFirst, substringBeforeLast } from '../src';

describe('utils', () => {
    const cases = [
        {
            value: 'com.sap.vocabularies.UI.v1.LineItems',
            separator: '.',
            splitAtFirst: ['com', 'sap.vocabularies.UI.v1.LineItems'],
            splitAtLast: ['com.sap.vocabularies.UI.v1', 'LineItems'],
            substringBeforeFirst: 'com',
            substringBeforeLast: 'com.sap.vocabularies.UI.v1'
        },
        {
            value: 'com.sap.vocabularies.UI.v1.LineItems',
            separator: '@',
            splitAtFirst: ['com.sap.vocabularies.UI.v1.LineItems', ''],
            splitAtLast: ['com.sap.vocabularies.UI.v1.LineItems', ''],
            substringBeforeFirst: 'com.sap.vocabularies.UI.v1.LineItems',
            substringBeforeLast: 'com.sap.vocabularies.UI.v1.LineItems'
        },
        {
            value: '@com.sap.vocabularies.UI.v1.LineItems',
            separator: '@',
            splitAtFirst: ['', 'com.sap.vocabularies.UI.v1.LineItems'],
            splitAtLast: ['', 'com.sap.vocabularies.UI.v1.LineItems'],
            substringBeforeFirst: '',
            substringBeforeLast: ''
        },
        {
            value: 'com.sap.vocabularies.UI.v1.LineItems@',
            separator: '@',
            splitAtFirst: ['com.sap.vocabularies.UI.v1.LineItems', ''],
            splitAtLast: ['com.sap.vocabularies.UI.v1.LineItems', ''],
            substringBeforeFirst: 'com.sap.vocabularies.UI.v1.LineItems',
            substringBeforeLast: 'com.sap.vocabularies.UI.v1.LineItems'
        }
    ];

    it.each(cases)(
        'splitAtFirst("$value", "$separator") returns $splitAtFirst',
        ({ value, separator, splitAtFirst: expected }) => {
            expect(splitAtFirst(value, separator)).toEqual(expected);
        }
    );

    it.each(cases)(
        'substringBeforeFirst("$value", "$separator") returns "$substringBeforeFirst"',
        ({ value, separator, substringBeforeFirst: expected }) => {
            expect(substringBeforeFirst(value, separator)).toEqual(expected);
        }
    );

    it.each(cases)(
        'splitAtLast("$value", "$separator") returns $splitAtLast',
        ({ value, separator, splitAtLast: expected }) => {
            expect(splitAtLast(value, separator)).toEqual(expected);
        }
    );

    it.each(cases)(
        'substringBeforeLast("$value", "$separator") returns "$substringBeforeLast"',
        ({ value, separator, substringBeforeLast: expected }) => {
            expect(substringBeforeLast(value, separator)).toEqual(expected);
        }
    );
});
