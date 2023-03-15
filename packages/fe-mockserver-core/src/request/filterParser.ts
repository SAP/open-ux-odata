import type { IParserConfig } from 'chevrotain';
import { EmbeddedActionsParser, Lexer } from 'chevrotain';
import {
    TYPEDEF,
    COMMA,
    COLON,
    SLASH,
    ANYALL,
    ANDOR,
    WS,
    CLOSE,
    BOOL_METHOD,
    SIMPLE_METHOD,
    LOGICAL_OPERATOR,
    SIMPLEIDENTIFIER,
    LITERAL,
    COMPLEX_METHOD
} from './commonTokens';
import { OPEN } from './commonTokens';

// ----------------- Lexer -----------------

const filterTokens = [
    OPEN,
    CLOSE,
    COMMA,
    COLON,
    SLASH,
    ANYALL,
    ANDOR,
    WS,
    SIMPLE_METHOD,
    BOOL_METHOD,
    COMPLEX_METHOD,
    LOGICAL_OPERATOR,
    TYPEDEF,
    LITERAL,
    SIMPLEIDENTIFIER
];

export const FilterLexer = new Lexer(filterTokens, {
    // Less position info tracked, reduces verbosity of the playground output.
    positionTracking: 'onlyStart'
});

export type FilterMethodCall = {
    type: 'method';
    method: string;
    methodArgs: string[];
};
export type LambdaExpression = {
    type: 'lambda';
    operator: 'ALL' | 'ANY';
    key: string;
    expression: FilterExpression;
    target: string;
    propertyPath?: string;
};
export type FilterExpression = {
    expressions: FilterExpression[];
    operator?: string;
    isGroup?: boolean;
    literal?: string;
    identifier?: string | FilterMethodCall | LambdaExpression;
};
// Parser
type CstRule<T> = (idxInCallingRule?: number, ...args: any[]) => T;
/**
 *
 */
