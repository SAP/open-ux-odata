import { addIndex, lazy, splitAtFirst, splitAtLast, substringBeforeFirst, substringBeforeLast } from '../src';

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

    describe('addIndex()', () => {
        it('Does not alter the iterator', () => {
            const array = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const iterator = array[Symbol.iterator];
            const indexName = Symbol('My Index');

            const indexedArray = addIndex(array, 'type', indexName);

            expect(iterator).toStrictEqual(array[Symbol.iterator]);
        });

        it('Cannot be added twice', () => {
            const array = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const indexName = Symbol('My Index');

            addIndex(array, 'type', indexName);

            expect(() => {
                addIndex(array, 'type', indexName);
            }).toThrowError();
        });

        it('Can access data by index', () => {
            const array: { type: string }[] = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const indexName = 'MyIndex';
            const indexArray = addIndex(array, 'type', indexName);

            expect(indexArray[indexName]('b')).toStrictEqual(array[1]);
        });

        it('Does not return outdated data', () => {
            const array: { type: string }[] = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
            const indexName = 'MyIndex';
            const indexArray = addIndex(array, 'type', indexName);

            const value1 = indexArray[indexName]('b');
            expect(value1).toBeDefined();
            array[1].type = 'd';
            const value2 = indexArray[indexName]('b');
            expect(value2).toBeUndefined();
        });

        it('Works with different elements', () => {
            const array: any[] = [{ type: 'a' }, null, { value: 'c' }, undefined, true];
            const indexName = 'MyIndex';
            const indexArray = addIndex(array, 'type', indexName);

            const value1 = indexArray[indexName]('b');
            expect(value1).toBeUndefined();

            const value2 = indexArray[indexName]('c');
            expect(value2).toBeUndefined();
        });
    });
});
