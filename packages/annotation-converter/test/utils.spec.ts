import { isDefined, lazy, splitAtFirst, splitAtLast, substringBeforeFirst, substringBeforeLast } from '../src';

describe('utils', () => {
    describe('string splitting', () => {
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

    describe('lazy()', () => {
        it('should not initialize if the property is not accessed', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            expect(testObject.hasOwnProperty('myProperty')).toBeTruthy(); // cannot use expect(testObject).toHaveProperty('myProperty') here!
            expect(initialize).toBeCalledTimes(0);
        });

        it('should initialize the property on first access', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            const value = testObject.myProperty;
            expect(value).toEqual('abc');
            expect(initialize).toBeCalledTimes(1);
        });

        it('should initialize only once', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            const value1 = testObject.myProperty;
            const value2 = testObject.myProperty;
            expect(initialize).toBeCalledTimes(1);
            expect(value1 === value2).toBeTruthy();
        });

        it('should fail if the property is defined already', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            expect(() => {
                lazy(testObject, 'myProperty', initialize);
            }).toThrowError();
        });

        it('allows to assign a value', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            testObject.myProperty = 'xyz';

            expect(testObject.myProperty).toEqual('xyz');
            expect(initialize).toBeCalledTimes(0);

            testObject.myProperty = 'efg';
            expect(testObject.myProperty).toEqual('efg');
            expect(initialize).toBeCalledTimes(0);
        });
    });

    describe('isDefined()', () => {
        it('returns false if the value is undefined', () => {
            const result = isDefined(undefined);
            expect(result).toEqual(false);
        });

        it('returns true if the value is defined', () => {
            const result1 = isDefined(null);
            expect(result1).toEqual(true);

            const result2 = isDefined({});
            expect(result2).toEqual(true);
        });
    });
});
