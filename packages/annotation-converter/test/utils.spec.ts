import { addGetByValue, lazy, splitAtFirst, splitAtLast, substringBeforeFirst, substringBeforeLast } from '../src';

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

        it('is readonly', () => {
            const testObject: any = {};
            const initialize = jest.fn().mockReturnValue('abc');

            lazy(testObject, 'myProperty', initialize);
            expect(testObject.myProperty).toEqual('abc');
            expect(initialize).toBeCalledTimes(1);

            expect(() => {
                testObject.myProperty = 'xyz';
            }).toThrowError();

            expect(testObject.myProperty).toEqual('abc');
            expect(initialize).toBeCalledTimes(1);
        });
    });

    describe('addIndex()', () => {
        it('Does not alter the iterator', () => {
            const array = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const iterator = array[Symbol.iterator];

            const indexedArray = addGetByValue(array, 'type');

            expect(iterator).toStrictEqual(array[Symbol.iterator]);
            expect(Object.keys(array)).toStrictEqual(Object.keys(indexedArray));
        });

        it('Cannot be added twice', () => {
            const array = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];

            addGetByValue(array, 'type');

            expect(() => {
                addGetByValue(array, 'type');
            }).toThrowError();
        });

        it('Can access data by index', () => {
            const array: { type: string }[] = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const indexArray = addGetByValue(array, 'type');
            expect(indexArray.by_type('b')).toStrictEqual(array[1]);
        });

        it('Does not return outdated data', () => {
            const array: { type: string }[] = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const indexArray = addGetByValue(array, 'type');

            const value1 = indexArray.by_type('b');
            expect(value1).toBeDefined();
            array[1].type = 'd';
            const value2 = indexArray.by_type('b');
            expect(value2).toBeUndefined();
        });

        it('Works with different elements', () => {
            const array: any[] = [{ type: 'a' }, null, { value: 'c' }, undefined, true];
            const indexArray = addGetByValue(array, 'type');

            const value1 = indexArray.by_type('b');
            expect(value1).toBeUndefined();

            const value2 = indexArray.by_type('c');
            expect(value2).toBeUndefined();
        });
    });
});