export class FilterParser extends EmbeddedActionsParser {
    filterExpr: CstRule<FilterExpression>;
    boolCommonExpr: CstRule<FilterExpression>;
    boolMethodCallExpr: CstRule<FilterMethodCall>;
    methodCallExpr: CstRule<FilterMethodCall>;
    literalOrIdentifier: CstRule<string>;
    lambdaOperator: CstRule<LambdaExpression>;
    memberExpr: CstRule<string>;
    constructor(
        tokens = filterTokens,
        config: IParserConfig = {
            recoveryEnabled: true
        }
    ) {
        super(tokens, config);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const $ = this;

        $.filterExpr = $.RULE('filterExpr', () => {
            return $.SUBRULE($.boolCommonExpr);
        });

        $.literalOrIdentifier = $.RULE('literalOrIdentifier', () => {
            return $.OR([
                {
                    ALT: () => {
                        const consumedTypedef = $.CONSUME(TYPEDEF);
                        return consumedTypedef.image;
                    }
                },
                {
                    ALT: () => {
                        const consumedLiteral = $.CONSUME(LITERAL);
                        return consumedLiteral.image;
                    }
                },
                {
                    ALT: () => $.SUBRULE($.memberExpr)
                }
            ]);
        });
        $.boolMethodCallExpr = $.RULE('boolMethodCallExpr', () => {
            const methodNode = $.CONSUME(BOOL_METHOD);
            $.OPTION(() => $.CONSUME(WS));
            $.CONSUME2(OPEN);
            $.OPTION2(() => $.CONSUME2(WS));
            const literal1Node = $.OR2([
                { ALT: () => $.SUBRULE2($.methodCallExpr) },
                { ALT: () => $.SUBRULE2($.literalOrIdentifier) }
            ]);
            $.OPTION3(() => $.CONSUME3(WS));
            $.CONSUME(COMMA);
            $.OPTION4(() => $.CONSUME4(WS));
            const literal2Node = $.OR3([
                { ALT: () => $.SUBRULE3($.methodCallExpr) },
                { ALT: () => $.SUBRULE3($.literalOrIdentifier) }
            ]);
            $.OPTION5(() => $.CONSUME5(WS));
            $.CONSUME2(CLOSE);
            const methodArgs = [literal1Node];
            if (literal2Node) {
                methodArgs.push(literal2Node);
            }
            return {
                type: 'method',
                method: methodNode.image,
                methodArgs
            };
        });
        $.methodCallExpr = $.RULE('methodCallExpr', () => {
            let methodNode!: any;
            let literal1Node!: any;
            let literal2Node: any;
            $.OR([
                {
                    ALT: () => {
                        methodNode = $.CONSUME(SIMPLE_METHOD);
                        $.CONSUME(OPEN);
                        literal1Node = $.OR2([
                            { ALT: () => $.SUBRULE2($.methodCallExpr) },
                            { ALT: () => $.SUBRULE2($.literalOrIdentifier) }
                        ]);
                        $.CONSUME(CLOSE);
                    }
                },
                {
                    ALT: () => {
                        methodNode = $.CONSUME(COMPLEX_METHOD);
                        $.OPTION(() => $.CONSUME(WS));
                        $.CONSUME2(OPEN);
                        $.OPTION2(() => $.CONSUME2(WS));
                        literal1Node = $.OR3([
                            { ALT: () => $.SUBRULE3($.methodCallExpr) },
                            { ALT: () => $.SUBRULE3($.literalOrIdentifier) }
                        ]);
                        $.OPTION3(() => $.CONSUME3(WS));
                        $.CONSUME(COMMA);
                        $.OPTION4(() => $.CONSUME4(WS));
                        literal2Node = $.OR4([
                            { ALT: () => $.SUBRULE4($.methodCallExpr) },
                            { ALT: () => $.SUBRULE4($.literalOrIdentifier) }
                        ]);
                        $.OPTION5(() => $.CONSUME5(WS));
                        $.CONSUME2(CLOSE);
                    }
                }
            ]);
            const methodArgs = [literal1Node.image ? literal1Node.image : literal1Node];
            if (literal2Node) {
                methodArgs.push(literal2Node.image ? literal2Node.image : literal2Node);
            }
            return {
                type: 'method',
                method: methodNode.image,
                methodArgs
            };
        });

        $.lambdaOperator = $.RULE('lambdaOperator', () => {
            const anyAll = $.CONSUME(ANYALL);
            const lambdaExpression = $.OR([
                {
                    ALT: () => {
                        const key = $.CONSUME(SIMPLEIDENTIFIER);
                        $.CONSUME(COLON);
                        const subExpr = $.SUBRULE($.boolCommonExpr);
                        $.OPTION(() => {
                            $.CONSUME(CLOSE);
                        });
                        return {
                            type: 'lambda',
                            operator: anyAll.image.toUpperCase().slice(0, anyAll.image.toUpperCase().length - 1),
                            key: key.image,
                            expression: subExpr,
                            target: ''
                        };
                    }
                },
                {
                    ALT: () => {
                        $.CONSUME2(OPEN);
                        const subExpr = $.SUBRULE2($.boolCommonExpr);
                        $.CONSUME2(CLOSE);
                        return {
                            type: 'lambda',
                            operator: anyAll.image.toUpperCase().slice(0, anyAll.image.toUpperCase().length - 1),
                            key: '',
                            expression: subExpr,
                            target: ''
                        };
                    }
                }
            ]);

            return lambdaExpression as LambdaExpression;
        });

        $.memberExpr = $.RULE('memberExpr', () => {
            let memberDef = '';
            const identifier = $.CONSUME(SIMPLEIDENTIFIER);
            memberDef += identifier.image;
            $.OPTION(() => {
                $.CONSUME(SLASH);

                const outMember: any = $.OR([
                    {
                        ALT: () => $.SUBRULE($.memberExpr)
                    },
                    {
                        ALT: () => $.SUBRULE($.lambdaOperator)
                    }
                ]);
                if (outMember.type === 'lambda') {
                    // Lamba
                    if (outMember.target === '') {
                        outMember.target = memberDef;
                    } else {
                        outMember.target = memberDef + '/' + outMember.target;
                    }

                    memberDef = outMember;
                } else {
                    memberDef += '/';
                    memberDef += outMember;
                }
            });
            return memberDef;
        });

        $.boolCommonExpr = $.RULE('boolCommonExpr', () => {
            let operator;
            let literal;
            let subExpr = $.OR([
                {
                    ALT: () => {
                        // boolParenExpr
                        $.CONSUME(OPEN);
                        const expression = $.SUBRULE($.boolCommonExpr);
                        $.CONSUME(CLOSE);
                        return {
                            isGroup: true,
                            operator: expression.operator,
                            expressions: expression.expressions
                        } as FilterExpression;
                    }
                },
                {
                    ALT: () => {
                        return { identifier: $.SUBRULE($.boolMethodCallExpr) };
                    }
                },
                {
                    ALT: () => {
                        const expression: FilterExpression = {} as FilterExpression;
                        const identifier = $.OR2([
                            {
                                ALT: () => $.SUBRULE($.memberExpr)
                            },
                            {
                                ALT: () => $.SUBRULE($.methodCallExpr)
                            }
                        ]);
                        $.OPTION(() => {
                            $.CONSUME(WS);
                            operator = $.CONSUME(LOGICAL_OPERATOR);
                            $.CONSUME2(WS);
                            literal = $.OR3([
                                {
                                    ALT: () => $.CONSUME(LITERAL)
                                },
                                {
                                    ALT: () => $.SUBRULE2($.methodCallExpr)
                                }
                            ]);
                            expression.operator = operator.image;
                            expression.literal = literal.image ? literal.image : literal;
                        });
                        expression.identifier = identifier;

                        return expression;
                    }
                }
            ]);
            $.OPTION2(() => {
                operator = $.CONSUME(ANDOR);
                const subsubExpr = $.SUBRULE2($.boolCommonExpr);
                let expressions: FilterExpression[];
                let currentOperator = operator.image.trim().toUpperCase();
                if (!subsubExpr.expressions && subExpr.expressions) {
                    expressions = [subExpr].concat([subsubExpr]);
                } else if (
                    currentOperator === subsubExpr.operator ||
                    subsubExpr.operator === '' ||
                    subsubExpr.operator === undefined
                ) {
                    expressions = [subExpr].concat(subsubExpr.expressions);
                } else if (currentOperator === 'AND' && !subsubExpr.isGroup) {
                    //AND has priority
                    expressions = [subExpr].concat(subsubExpr.expressions.shift());
                    const subObject: FilterExpression = {
                        expressions,
                        operator: currentOperator
                    };
                    expressions = [subObject].concat(subsubExpr.expressions);
                    currentOperator = subsubExpr.operator;
                } else {
                    expressions = [subExpr].concat([subsubExpr]);
                }

                subExpr = {
                    operator: currentOperator,
                    expressions: expressions
                };
            });
            if (subExpr && Array.isArray(subExpr.expressions)) {
                return subExpr;
            }
            return { expressions: [subExpr] };
        });
        if (tokens === filterTokens) {
            this.performSelfAnalysis();
        }
    }
}

export function parseFilter(filterParameters: string | null) {
    if (!filterParameters) {
        return undefined;
    }
    const parser = new FilterParser();
    const lexingResult = FilterLexer.tokenize(filterParameters);
    // "input" is a setter which will reset the parser's state.
    parser.input = lexingResult.tokens;
    const output = parser.filterExpr();

    if (parser.errors.length > 0) {
        parser.errors.forEach(console.error);
        throw new Error('Parsing errors detected');
    }
    return output;
}
