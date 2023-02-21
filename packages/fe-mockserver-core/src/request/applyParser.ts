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
    ASCDESC
} from './commonTokens';

// ----------------- Lexer -----------------

const applyTokens = [
    OPEN,
    DOT,
    EQ,
    CLOSE,
    WS,
    COMMA,
    DESCENDANTS_TOKEN,
    ORDERBY_TOKEN,
    FILTER_TOKEN,
    SKIP_TOKEN,
    GROUPBY_TOKEN,
    AGGREGATE_TOKEN,
    COLON,
    SLASH,
    ANYALL,
    ANDOR,
    ASCDESC,
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

export type CustomFunction = {
    name: string;
    parameters: Record<string, string | number>;
};
export type DescendantsParameters = {
    hierarchyRoot: string;
    qualifier: string;
    propertyPath: string;
    maximumDistance: number;
};
export type TopLevelParameters = {
    HierarchyNodes: string;
    Levels: string;
    NodeProperty: string;
    HierarchyQualifier: string;
};

export type TransformationDefinition = {
    filter?: FilterExpression;
    groupBy: string[];
    orderBy?: OrderByProp[];
    skip?: number;
    aggregates: AggregateProperty[];

    customFunction?: CustomFunction;
};
type OrderByProp = {
    name: string;
    direction: 'asc' | 'desc';
};
// Parser
type CstRule<T> = (idxInCallingRule?: number, ...args: any[]) => T;
/**
 *
 */
export class ApplyParser extends FilterParser {
    applyExpr: CstRule<TransformationDefinition>;
    applyTrafo: CstRule<TransformationDefinition>;
    aggregateTrafo: CstRule<void>;
    ancestorsTrafo: CstRule<TransformationDefinition>;
    computeTrafo: CstRule<TransformationDefinition>;
    concatTrafo: CstRule<TransformationDefinition>;
    customFunction: CstRule<TransformationDefinition>;
    preservingTrafo: CstRule<void>;
    descendantsTrafo: CstRule<void>;
    groupbyTrafo: CstRule<void>;

    filterTrafo: CstRule<void>;
    orderByTrafo: CstRule<void>;
    skipTrafo: CstRule<void>;
    constructor() {
        super(applyTokens, {
            recoveryEnabled: true
        });

        this.applyExpr = this.RULE(
            'applyExpr',
            (
                transformation: TransformationDefinition = {
                    groupBy: [],
                    aggregates: [],
                    filter: undefined
                }
            ) => {
                this.MANY_SEP({
                    SEP: SLASH,
                    DEF: () => {
                        this.SUBRULE2(this.applyTrafo, { ARGS: [transformation] });
                    }
                });
                return transformation;
            }
        );

        this.applyTrafo = this.RULE('applyTrafo', (transformation: TransformationDefinition) => {
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
                        return this.SUBRULE(this.aggregateTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.groupbyTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.preservingTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.descendantsTrafo, { ARGS: [transformation] });
                    }
                }
            ]);
            return transformation;
        });

        this.preservingTrafo = this.RULE('preservingTrafo', (transformation: TransformationDefinition) => {
            this.OR([
                {
                    ALT: () => {
                        return this.SUBRULE(this.filterTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.orderByTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.skipTrafo, { ARGS: [transformation] });
                    }
                },
                {
                    ALT: () => {
                        return this.SUBRULE(this.customFunction, { ARGS: [transformation] });
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

        this.skipTrafo = this.RULE('skipTrafo', (_transformation: TransformationDefinition) => {
            this.CONSUME(SKIP_TOKEN);
            this.CONSUME(OPEN);
            const skip = parseInt(this.CONSUME(NUMBER).image, 10);
            this.CONSUME(CLOSE);
            return skip;
        });

        this.filterTrafo = this.RULE('filterTrafo', (transformation: TransformationDefinition) => {
            this.CONSUME(FILTER_TOKEN);
            this.CONSUME(OPEN);
            const filterExpr = this.SUBRULE(this.filterExpr);
            if (transformation) {
                transformation.filter = filterExpr;
            }

            this.CONSUME(CLOSE);
        });

        //%s"groupby" OPEN BWS groupbyList [ BWS COMMA BWS applyExpr ] BWS CLOSE
        this.groupbyTrafo = this.RULE('groupbyTrafo', (transformation: TransformationDefinition) => {
            this.CONSUME(GROUPBY_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            this.CONSUME2(OPEN);
            this.OPTION2(() => this.CONSUME2(WS));
            const groupBy = [];
            groupBy.push(this.CONSUME(SIMPLEIDENTIFIER).image);
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
            this.OPTION5(() => {
                this.OPTION6(() => this.CONSUME4(WS));
                this.CONSUME(COMMA);
                this.SUBRULE(this.applyExpr, { ARGS: [transformation] });
            });
            this.CONSUME2(CLOSE);
            //OPEN BWS groupbyElement *( BWS COMMA BWS groupbyElement ) BWS CLOSE
            // groupbyElement  = groupingProperty / rollupLevels / rollupRecursive
            if (transformation) {
                transformation.groupBy = groupBy;
            }
        });

        this.aggregateTrafo = this.RULE('aggregateTrafo', (transformation: TransformationDefinition) => {
            // %s"aggregate" OPEN BWS aggregateExpr *( BWS COMMA BWS aggregateExpr ) BWS CLOSE
            this.CONSUME(AGGREGATE_TOKEN);
            this.CONSUME(OPEN);
            this.OPTION(() => this.CONSUME(WS));
            const property = this.CONSUME(SIMPLEIDENTIFIER);
            const aggregates = [
                {
                    name: property.image,
                    operator: undefined,
                    sourceProperty: property.image
                }
            ];
            this.OPTION2(() => this.CONSUME2(WS));
            this.CONSUME(CLOSE);
            if (transformation) {
                transformation.aggregates = aggregates;
            }
        });

        this.orderByTrafo = this.RULE('orderByTrafo', (transformation: TransformationDefinition) => {
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
            if (transformation) {
                transformation.orderBy = orderBy;
            }
        });

        this.descendantsTrafo = this.RULE('descendantsTrafo', (transformation: TransformationDefinition) => {
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
            const rootExpr = this.CONSUME(LITERAL);
            this.CONSUME(COMMA);
            const recHierQualifier = this.CONSUME2(SIMPLEIDENTIFIER);
            this.CONSUME2(COMMA);
            const recHierPropertyPath = this.CONSUME3(SIMPLEIDENTIFIER);
            this.CONSUME3(COMMA);
            this.SUBRULE(this.preservingTrafo, { ARGS: [transformation] });

            let maximumDistance = -1;
            // There can be more but we ignore them for now
            this.OPTION2(() => {
                this.CONSUME4(COMMA);
                maximumDistance = parseInt(this.CONSUME2(LITERAL).image, 10);
            });
            // [ COMMA BWS 1*DIGIT BWS ]
            //                  [ COMMA BWS %s"keep start" BWS ]
            if (transformation) {
                transformation.customFunction = {
                    name: 'descendants',
                    parameters: {
                        hierarchyRoot: rootExpr.image,
                        qualifier: recHierQualifier.image,
                        propertyPath: recHierPropertyPath.image,
                        maximumDistance: maximumDistance
                    }
                };
            }
            this.CONSUME(CLOSE);
        });

        this.customFunction = this.RULE('customFunction', (transformation: TransformationDefinition) => {
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
                    const identifier = this.CONSUME3(SIMPLEIDENTIFIER);
                    this.CONSUME(EQ);
                    const value = this.CONSUME(LITERAL);
                    parameters[identifier.image] = value.image;
                }
            });
            this.CONSUME(CLOSE);
            if (transformation) {
                transformation.customFunction = {
                    name: namespaceParts.join('.'),
                    parameters: parameters
                };
            }
            return transformation;
        });
        this.performSelfAnalysis();
    }
}

type AggregateProperty = {
    name: string;
    operator?: string;
    sourceProperty: string;
};

export function parseApply(applyParameters: string | null): TransformationDefinition | undefined {
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
