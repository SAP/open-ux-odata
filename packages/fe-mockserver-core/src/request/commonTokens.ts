import { createToken } from 'chevrotain';

export const OPEN = createToken({ name: 'OPEN', pattern: /(:?\(|%28)/ });
export const OPEN_BRACKET = createToken({ name: 'OPEN_BRACKET', pattern: /(:?\[)/ });
export const DOT = createToken({ name: 'DOT', pattern: /\./ });
export const QUOTE = createToken({ name: 'QUOTE', pattern: /(:?"|%22)/ });
export const EQ = createToken({ name: 'EQ', pattern: /\=/ });
export const CLOSE = createToken({ name: 'CLOSE', pattern: /(:?\)|%29)/ });
export const CLOSE_BRACKET = createToken({ name: 'CLOSE_BRACKET', pattern: /(:?\])/ });
export const COMMA = createToken({ name: 'COMMA', pattern: /(:?,|%2C)/ });
export const SLASH = createToken({ name: 'SLASH', pattern: /\// });
export const ANYALL = createToken({ name: 'COMMA', pattern: /(:?any|all)\(/ });
export const COLON = createToken({ name: 'COLON', pattern: /(:?:|%3A)/ });
export const SIMPLEIDENTIFIER = createToken({ name: 'SimpleIdentifier', pattern: /\w{1,128}/ });
export const SIMPLE_METHOD = createToken({
    name: 'SIMPLE_METHOD',
    pattern: /(:?length|tolower|toupper|trim|round|floor|ceiling)/
});
export const COMPLEX_METHOD = createToken({
    name: 'COMPLEX_METHOD',
    pattern: /(:?concat|contains|endswith|indexof|matchesPattern|startswith|substringof|substring|cast)/
});
export const BOOL_METHOD = createToken({
    name: 'BOOL_METHOD',
    pattern: /(:?contains|endswith|startswith)/
});
export const TYPEDEF = createToken({ name: 'Typedef', pattern: /Edm\.[a-zA-Z]+/ });
// null, boolean, guid, dateTimeInOffset / dateValue / timeOfDay / decimalValue / doubleValue / singleValue / string / duration / enum / binary
export const LITERAL = createToken({
    name: 'Literal',
    pattern:
        /(:?null|true|false|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|guid(:?'|%27)[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:?'|%27)|datetime'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})*'|\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:.\d{7})*(?:.\d{3}Z|\+\d{2}:\d{2}))*|-?(:?0|[1-9]\d*)(\.\d+)?(:?[eE][+-]?\d+)?|'[^\\"\n\r\']*')/
});
//ee1a9172-f3c3-47ce-b0f7-dd28c740210c
export const LOGICAL_OPERATOR = createToken({ name: 'Logical', pattern: /(:?eq|ne|lt|le|gt|ge)/ });
export const ANDOR = createToken({ name: 'AndOr', pattern: /(\s|%20)(:?and|or)(\s|%20)/ });
export const ASCDESC = createToken({ name: 'AscDesc', pattern: /(:?asc|desc)/ });
export const WS = createToken({ name: 'Whitespace', pattern: /(\s|%20)+/ });
// const STRINGLITERAL = createToken({
//     name: 'SimpleIdentifier',
//     pattern: /(:?[^\\"\s]+|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))+/
// });
//const COMPLEXEXPRESSION = createToken({ name: 'ComplexExpression', pattern: /(:?[^\)]+)/ });
export const NUMBER = createToken({ name: 'Number', pattern: /(:?\d+)/ });
export const DIGIT = createToken({ name: 'Digit', pattern: /\d/ });
// null, boolean, guid, dateTimeInOffset / dateValue / timeOfDay / decimalValue / doubleValue / singleValue / string / duration / enum / binary
export const FILTER_TOKEN = createToken({ name: 'Filter', pattern: /filter/ });
export const ORDERBY_TOKEN = createToken({ name: 'Order By', pattern: /orderby/ });
export const DESCENDANTS_TOKEN = createToken({ name: 'Descendants', pattern: /descendants/ });
export const ANCESTORS_TOKEN = createToken({ name: 'Ancestors', pattern: /ancestors/ });
export const KEEP_START_TOKEN = createToken({ name: 'Keep Start', pattern: /keep start/ });
export const SKIP_TOKEN = createToken({ name: 'Skip', pattern: /skip/ });
export const GROUPBY_TOKEN = createToken({ name: 'GroupBy', pattern: /groupby/ });
export const SEARCH_TOKEN = createToken({ name: 'Search', pattern: /search/ });
export const AGGREGATE_TOKEN = createToken({ name: 'Aggregate', pattern: /aggregate/ });
export const WITH_TOKEN = createToken({ name: 'With', pattern: /with/ });
export const FROM_TOKEN = createToken({ name: 'From', pattern: /from/ });
export const AS_TOKEN = createToken({ name: 'As', pattern: /as/ });
export const AGGREGATE_FUNCTION = createToken({
    name: 'Aggregate Functions',
    pattern: /\b(sum|min|max|countdistinct|average)\b/
});
export const ROOT_TOKEN = createToken({ name: 'Root Token', pattern: /\$root\// });
