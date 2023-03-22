import {
    addGetByValue,
    lazy,
    splitAtFirst,
    splitAtLast,
    substringBeforeFirst,
    substringBeforeLast,
    unalias
} from '../src';
import type { Reference } from '@sap-ux/vocabularies-types';

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

    describe('unalias()', () => {
        type TestCase = {
            aliasedValue: string | undefined;
            references: Reference[];
            unaliasedValue: string | undefined;
        };

        it.each([
            {
                aliasedValue: undefined,
                references: [],
                unaliasedValue: undefined
            },
            {
                aliasedValue: '',
                references: [],
                unaliasedValue: ''
            },
            {
                aliasedValue: 'sap.fe.test.JestService.doSomethingUnbound',
                references: [],
                unaliasedValue: 'sap.fe.test.JestService.doSomethingUnbound'
            },
            {
                aliasedValue: 'MyAlias.Label',
                references: [{ alias: 'MyAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                unaliasedValue: 'com.sap.vocabularies.UI.v1.Label'
            },
            {
                aliasedValue: 'MyAlias.doSomethingUnbound()',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'sap.fe.test.JestService.doSomethingUnbound()'
            },
            {
                aliasedValue: 'MyAlias.doSomething(MyAlias.Entities)',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)'
            },
            {
                aliasedValue: 'MyAlias.EntityContainer/doSomethingUnbound',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'sap.fe.test.JestService.EntityContainer/doSomethingUnbound'
            },
            {
                aliasedValue: '_nav/@MyAlias.FieldGroup',
                references: [{ alias: 'MyAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                unaliasedValue: '_nav/@com.sap.vocabularies.UI.v1.FieldGroup'
            },
            {
                aliasedValue: 'MyAlias.doSomething(MyAlias.Entities)/parameter1',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)/parameter1'
            },
            {
                aliasedValue: 'MyAlias.doSomething(MyAlias.Entities)/parameter1',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)/parameter1'
            },
            {
                aliasedValue: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1',
                references: [{ alias: 'MyAlias', namespace: 'sap.fe.test.JestService' }],
                unaliasedValue: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1'
            }
        ] as TestCase[])(
            'unalias("$aliasedValue") = "$unaliasedValue"',
            ({ aliasedValue, references, unaliasedValue }) => {
                const result = unalias(references, aliasedValue);
                expect(result).toEqual(unaliasedValue);
            }
        );
    });
});
