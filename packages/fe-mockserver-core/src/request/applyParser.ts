import { Lexer } from 'chevrotain';
import {
    AGGREGATE_FUNCTION,
    AGGREGATE_TOKEN,
    ANCESTORS_TOKEN,
    ANDOR,
    ANYALL,
    ASCDESC,
    AS_TOKEN,
    BOOL_METHOD,
    CLOSE,
    CLOSE_BRACKET,
    CLOSE_CURLY_BRACKET,
    COLON,
    COMMA,
    COMPLEX_METHOD,
    CONCAT_TOKEN,
    DESCENDANTS_TOKEN,
    DOT,
    EQ,
    FILTER_TOKEN,
    FROM_TOKEN,
    GROUPBY_TOKEN,
    KEEP_START_TOKEN,
    LITERAL,
    LOGICAL_OPERATOR,
    OPEN,
    OPEN_BRACKET,
    OPEN_CURLY_BRACKET,
    ORDERBY_TOKEN,
    QUOTE,
    ROOT_TOKEN,
    SEARCH_TOKEN,
    SIMPLEIDENTIFIER,
    SIMPLEIDENTIFIERWITHWS,
    SIMPLE_METHOD,
    SKIP_TOKEN,
    SLASH,
    TOP_TOKEN,
    TYPEDEF,
    WITH_TOKEN,
    WS
} from './commonTokens';
import type { FilterExpression } from './filterParser';
import { FilterParser } from './filterParser';

// ----------------- Lexer -----------------

const applyTokens = [
    OPEN,
    DOT,
    EQ,
    CLOSE,
    QUOTE,
    OPEN_BRACKET,
    OPEN_CURLY_BRACKET,
    CLOSE_BRACKET,
    CLOSE_CURLY_BRACKET,
    COMMA,
    ANCESTORS_TOKEN,
    CONCAT_TOKEN,
    KEEP_START_TOKEN,
    DESCENDANTS_TOKEN,
    ROOT_TOKEN,
    SEARCH_TOKEN,
    ORDERBY_TOKEN,
    FILTER_TOKEN,
    TOP_TOKEN,
    SKIP_TOKEN,
    GROUPBY_TOKEN,
    AGGREGATE_TOKEN,
    WITH_TOKEN,
    AS_TOKEN,
    FROM_TOKEN,
    AGGREGATE_FUNCTION,
    COLON,
    SLASH,
    ANYALL,
    ANDOR,
    ASCDESC,
    WS,
    SIMPLE_METHOD,
    BOOL_METHOD,
    COMPLEX_METHOD,
    LOGICAL_OPERATOR,
    TYPEDEF,
    LITERAL,
    SIMPLEIDENTIFIER,
    SIMPLEIDENTIFIERWITHWS
];

export const SearchLexer = new Lexer(applyTokens, {
    // Less position info tracked, reduces verbosity of the playground output.
    positionTracking: 'onlyStart'
});

export type AncestorDescendantsParameters = {
    hierarchyRoot: string;
    qualifier: string;
    propertyPath: string;
    maximumDistance: number;
    keepStart: boolean;
    inputSetTransformations: TransformationDefinition[];
};
export type ExpandLevel = {
    '"Levels"': string;
    '"NodeID"': string;
};
export type TopLevelParameters = {
    HierarchyNodes: string;
    ExpandLevels?: ExpandLevel[];
    Levels: string;
    NodeProperty: string;
    HierarchyQualifier: string;
    Collapse?: string[];
    Expand?: string[];
    Show?: string[];
};
export type FilterTransformation = {
    type: 'filter';
    filterExpr: FilterExpression;
};
export type SearchTransformation = {
    type: 'search';
    searchExpr: string[];
};
export type ConcatTransformation = {
    type: 'concat';
    concatExpr: TransformationDefinition[][];
};
export type GroupByTransformation = {
    type: 'groupBy';
    groupBy: string[];
    subTransformations: TransformationDefinition[];
};
export type OrderByTransformation = {
    type: 'orderBy';
    orderBy: OrderByProp[];
};
export type SkipTransformation = {
    type: 'skip';
    skipCount: number;
};
export type TopTransformation = {
    type: 'top';
    topCount: number;
};
export type AggregatesTransformation = {
    type: 'aggregates';
    aggregateDef: AggregateProperty[];
};

