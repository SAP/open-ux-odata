import type { AnnotationList, Reference } from '@sap-ux/vocabularies-types';
import {
    addGetByValue,
    lazy,
    mergeAnnotations,
    splitAtFirst,
    splitAtLast,
    substringBeforeFirst,
    substringBeforeLast,
    unalias
} from '../src';

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
            expected: string | undefined;
            expectedIfNoNamespace: string | undefined;
        };

        it.each([
            {
                aliasedValue: undefined,
                references: [],
                expected: undefined,
                expectedIfNoNamespace: undefined
            },
            {
                aliasedValue: '',
                references: [],
                expected: '',
                expectedIfNoNamespace: ''
            },
            {
                aliasedValue: 'Something',
                references: [],
                expected: 'Something',
                expectedIfNoNamespace: 'Something'
            },
            {
                aliasedValue: 'sap.fe.test.JestService.doSomethingUnbound',
                references: [],
                expected: 'sap.fe.test.JestService.doSomethingUnbound',
                expectedIfNoNamespace: 'sap.fe.test.JestService.doSomethingUnbound'
            },
            {
                aliasedValue: 'MyCommonAlias.Label',
                references: [{ alias: 'MyCommonAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'com.sap.vocabularies.UI.v1.Label',
                expectedIfNoNamespace: 'com.sap.vocabularies.UI.v1.Label'
            },
            {
                aliasedValue: 'MyAlias.doSomethingUnbound()',
                references: [{ alias: 'MyCommonAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'sap.fe.test.JestService.doSomethingUnbound()',
                expectedIfNoNamespace: 'MyAlias.doSomethingUnbound()'
            },
            {
                aliasedValue: 'MyAlias.doSomething(MyAlias.Entities)',
                references: [{ alias: 'MyCommonAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)',
                expectedIfNoNamespace: 'MyAlias.doSomething(MyAlias.Entities)'
            },
            {
                aliasedValue: 'MyAlias.EntityContainer/doSomethingUnbound',
                references: [{ alias: 'MyCommonAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'sap.fe.test.JestService.EntityContainer/doSomethingUnbound',
                expectedIfNoNamespace: 'MyAlias.EntityContainer/doSomethingUnbound'
            },
            {
                aliasedValue: '_nav/@MyUIAlias.FieldGroup',
                references: [{ alias: 'MyUIAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: '_nav/@com.sap.vocabularies.UI.v1.FieldGroup',
                expectedIfNoNamespace: '_nav/@com.sap.vocabularies.UI.v1.FieldGroup'
            },
            {
                aliasedValue: '_nav1/_nav2/@MyUIAlias.FieldGroup',
                references: [{ alias: 'MyUIAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: '_nav1/_nav2/@com.sap.vocabularies.UI.v1.FieldGroup',
                expectedIfNoNamespace: '_nav1/_nav2/@com.sap.vocabularies.UI.v1.FieldGroup'
            },
            {
                aliasedValue: '_nav1/_nav2/@MyUIAlias.FieldGroup#qualifier',
                references: [{ alias: 'MyUIAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: '_nav1/_nav2/@com.sap.vocabularies.UI.v1.FieldGroup#qualifier',
                expectedIfNoNamespace: '_nav1/_nav2/@com.sap.vocabularies.UI.v1.FieldGroup#qualifier'
            },
            {
                aliasedValue: 'MyAlias.doSomething(MyAlias.Entities)/parameter1',
                references: [{ alias: 'MyCommonAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'sap.fe.test.JestService.doSomething(sap.fe.test.JestService.Entities)/parameter1',
                expectedIfNoNamespace: 'MyAlias.doSomething(MyAlias.Entities)/parameter1'
            },
            {
                aliasedValue: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1',
                references: [],
                expected: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1',
                expectedIfNoNamespace: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1'
            },
            {
                aliasedValue: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1',
                references: [{ alias: 'MyAlias', namespace: 'com.sap.vocabularies.UI.v1' }],
                expected: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1',
                expectedIfNoNamespace: 'com.sap.MyAlias.doSomething(com.sap.MyAlias.Entities)/parameter1'
            },
            {
                aliasedValue: '/MyAlias.EntityContainer/path1/path2',
                references: [],
                expected: '/sap.fe.test.JestService.EntityContainer/path1/path2',
                expectedIfNoNamespace: '/MyAlias.EntityContainer/path1/path2'
            },
            {
                aliasedValue: '@MyAlias.Something',
                references: [],
                expected: '@MyAlias.Something',
                expectedIfNoNamespace: '@MyAlias.Something'
            }
        ] as TestCase[])(
            '"$aliasedValue": "$expected" / "$expectedIfNoNamespace"',
            ({ aliasedValue, references, expected, expectedIfNoNamespace }) => {
                const result1 = unalias(references, aliasedValue, 'sap.fe.test.JestService');
                expect(result1).toEqual(expected);

                const result2 = unalias(references, aliasedValue);
                expect(result2).toEqual(expectedIfNoNamespace);
            }
        );
    });

    describe('mergeAnnotations()', () => {
        it('overwrites annotations with aliased targets', () => {
            const source1 = {
                name: '1',
                annotationList: [
                    {
                        target: 'TargetAlias1.Target',
                        annotations: [{ term: 'TermAlias1.Term', value: { String: 'Value 1' } }]
                    },
                    {
                        target: 'TargetAlias1.Target',
                        annotations: [
                            {
                                term: 'TermAlias1.Term',
                                qualifier: 'Qualifier1',
                                value: { String: 'Value 1 / Qualifier 1' }
                            }
                        ]
                    }
                ] as AnnotationList[]
            };
            const source2 = {
                name: '2',
                annotationList: [
                    {
                        target: 'TargetAlias2.Target',
                        annotations: [{ term: 'TermAlias2.Term', value: { String: 'Value 2' } }]
                    },
                    {
                        target: 'TargetAlias2.Target',
                        annotations: [
                            {
                                term: 'TermAlias2.Term',
                                qualifier: 'Qualifier2',
                                value: { String: 'Value 2 / Qualifier 2' }
                            }
                        ]
                    }
                ] as AnnotationList[]
            };

            const references: Reference[] = [
                { alias: 'TargetAlias1', namespace: 'service.namespace', uri: '' },
                { alias: 'TargetAlias2', namespace: 'service.namespace', uri: '' },
                { alias: 'TermAlias1', namespace: 'term.namespace', uri: '' },
                { alias: 'TermAlias2', namespace: 'term.namespace', uri: '' }
            ];

            const result = mergeAnnotations(references, source1, source2);
            expect(result).toMatchInlineSnapshot(`
                {
                  "service.namespace.Target": [
                    {
                      "__source": "2",
                      "fullyQualifiedName": "service.namespace.Target@term.namespace.Term",
                      "term": "term.namespace.Term",
                      "value": {
                        "String": "Value 2",
                      },
                    },
                    {
                      "__source": "2",
                      "fullyQualifiedName": "service.namespace.Target@term.namespace.Term#Qualifier2",
                      "qualifier": "Qualifier2",
                      "term": "term.namespace.Term",
                      "value": {
                        "String": "Value 2 / Qualifier 2",
                      },
                    },
                    {
                      "__source": "1",
                      "fullyQualifiedName": "service.namespace.Target@term.namespace.Term#Qualifier1",
                      "qualifier": "Qualifier1",
                      "term": "term.namespace.Term",
                      "value": {
                        "String": "Value 1 / Qualifier 1",
                      },
                    },
                  ],
                }
            `);
        });
    });
});
