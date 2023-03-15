import { Lexer } from 'chevrotain';
import type { FilterExpression } from './filterParser';
import { FilterParser } from './filterParser';
import {
    ANDOR,
    DOT,
    ANYALL,
    BOOL_METHOD,
    CLOSE,
    COLON,
    COMPLEX_METHOD,
    FILTER_TOKEN,
    LITERAL,
    LOGICAL_OPERATOR,
    OPEN,
    SIMPLE_METHOD,
    SLASH,
    SKIP_TOKEN,
    TYPEDEF,
    WS,
    AGGREGATE_TOKEN,
    GROUPBY_TOKEN,
    COMMA,
    SIMPLEIDENTIFIER,
    NUMBER,
    EQ,
    DESCENDANTS_TOKEN,
    ORDERBY_TOKEN,
    ASCDESC,
    ANCESTORS_TOKEN,
    KEEP_START_TOKEN,
    OPEN_BRACKET,
    CLOSE_BRACKET,
    SEARCH_TOKEN,
    QUOTE,
    ROOT_TOKEN,
    WITH_TOKEN,
    AGGREGATE_FUNCTION,
    AS_TOKEN,
    FROM_TOKEN
} from './commonTokens';

// ----------------- Lexer -----------------

const applyTokens = [
    OPEN,
    DOT,
    EQ,
    CLOSE,
    QUOTE,
    OPEN_BRACKET,
    CLOSE_BRACKET,
    COMMA,
    ANCESTORS_TOKEN,
    KEEP_START_TOKEN,
    DESCENDANTS_TOKEN,
    ROOT_TOKEN,
    SEARCH_TOKEN,
    ORDERBY_TOKEN,
    FILTER_TOKEN,
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
    NUMBER
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
export type TopLevelParameters = {
    HierarchyNodes: string;
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
    parameters: Record<string, string | number | boolean | string[]>;
};
export type TransformationDefinition =
    | FilterTransformation
    | SearchTransformation
    | OrderByTransformation
    | GroupByTransformation
    | SkipTransformation
    | AggregatesTransformation
    | AncestorsTransformation
    | DescendantsTransformation
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
            const skip = parseInt(this.CONSUME(NUMBER).image, 10);
            this.CONSUME(CLOSE);
            transformations.push({ type: 'skip', skipCount: skip });
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
                    this.CONSUME(QUOTE);
                    const stringToken = this.OR([
                        {
                            ALT: () => {
                                return this.CONSUME(SIMPLEIDENTIFIER);
                            }
                        },
                        {
                            ALT: () => {
                                return this.CONSUME(LITERAL);
                            }
                        }
                    ]);
                    this.CONSUME2(QUOTE);
                    searchExpr.push(stringToken.image);
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
                        groupBy.push(this.CONSUME2(SIMPLEIDENTIFIER).image);
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
                        alias = this.CONSUME3(SIMPLEIDENTIFIER).image;
                    });

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
            const recHierPropertyPath = this.CONSUME3(SIMPLEIDENTIFIER);
            this.CONSUME3(COMMA);
            const subTransformations: TransformationDefinition[] = [];
            this.SUBRULE(this.preservingTrafo, { ARGS: [subTransformations] });
            let maximumDistance = -1;
            // There can be more but we ignore them for now
            this.OPTION2(() => {
                this.CONSUME4(COMMA);
                maximumDistance = parseInt(this.CONSUME2(LITERAL).image, 10);
            });
            let shouldKeepStart = false;
            //                  [ COMMA BWS %s"keep start" BWS ]
            this.OPTION3(() => {
                this.CONSUME5(COMMA);
                shouldKeepStart = this.CONSUME(KEEP_START_TOKEN).image === 'keep start';
            });
            transformations.push({
                type: 'ancestors',
                parameters: {
                    hierarchyRoot: rootExpr,
                    qualifier: recHierQualifier.image,
                    propertyPath: recHierPropertyPath.image,
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
            rootExpr += this.CONSUME(SIMPLEIDENTIFIER).image;
            this.OPTION(() => {
                // entitySetName + keyPredicate (simpleKey)
                this.CONSUME(OPEN);
                rootExpr += `(${this.CONSUME(LITERAL).image})`;
                this.CONSUME(CLOSE);
            });
            // singleNavigationExpr
            this.OPTION2(() => {
                this.CONSUME(SLASH);
                rootExpr += '/' + this.CONSUME2(SIMPLEIDENTIFIER).image;
            });
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
            const recHierPropertyPath = this.CONSUME3(SIMPLEIDENTIFIER);
            this.CONSUME3(COMMA);
            const subTransformations: TransformationDefinition[] = [];
            this.SUBRULE(this.preservingTrafo, { ARGS: [subTransformations] });
            // [ COMMA BWS 1*DIGIT BWS ]
            let maximumDistance = -1;
            // There can be more but we ignore them for now
            this.OPTION2(() => {
                this.CONSUME4(COMMA);
                maximumDistance = parseInt(this.CONSUME2(LITERAL).image, 10);
            });
            //                  [ COMMA BWS %s"keep start" BWS ]
            let shouldKeepStart = false;
            //                  [ COMMA BWS %s"keep start" BWS ]
            this.OPTION3(() => {
                this.CONSUME5(COMMA);
                shouldKeepStart = this.CONSUME(KEEP_START_TOKEN).image === 'keep start';
            });
            transformations.push({
                type: 'descendants',
                parameters: {
                    hierarchyRoot: rootExpr,
                    qualifier: recHierQualifier.image,
                    propertyPath: recHierPropertyPath.image,
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
                                        parameterArray.push(this.CONSUME2(LITERAL).image);
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
