import { createToken, Lexer } from 'chevrotain';
import type { FilterExpression } from './filterParser';
import { FilterParser } from './filterParser';
import {
    ANDOR,
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
    NUMBER
} from './commonTokens';

// ----------------- Lexer -----------------

const applyTokens = [
    OPEN,
    CLOSE,
    WS,
    COMMA,
    FILTER_TOKEN,
    SKIP_TOKEN,
    GROUPBY_TOKEN,
    AGGREGATE_TOKEN,
    COLON,
    SLASH,
    ANYALL,
    ANDOR,
    SIMPLE_METHOD,
    BOOL_METHOD,
    COMPLEX_METHOD,
    LOGICAL_OPERATOR,
    TYPEDEF,
    NUMBER,
    LITERAL,
    SIMPLEIDENTIFIER
];

export const SearchLexer = new Lexer(applyTokens, {
    // Less position info tracked, reduces verbosity of the playground output.
    positionTracking: 'onlyStart'
});

export type TransformationDefinition = {
    filter?: FilterExpression;
    groupBy: string[];
    skip?: number;
    aggregates: AggregateProperty[];
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
    preservingTrafo: CstRule<void>;
    groupbyTrafo: CstRule<void>;

    filterTrafo: CstRule<void>;
    skipTrafo: CstRule<void>;
    constructor() {
        super(applyTokens, {
            recoveryEnabled: true
        });

        this.applyExpr = this.RULE('applyExpr', () => {
            const transformation: TransformationDefinition = {
                groupBy: [],
                aggregates: []
            };
            this.SUBRULE(this.applyTrafo, { ARGS: [transformation] });
            this.MANY_SEP({
                SEP: SLASH,
                DEF: () => {
                    this.SUBRULE2(this.applyTrafo, { ARGS: [transformation] });
                }
            });
            return transformation;
        });

        this.applyTrafo = this.RULE('applyTrafo', (transformation: TransformationDefinition) => {
            // //= aggregateTrafo
            //     / ancestorsTrafo
            //     / computeTrafo
            //     / concatTrafo
            //     // / descendantsTrafo
            //     / groupbyTrafo
            //     // / joinTrafo
            //     // / nestTrafo
            //     // / outerjoinTrafo
            //     // / traverseTrafo
            //     / preservingTrafo
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
                        return this.SUBRULE(this.skipTrafo, { ARGS: [transformation] });
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

        this.skipTrafo = this.RULE('skipTrafo', (transformation: TransformationDefinition) => {
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
            return groupBy;
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
                    operator: 'count',
                    sourceProperty: property.image
                }
            ];
            this.OPTION2(() => this.CONSUME2(WS));
            this.CONSUME(CLOSE);
            return aggregates;
        });
        this.performSelfAnalysis();
    }
}

type AggregateProperty = {
    name: string;
    operator: string;
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
