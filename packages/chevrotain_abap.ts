(function jsonExample() {
    // ----------------- Lexer -----------------
    const createToken = chevrotain.createToken;
    const Lexer = chevrotain.Lexer;

    // In ES6, custom inheritance implementation
    // (such as the one above) can be replaced
    // with a more simple: "class X extends Y"...
    const Annotation = createToken({ name: 'Annotation', pattern: /@/ });
    const Hash = createToken({ name: 'Hash', pattern: /#/ });
    const Comment = createToken({ name: 'Comment', pattern: /\/\/[^\n]+/, group: Lexer.SKIPPED });
    const ComplexName = createToken({ name: 'ComplexName', pattern: /([A-z]+)(\.[A-z]+)*/ });
    const NewLine = createToken({ name: 'NewLine', pattern: /\n/, group: Lexer.SKIPPED });
    const NewView = createToken({ name: 'NewView', pattern: /define root view entity/ });
    const Identifier = createToken({ name: 'Identifier', longer_alt: ComplexName, pattern: /[_\w]+/ });
    const Text = createToken({ name: 'Text', pattern: /'[^']+'/ });
    const KeyKeyword = createToken({ name: 'KeyKeyword', pattern: /key/ });
    const AsKeyword = createToken({ name: 'AsKeyword', pattern: /as/ });
    const SingleQuote = createToken({ name: 'SingleQuote', pattern: /'/ });
    const True = createToken({ name: 'True', pattern: /true/ });
    const False = createToken({ name: 'False', pattern: /false/ });
    const Null = createToken({ name: 'Null', pattern: /null/ });
    const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
    const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
    const LSquare = createToken({ name: 'LSquare', pattern: /\[/ });
    const RSquare = createToken({ name: 'RSquare', pattern: /]/ });
    const Comma = createToken({ name: 'Comma', pattern: /,/ });
    const Colon = createToken({ name: 'Colon', pattern: /:/ });
    const StringLiteral = createToken({
        name: 'StringLiteral',
        pattern: /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/
    });
    const NumberLiteral = createToken({
        name: 'NumberLiteral',
        pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/
    });
    const WhiteSpace = createToken({
        name: 'WhiteSpace',
        pattern: /\s+/,
        group: Lexer.SKIPPED
    });

    const jsonTokens = [
        Annotation,
        Hash,
        NewLine,
        NewView,
        Text,
        WhiteSpace,
        LSquare,
        RSquare,
        LCurly,
        RCurly,
        Comma,
        Colon,
        KeyKeyword,
        AsKeyword,
        Identifier,
        ComplexName,
        Comment
    ];

    const JsonLexer = new Lexer(jsonTokens);

    // Labels only affect error messages and Diagrams.
    LCurly.LABEL = "'{'";
    RCurly.LABEL = "'}'";
    LSquare.LABEL = "'['";
    RSquare.LABEL = "']'";
    Comma.LABEL = "','";
    Colon.LABEL = "':'";

    // ----------------- parser -----------------
    const EmbeddedActionsParser = chevrotain.EmbeddedActionsParser;

    class JsonParser extends EmbeddedActionsParser {
        constructor() {
            super(jsonTokens, { recoveryEnabled: true, outputCst: false });

            const $ = this;

            $.RULE('abap', () => {
                const myObjects = {};
                $.MANY({
                    DEF: () => {
                        return $.OR([
                            { ALT: () => $.SUBRULE($.annotation, { ARGS: [myObjects] }) },
                            { ALT: () => $.SUBRULE($.viewDef, { ARGS: [myObjects] }) },
                            { ALT: () => $.CONSUME(Comment) }
                        ]);
                    }
                });
                return myObjects;
            });

            $.RULE('viewDef', (myObjects) => {
                myObjects ??= {};
                $.CONSUME(NewView);
                const identifier = $.CONSUME(Identifier);
                if (myObjects) {
                    myObjects.view = identifier.image;
                }
                $.CONSUME(LCurly);
                $.MANY_SEP({
                    SEP: Comma,
                    DEF: () => {
                        $.OR([
                            {
                                ALT: () => {
                                    const currentAnno = {};
                                    $.OPTION(() => $.SUBRULE($.annotation, { ARGS: [currentAnno] }));
                                    const isKey = $.OPTION2(() => $.CONSUME(KeyKeyword));

                                    let propName = $.CONSUME2(Identifier);
                                    $.OPTION3(() => {
                                        $.CONSUME(AsKeyword);
                                        propName = $.CONSUME3(Identifier);
                                    });
                                    myObjects.props ??= [];
                                    myObjects.props.push({
                                        name: propName.image,
                                        isKey: !!isKey,
                                        annotations: currentAnno.annotations
                                    });
                                }
                            },
                            {
                                ALT: () => {
                                    $.CONSUME(Comment);
                                }
                            }
                        ]);
                    }
                });
                $.CONSUME(RCurly);
            });
            $.RULE('annotation', (myObjects) => {
                myObjects ??= {};
                const annotation = $.CONSUME(Annotation);
                const annotationName = $.CONSUME(ComplexName);
                $.CONSUME(Colon);
                myObjects.annotations ??= [];
                const annotationValue = { ...$.SUBRULE($.annotationValue, { ARGS: [myObjects] }) } ?? {};
                annotationValue.name = annotationName.image;
                myObjects.annotations.push(annotationValue);
                return myObjects;
            });

            $.RULE('annotationValue', (myObjects) => {
                let isConstant = undefined;
                const annotationValue = $.OR([
                    {
                        ALT: () => {
                            const id = $.CONSUME(Text).image;
                            return id.substring(1, id.length - 1);
                        }
                    },
                    {
                        ALT: () => {
                            $.CONSUME(LCurly);
                            const annotationValue = [];
                            $.MANY_SEP({
                                SEP: Comma,
                                DEF: () => {
                                    const propName = $.OR3([
                                        {
                                            ALT: () => $.CONSUME2(ComplexName)
                                        },
                                        {
                                            ALT: () => $.CONSUME7(Identifier)
                                        }
                                    ]);

                                    $.CONSUME2(Colon);
                                    const propValue = $.OR2([
                                        {
                                            ALT: () => {
                                                const value = $.CONSUME3(Text).image;
                                                return value.substring(1, value.length - 1);
                                            }
                                        },
                                        {
                                            ALT: () => {
                                                debugger;
                                                return $.CONSUME6(Identifier).image;
                                            }
                                        }
                                    ]);
                                    annotationValue.push({ name: propName.image, value: propValue });
                                }
                            });
                            $.CONSUME(RCurly);
                            return annotationValue;
                        }
                    },
                    {
                        ALT: () => {
                            $.CONSUME(Hash);
                            isConstant = true;
                            return $.CONSUME4(Identifier).image;
                        }
                    },
                    {
                        ALT: () => {
                            return $.CONSUME5(Identifier).image;
                        }
                    }
                ]);
                const annotationObject = {};
                annotationObject.value = annotationValue;
                annotationObject.isConstant = isConstant;
                return annotationObject;
            });

            // very important to call this after all the rules have been setup.
            // otherwise the parser may not work correctly as it will lack information
            // derived from the self analysis.
            this.performSelfAnalysis();
        }
    }

    // for the playground to work the returned object must contain these fields
    return {
        lexer: JsonLexer,
        parser: JsonParser,
        defaultRule: 'abap'
    };
})();