export type AncestorsTransformation = {
    type: 'ancestors';
    parameters: AncestorDescendantsParameters;
};
export type DescendantsTransformation = {
    type: 'descendants';
    parameters: AncestorDescendantsParameters;
};
export type CustomFunctionTransformation = {
    type: 'customFunction';
    name: string;
    parameters: Record<string, string | number | boolean | string[] | object[]>;
};
export type TransformationDefinition =
    | FilterTransformation
    | SearchTransformation
    | OrderByTransformation
    | GroupByTransformation
    | SkipTransformation
    | TopTransformation
    | AggregatesTransformation
    | AncestorsTransformation
    | DescendantsTransformation
    | ConcatTransformation
    | CustomFunctionTransformation;
export type OrderByProp = {
    name: string;
    direction: 'asc' | 'desc';
};
// Parser
type CstRule<T> = (idxInCallingRule?: number, ...args: any[]) => T;
/**
 *
 */
export class ApplyParser extends FilterParser {
    applyExpr: CstRule<TransformationDefinition[]>;
    applyTrafo: CstRule<void>;
    rootExpr: CstRule<string>;
    aggregateTrafo: CstRule<void>;
    ancestorsTrafo: CstRule<void>;
    computeTrafo: CstRule<void>;
    concatTrafo: CstRule<void>;
    customFunction: CstRule<void>;
    preservingTrafo: CstRule<void>;
    descendantsTrafo: CstRule<void>;
    groupbyTrafo: CstRule<void>;

