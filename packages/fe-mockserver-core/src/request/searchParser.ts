import { createToken, EmbeddedActionsParser, Lexer } from 'chevrotain';

// ----------------- Lexer -----------------

const OPEN = createToken({ name: 'OPEN', pattern: /(:?\(|%28)/ });
const CLOSE = createToken({ name: 'CLOSE', pattern: /(:?\)|%29)/ });
const QUOTE = createToken({ name: 'QUOTE', pattern: /(:?"|%22)/ });
const STRINGLITERAL = createToken({
    name: 'SimpleIdentifier',
    pattern: /(:?[^\\"\s]+|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))+/
});
// null, boolean, guid, dateTimeInOffset / dateValue / timeOfDay / decimalValue / doubleValue / singleValue / string / duration / enum / binary
const ANDOR = createToken({ name: 'AndOr', pattern: /(:?AND|OR)/ });
const WS = createToken({ name: 'Whitespace', pattern: /\s+/ });
const searchTokens = [OPEN, CLOSE, QUOTE, ANDOR, WS, STRINGLITERAL];

export const SearchLexer = new Lexer(searchTokens, {
    // Less position info tracked, reduces verbosity of the playground output.
    positionTracking: 'onlyStart'
});

// Parser
type CstRule<T> = (idxInCallingRule?: number, ...args: any[]) => T;
/**
 *
 */
export class SearchParser extends EmbeddedActionsParser {
    searchExpression: CstRule<string[]>;
    expression: CstRule<string[]>;
    constructor() {
        super(searchTokens, {
            recoveryEnabled: true
        });

        this.searchExpression = this.RULE('searchExpression', () => {
            return this.SUBRULE(this.expression);
        });

        this.expression = this.RULE('expression', () => {
            let searchTerms: any[] = [];
            const hasQuote = this.OPTION2(() => this.CONSUME(QUOTE));
            if (hasQuote) {
                // String literal including WS
                let stringLit = '';
                this.MANY_SEP({
                    SEP: WS,
                    DEF: () => {
                        const stringToken = this.CONSUME(STRINGLITERAL);
                        if (stringLit.length > 0) {
                            stringLit += ' ';
                        }
                        stringLit += stringToken.image;
                    }
                });
                searchTerms.push(stringLit);
                this.CONSUME2(QUOTE);
            } else {
                searchTerms.push(this.CONSUME(STRINGLITERAL).image);
            }
            this.OPTION3(() => {
                this.CONSUME(WS);
                const otherExpression = this.SUBRULE(this.expression);
                searchTerms = searchTerms.concat(otherExpression);
            });
            return searchTerms;
        });
        this.performSelfAnalysis();
    }
}
export function parseSearch(searchParameters: string | null): string[] {
    if (!searchParameters) {
        return [];
    }
    const parser = new SearchParser();
    const lexingResult = SearchLexer.tokenize(searchParameters);
    parser.input = lexingResult.tokens;
    const output = parser.searchExpression();

    if (parser.errors.length > 0) {
        parser.errors.forEach(console.error);
        throw new Error('Parsing errors detected');
    }
    return output;
}