    filterTrafo: CstRule<void>;
    searchTrafo: CstRule<void>;
    orderByTrafo: CstRule<void>;
    skipTrafo: CstRule<void>;
    topTrafo: CstRule<void>;
    constructor() {
        super(applyTokens, {
            recoveryEnabled: true
        });

        this.applyExpr = this.RULE('applyExpr', (transformations: TransformationDefinition[] = []) => {
            this.MANY_SEP({
                SEP: SLASH,
                DEF: () => {
                    this.SUBRULE2(this.applyTrafo, { ARGS: [transformations] });
                }
            });
            return transformations;
        });

        this.applyTrafo = this.RULE('applyTrafo', (transformations: TransformationDefinition[] = []) => {
            //     / ancestorsTrafo
            //     / computeTrafo
            //     / concatTrafo
            //     // / descendantsTrafo
            //     // / joinTrafo
            //     // / nestTrafo
            //     // / outerjoinTrafo
            //     // / traverseTrafo

            this.OR([
                {
                    ALT: () => {
                        return this.SUBRULE(this.aggregateTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.groupbyTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.concatTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.preservingTrafo, { ARGS: [transformations] });
                    }
                }
            ]);
        });

        this.preservingTrafo = this.RULE('preservingTrafo', (transformations: TransformationDefinition[] = []) => {
            this.OR([
                {
                    ALT: () => {
                        return this.SUBRULE(this.filterTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.orderByTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.skipTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.topTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.ancestorsTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.descendantsTrafo, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.customFunction, { ARGS: [transformations] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.searchTrafo, { ARGS: [transformations] });
                    }
                }
            ]);
            //  preservingTrafo = bottomcountTrafo
            // //     / bottompercentTrafo
            // //     / bottomsumTrafo
            //     / filterTrafo
            //     // / identityTrafo
            //     // / orderbyTrafo
            //     // / searchTrafo
            //     // / skipTrafo
            //     // / topTrafo
            //     // / topcountTrafo
            //     // / toppercentTrafo
            //     // / topsumTrafo
            //     // / customFunction
        });

        this.skipTrafo = this.RULE('skipTrafo', (transformations: TransformationDefinition[] = []) => {
            this.CONSUME(SKIP_TOKEN);
            this.CONSUME(OPEN);
            const skip = parseInt(this.CONSUME(LITERAL).image, 10);
            this.CONSUME(CLOSE);
            transformations.push({ type: 'skip', skipCount: skip });
        });
        this.topTrafo = this.RULE('topTrafo', (transformations: TransformationDefinition[] = []) => {
            this.CONSUME(TOP_TOKEN);
            this.CONSUME(OPEN);
            const top = parseInt(this.CONSUME(LITERAL).image, 10);
            this.CONSUME(CLOSE);
            transformations.push({ type: 'top', topCount: top });
        });

        this.filterTrafo = this.RULE('filterTrafo', (transformations: TransformationDefinition[] = []) => {
            this.CONSUME(FILTER_TOKEN);
            this.CONSUME(OPEN);
            const filterExpr = this.SUBRULE(this.filterExpr);
            transformations.push({ type: 'filter', filterExpr: filterExpr });

            this.CONSUME(CLOSE);
        });

        // searchTrafo     = %s"search" OPEN BWS ( searchExpr / searchExpr-incomplete ) BWS CLOSE
        this.searchTrafo = this.RULE('searchTrafo', (transformations: TransformationDefinition[] = []) => {
            this.CONSUME(SEARCH_TOKEN);
            this.CONSUME(OPEN);
            const searchExpr: string[] = [];
            this.MANY_SEP({
                SEP: WS,
                DEF: () => {
                    const stringToken = this.CONSUME(SIMPLEIDENTIFIERWITHWS);
                    searchExpr.push(stringToken.image.substring(1, stringToken.image.length - 1));
                }
            });
            transformations.push({ type: 'search', searchExpr: searchExpr });

            this.CONSUME(CLOSE);
        });
        //%s"groupby" OPEN BWS groupbyList [ BWS COMMA BWS applyExpr ] BWS CLOSE
        this.groupbyTrafo = this.RULE('groupbyTrafo', (transformations: TransformationDefinition[] = []) => {
            this.CONSUME(GROUPBY_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            this.CONSUME2(OPEN);
            this.OPTION2(() => this.CONSUME2(WS));
            const groupBy: string[] = [];
            this.OPTION3(() => {
                this.MANY_SEP({
                    SEP: COMMA,
                    DEF: () => {
                        const groupByStr: string[] = [];
                        this.MANY_SEP2({
                            SEP: SLASH,
                            DEF: () => {
                                groupByStr.push(this.CONSUME2(SIMPLEIDENTIFIER).image);
                            }
                        });
                        groupBy.push(groupByStr.join('/'));
                    }
                });
            });
            this.OPTION4(() => this.CONSUME3(WS));
            this.CONSUME(CLOSE);
            const subTransformations: TransformationDefinition[] = [];
            this.OPTION5(() => {
                this.OPTION6(() => this.CONSUME4(WS));
                this.CONSUME(COMMA);
                this.SUBRULE(this.applyExpr, { ARGS: [subTransformations] });
            });
            this.CONSUME2(CLOSE);
            //OPEN BWS groupbyElement *( BWS COMMA BWS groupbyElement ) BWS CLOSE
            // groupbyElement  = groupingProperty / rollupLevels / rollupRecursive
            transformations.push({ type: 'groupBy', groupBy: groupBy, subTransformations: subTransformations });
        });

        this.aggregateTrafo = this.RULE('aggregateTrafo', (transformations: TransformationDefinition[] = []) => {
            // %s"aggregate" OPEN BWS aggregateExpr *( BWS COMMA BWS aggregateExpr ) BWS CLOSE
            this.CONSUME(AGGREGATE_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            const aggregates: AggregateProperty[] = [];
            this.MANY_SEP({
                SEP: COMMA,
                DEF: () => {
                    const sourceProperty = this.CONSUME(SIMPLEIDENTIFIER).image;
                    let operator: string | undefined;
                    let alias = sourceProperty;
                    this.OR([
                        {
                            ALT: () => {
                                this.CONSUME8(WS);
                                this.CONSUME2(AS_TOKEN);
                                this.CONSUME9(WS);
                                alias = this.CONSUME4(SIMPLEIDENTIFIER).image;
                            }
                        },
                        {
                            ALT: () => {
                                this.OPTION2(() => {
                                    this.CONSUME2(WS);
                                    this.CONSUME(WITH_TOKEN);
                                    this.CONSUME3(WS);
                                    operator = this.CONSUME(AGGREGATE_FUNCTION).image;

                                    this.OPTION3(() => {
                                        this.CONSUME4(WS);
                                        this.CONSUME(FROM_TOKEN);
                                        this.CONSUME2(SIMPLEIDENTIFIER);
                                    });
                                    this.CONSUME5(WS);
                                    this.CONSUME(AS_TOKEN);
                                    this.CONSUME6(WS);
                                    // NetAmount%20with%20max%20as%20maxAmount
                                    alias = this.CONSUME3(SIMPLEIDENTIFIER).image;
                                });
                            }
                        }
                    ]);

                    aggregates.push({
                        name: alias,
                        operator: operator,
                        sourceProperty: sourceProperty
                    });
                }
            });
            this.OPTION4(() => this.CONSUME7(WS));
            this.CONSUME(CLOSE);
            transformations.push({ type: 'aggregates', aggregateDef: aggregates });
        });

        this.orderByTrafo = this.RULE('orderByTrafo', (transformations: TransformationDefinition[] = []) => {
            //%s"orderby" OPEN orderbyItem *( COMMA orderbyItem ) CLOSE
            this.CONSUME(ORDERBY_TOKEN);
            this.CONSUME(OPEN);
            const orderBy: OrderByProp[] = [];
            this.MANY_SEP({
                SEP: COMMA,
                DEF: () => {
                    const orderbyProp: OrderByProp = {
                        name: this.CONSUME(SIMPLEIDENTIFIER).image,
                        direction: 'asc'
                    };
                    this.OPTION(() => {
                        this.CONSUME(WS);
                        orderbyProp.direction = this.CONSUME(ASCDESC).image as 'asc' | 'desc';
                    });
                    orderBy.push(orderbyProp);
                }
            });
            this.CONSUME(CLOSE);
            transformations.push({ type: 'orderBy', orderBy: orderBy });
        });

        this.concatTrafo = this.RULE('concatTrafo', (transformations: TransformationDefinition[] = []) => {
            //%s"concat" OPEN BWS applyExpr 1*( BWS COMMA BWS applyExpr ) BWS CLOSE
            this.CONSUME(CONCAT_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            const concatExpressions: TransformationDefinition[][] = [];
            this.MANY_SEP({
                SEP: COMMA,
                DEF: () => {
                    concatExpressions.push(this.SUBRULE(this.applyExpr));
                }
            });
            transformations.push({
                type: 'concat',
                concatExpr: concatExpressions
            });
            this.OPTION2(() => this.CONSUME2(WS));
            this.CONSUME(CLOSE);
        });

        this.ancestorsTrafo = this.RULE('ancestorsTrafo', (transformations: TransformationDefinition[] = []) => {
            //%s"ancestors" OPEN
            //                   BWS recHierReference BWS
            //                   COMMA BWS preservingTrafos BWS
            //                   [ COMMA BWS 1*DIGIT BWS ]
            //                   [ COMMA BWS %s"keep start" BWS ]
            //                   CLOSE
            this.CONSUME(ANCESTORS_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            const rootExpr = this.SUBRULE(this.rootExpr);
            this.CONSUME(COMMA);
            const recHierQualifier = this.CONSUME2(SIMPLEIDENTIFIER);
            this.CONSUME2(COMMA);
            let recHierPropertyPath = this.CONSUME3(SIMPLEIDENTIFIER).image;
            this.OPTION2(() => {
                this.CONSUME(SLASH);
                recHierPropertyPath += '/' + this.CONSUME4(SIMPLEIDENTIFIER).image;
            });
            this.CONSUME3(COMMA);
            const subTransformations: TransformationDefinition[] = [];
            this.SUBRULE(this.preservingTrafo, { ARGS: [subTransformations] });
            let maximumDistance = -1;
            // There can be more but we ignore them for now
            this.OPTION3(() => {
                this.CONSUME4(COMMA);
                maximumDistance = parseInt(this.CONSUME2(LITERAL).image, 10);
            });
            let shouldKeepStart = false;
            //                  [ COMMA BWS %s"keep start" BWS ]
            this.OPTION4(() => {
                this.CONSUME5(COMMA);
                shouldKeepStart = this.CONSUME(KEEP_START_TOKEN).image === 'keep start';
            });
            transformations.push({
                type: 'ancestors',
                parameters: {
                    hierarchyRoot: rootExpr,
                    qualifier: recHierQualifier.image,
                    propertyPath: recHierPropertyPath,
                    maximumDistance: maximumDistance,
                    keepStart: shouldKeepStart,
                    inputSetTransformations: subTransformations
                }
            });
            this.CONSUME(CLOSE);
        });

        this.rootExpr = this.RULE('rootExpr', () => {
            let rootExpr = '$root/';
            this.CONSUME(ROOT_TOKEN);
            // singleNavigationExpr
            const subExprs: string[] = [];
            this.MANY_SEP({
                SEP: SLASH,
                DEF: () => {
                    let subExpr = this.CONSUME2(SIMPLEIDENTIFIER).image;
                    this.OPTION2(() => {
                        // entitySetName + keyPredicate (simpleKey)
                        this.CONSUME(OPEN);
                        subExpr += `(${this.CONSUME(LITERAL).image})`;
                        this.CONSUME(CLOSE);
                    });
                    this.OPTION3(() => {
                        // entitySetName + keyPredicate (complexKey)
                        this.CONSUME2(OPEN);
                        const manySep: string[] = [];
                        this.MANY_SEP2({
                            SEP: COMMA,
                            DEF: () => {
                                const namespacePart = this.CONSUME3(SIMPLEIDENTIFIER).image;
                                this.CONSUME(EQ);
                                const value = this.CONSUME2(LITERAL).image;
                                manySep.push(`${namespacePart}=${value}`);
                            }
                        });
                        subExpr += `(${manySep.join(',')})`;
                        this.CONSUME2(CLOSE);
                    });
                    subExprs.push(subExpr);
                }
            });
            rootExpr += subExprs.join('/');
            return rootExpr;
        });

        this.descendantsTrafo = this.RULE('descendantsTrafo', (transformations: TransformationDefinition[] = []) => {
            //%s"descendants" OPEN
            //                  BWS recHierReference BWS
            //                  COMMA BWS preservingTrafos BWS
            //                  [ COMMA BWS 1*DIGIT BWS ]
            //                  [ COMMA BWS %s"keep start" BWS ]
            //                  CLOSE
            this.CONSUME(DESCENDANTS_TOKEN);
            this.CONSUME(OPEN);
            //filter(ID eq 'US'),1)/orderby(Name)&$count=true&$select=DistanceFromRoot,DrillState,ID,Name&$skip=0&$top=10");
            this.OPTION(() => this.CONSUME(WS));
            const rootExpr = this.SUBRULE(this.rootExpr);
            this.CONSUME(COMMA);
            const recHierQualifier = this.CONSUME2(SIMPLEIDENTIFIER);
            this.CONSUME2(COMMA);
            let recHierPropertyPath = this.CONSUME3(SIMPLEIDENTIFIER).image;
            this.OPTION2(() => {
                this.CONSUME(SLASH);
                recHierPropertyPath += '/' + this.CONSUME4(SIMPLEIDENTIFIER).image;
            });
            this.CONSUME3(COMMA);
            const subTransformations: TransformationDefinition[] = [];
            this.SUBRULE(this.preservingTrafo, { ARGS: [subTransformations] });
            // [ COMMA BWS 1*DIGIT BWS ]
            let maximumDistance = -1;
            // There can be more but we ignore them for now
            this.OPTION3(() => {
                this.CONSUME4(COMMA);
                maximumDistance = parseInt(this.CONSUME2(LITERAL).image, 10);
            });
            //                  [ COMMA BWS %s"keep start" BWS ]
            let shouldKeepStart = false;
            //                  [ COMMA BWS %s"keep start" BWS ]
            this.OPTION4(() => {
                this.CONSUME5(COMMA);
                shouldKeepStart = this.CONSUME(KEEP_START_TOKEN).image === 'keep start';
            });
            transformations.push({
                type: 'descendants',
                parameters: {
                    hierarchyRoot: rootExpr,
                    qualifier: recHierQualifier.image,
                    propertyPath: recHierPropertyPath,
                    maximumDistance: maximumDistance,
                    keepStart: shouldKeepStart,
                    inputSetTransformations: subTransformations
                }
            });
            this.CONSUME(CLOSE);
        });

        this.customFunction = this.RULE('customFunction', (transformations: TransformationDefinition[] = []) => {
            const namespaceParts: string[] = [];
            this.MANY_SEP({
                SEP: DOT,
                DEF: () => {
                    const namespacePart = this.CONSUME(SIMPLEIDENTIFIER);
                    namespaceParts.push(namespacePart.image);
                }
            });
            //const functionName = this.CONSUME2(SIMPLEIDENTIFIER);
            this.CONSUME(OPEN);
            const parameters: any = {};
            this.MANY_SEP2({
                SEP: COMMA,
                DEF: () => {
                    this.OR([
                        {
                            ALT: () => {
                                const identifier = this.CONSUME3(SIMPLEIDENTIFIER);
                                this.CONSUME(EQ);
                                const value = this.SUBRULE(this.rootExpr);
                                parameters[identifier.image] = value;
                            }
                        },
                        {
                            ALT: () => {
                                const identifier = this.CONSUME4(SIMPLEIDENTIFIER);
                                this.CONSUME2(EQ);
                                const value = this.CONSUME(LITERAL).image;
                                parameters[identifier.image] = value;
                            }
                        },
                        {
                            ALT: () => {
                                const identifier = this.CONSUME5(SIMPLEIDENTIFIER);
                                this.CONSUME3(EQ);
                                this.CONSUME(OPEN_BRACKET);
                                const parameterArray: any[] = [];
                                this.MANY_SEP3({
                                    SEP: COMMA,
                                    DEF: () => {
                                        this.OR2([
                                            {
                                                ALT: () => {
                                                    parameterArray.push(this.CONSUME2(LITERAL).image);
                                                }
                                            },
                                            {
                                                ALT: () => {
                                                    this.CONSUME(OPEN_CURLY_BRACKET);
                                                    const parameterValue: Record<string, unknown> = {};
                                                    // More complex parameters  {'NodeID':'US','Levels':1}
                                                    this.MANY_SEP4({
                                                        SEP: COMMA,
                                                        DEF: () => {
                                                            const key = this.CONSUME6(SIMPLEIDENTIFIERWITHWS).image;
                                                            this.CONSUME(COLON);
                                                            const value = this.OR3([
                                                                {
                                                                    ALT: () => {
                                                                        return this.CONSUME7(SIMPLEIDENTIFIERWITHWS);
                                                                    }
                                                                },
                                                                {
                                                                    ALT: () => {
                                                                        return this.CONSUME3(LITERAL);
                                                                    }
                                                                }
                                                            ]);
                                                            parameterValue[key] = value.image;
                                                        }
                                                    });
                                                    parameterArray.push(parameterValue);
                                                    this.CONSUME(CLOSE_CURLY_BRACKET);
                                                }
                                            }
                                        ]);
                                    }
                                });

                                this.CONSUME(CLOSE_BRACKET);
                                parameters[identifier.image] = parameterArray;
                            }
                        }
                    ]);
                }
            });
            this.CONSUME(CLOSE);
            transformations.push({ type: 'customFunction', name: namespaceParts.join('.'), parameters: parameters });
        });
        this.performSelfAnalysis();
    }
}

type AggregateProperty = {
    name: string;
    operator?: string;
    sourceProperty: string;
};

export function parseApply(applyParameters: string | null): TransformationDefinition[] | undefined {
    if (!applyParameters) {
        return undefined;
    }
    const parser = new ApplyParser();
    const lexingResult = SearchLexer.tokenize(applyParameters);
    parser.input = lexingResult.tokens;
    const output = parser.applyExpr();

    if (parser.errors.length > 0) {
        parser.errors.forEach(console.error);
        throw new Error('Parsing errors detected');
    }
    return output;
}
