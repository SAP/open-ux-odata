// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="csdl.d.ts"/>
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as mkdirp from 'mkdirp';
import axios from 'axios';
import type {
    Action,
    ComplexType,
    CSDL,
    Function,
    EnumType,
    SchemaElement,
    SchemaWrapper,
    Term,
    TypeDefinition
} from '@sap-ux/vocabularies/CSDL';

const writeFile = util.promisify(fs.writeFile);

const vocabularyConfig = JSON.parse(fs.readFileSync(path.join(__dirname, './config.json')).toString('utf-8')) || {};
const DEFAULT_KEYS = ['$Version', '$Reference'];
const ANNOTATION_TARGETS = [
    'EntityContainer',
    'Schema',
    'Reference',
    'EntityType',
    'EnumType',
    'ComplexType',
    'Property',
    'NavigationProperty',
    'TypeDefinition',
    'Term',
    'Parameter',
    'ReturnType',
    'EntitySet',
    'Singleton',
    'ActionImport',
    'FunctionImport',
    'Action',
    'Function',
    'Include',
    'Annotation',
    'Collection',
    'Record',
    'PropertyValue'
];

export const getVocabularyFile = async (url: string): Promise<CSDL> => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Prepare the vocabularies by including the references and some known used types.
 *
 * @param vocabularies the vocabulary json data
 * @returns a map of vocabularies
 */
function prepareVocabularies(vocabularies: VocabularyObject[]): EnrichedVocabularyMap {
    const allVocabularies: EnrichedVocabularyMap = {};
    vocabularies.forEach((vocabularyInfo) => {
        allVocabularies[vocabularyInfo.name] = {
            content: vocabularyInfo.content,
            alias: vocabularyInfo.name,
            references: [],
            namespace: ''
        };
        if (vocabularyInfo.content.$Reference !== undefined) {
            const vocabularyReferences = vocabularyInfo.content.$Reference;
            const references: VocabularyReference[] = [];
            Object.keys(vocabularyReferences).forEach((referenceName: string) => {
                const referenceInfo = vocabularyReferences[referenceName];
                if (referenceInfo.$Include) {
                    referenceInfo.$Include.forEach((includeDefinition) => {
                        const { $Alias: alias = '', $Namespace: namespace = '' } = { ...includeDefinition };
                        references.push({ alias: alias, namespace: namespace });
                    });
                }
            });
            if (vocabularyInfo.name === 'Common') {
                references.push({ alias: 'Analytics', namespace: 'com.sap.vocabularies.Analytics.v1' });
            }
            if (vocabularyInfo.name === 'UI') {
                references.push({ alias: 'Analytics', namespace: 'com.sap.vocabularies.Analytics.v1' });
                references.push({ alias: 'Aggregation', namespace: 'Org.OData.Aggregation.V1' });
            }
            allVocabularies[vocabularyInfo.name].references = references;
        }
        Object.keys(vocabularyInfo.content).forEach((vocabularyKey) => {
            if (!DEFAULT_KEYS.includes(vocabularyKey)) {
                allVocabularies[vocabularyInfo.name].namespace = vocabularyKey;
            }
        });
    });
    return allVocabularies;
}

type VocabularyObject = {
    name: string;
    content: CSDL;
};

type VocabularyReference = {
    alias: string;
    namespace: string;
};

type EnrichedVocabularyObject = {
    alias: string;
    content: CSDL;
    namespace: string;
    references: VocabularyReference[];
};

type EnrichedVocabularyMap = { [key: string]: EnrichedVocabularyObject };

const schemaElementRegexp = /^[^$@]*$/;

/**
 * @param schemaElementKey the key of the schema element
 * @param schemaElement the schema element to test
 * @returns true if the element is a schema element
 */
function isSchemaElement(
    schemaElementKey: string,
    schemaElement: SchemaElement | Action[] | Function[]
): schemaElement is SchemaElement {
    return schemaElementRegexp.test(schemaElementKey);
}

/**
 * @param schemaElement the schema element to evaluate
 * @returns true if the element is an Enum
 */
function isEnumType(schemaElement: SchemaElement): schemaElement is EnumType {
    return schemaElement && (schemaElement as EnumType).$Kind === 'EnumType';
}

/**
 * @param schemaElement the schema element to evaluate
 * @returns true if the element is a TypeDefinition
 */
function isSimpleType(schemaElement: SchemaElement): schemaElement is TypeDefinition {
    return schemaElement && (schemaElement as TypeDefinition).$Kind === 'TypeDefinition';
}

/**
 * Retrieve and output the @Core.Description from the element.
 *
 * @param schemaElement the schema element to evaluate
 * @returns the current element description
 */
function getDescription(schemaElement: ComplexType | TypeDefinition | Term | EnumType | Action | Function) {
    if (schemaElement['@Core.Description']) {
        return `/**\n  ${schemaElement['@Core.Description']}\n*/\n`;
    } else {
        return '';
    }
}

/**
 * Unalias a string from all its vocabulary reference (from aliased name to full name).
 *
 * @param referenceMap a map of all existing vocabularies
 * @param aliasedValue the string containing aliased values
 * @returns the unaliased value of the vocabulary name
 */
function unalias(referenceMap: any, aliasedValue: string | undefined): string | undefined {
    if (!aliasedValue) {
        return aliasedValue;
    }
    const [alias, ...value] = aliasedValue.split('.');
    const reference = referenceMap[alias];
    if (reference) {
        return `${reference}.${value.join('.')}`;
    } else if (aliasedValue.indexOf('@') !== -1) {
        const [preAlias, ...postAlias] = aliasedValue.split('@');
        return `${preAlias}@${unalias(referenceMap, postAlias.join('@'))}`;
    } else {
        return aliasedValue;
    }
}

/**
 * Return only the type name in case the type is declared in this file with this alias (ie: Core.Description -> Description in the Core file).
 *
 * @param typeValue the type to format
 * @param currentAlias the alias from the current vocabulary
 * @returns the formatted type
 */
function formatType(typeValue: string, currentAlias: string) {
    const typeSplit = typeValue.split('.');
    if (typeSplit.length > 1 && typeSplit[0] === currentAlias) {
        return typeSplit[1];
    } else {
        return typeValue;
    }
}

/**
 * Generates the TS types for the vocabularies into the given path.
 *
 * @param targetFolder the target folder for the types
 */
async function generateTypes(targetFolder: string) {
    mkdirp.sync(targetFolder);

    const vocabularyPromises = Object.keys(vocabularyConfig).map(async (vocabularyName) => {
        const vocabularyContent = await getVocabularyFile(vocabularyConfig[vocabularyName]);
        return { name: vocabularyName, content: vocabularyContent };
    });

    const vocabularies: VocabularyObject[] = await Promise.all(vocabularyPromises);

    const allVocabularies: EnrichedVocabularyMap = prepareVocabularies(vocabularies);
    const references: any = {};
    const allTermsToTypes: any = {};
    Object.keys(allVocabularies).forEach((vocabularyAlias) => {
        references[vocabularyAlias] = allVocabularies[vocabularyAlias].namespace;
    });

    for (const vocabularyAlias in allVocabularies) {
        const vocabularyData = allVocabularies[vocabularyAlias];
        const vocabularyNamespace = vocabularyData.namespace;
        const vocabularyNamespaceTrans = vocabularyData.namespace.replace(/\./g, '_');

        const compositesAnnotations: any = ANNOTATION_TARGETS.reduce(
            (compositesAnnotations: any, annotationTargetName) => {
                compositesAnnotations[annotationTargetName] = [];
                return compositesAnnotations;
            },
            {}
        );

        let vocabularyEdmDef: string = '';
        let vocabularyDef: string = '';
        const addedReferences: Record<string, boolean> = {};
        vocabularyData.references.forEach((reference) => {
            if (!addedReferences[reference.alias]) {
                addedReferences[reference.alias] = true;
                vocabularyDef += `import * as ${reference.alias} from "./${reference.alias}";\n`;
            }
        });

        // vocabularyDef += `import { AnnotationTerm, PropertyValue, EnumValue } from "@sap/ux/vocabularies/Edm";\n`;
        vocabularyDef += 'import * as Edm from "../Edm";\n';
        vocabularyDef += 'import AnnotationTerm = Edm.AnnotationTerm;\n';
        vocabularyDef += 'import PropertyAnnotationValue = Edm.PropertyAnnotationValue;\n';
        vocabularyDef += 'import EnumValue = Edm.EnumValue;\n';
        vocabularyDef += 'import ComplexType = Edm.RecordComplexType;\n';
        // vocabularyDef += "    import AnnotationRecord = Edm.AnnotationRecord;\n";
        vocabularyDef += '\n';
        const vocabularyDefinition: SchemaWrapper = vocabularyData.content[vocabularyData.namespace];
        const typeInheritances: any = {};
        const vocabularyTerms: any = {};
        const vocabularyTypes: any = {};
        Object.keys(vocabularyDefinition).forEach((vocabularyTerm) => {
            const vocabularyTermInfo: SchemaElement | Action[] | Function[] = vocabularyDefinition[vocabularyTerm];
            if (isSchemaElement(vocabularyTerm, vocabularyTermInfo)) {
                vocabularyDef += '\n';
                switch (vocabularyTermInfo.$Kind) {
                    case 'TypeDefinition':
                        vocabularyDef += `\n// Typedefinition \n`;
                        vocabularyDef += getDescription(vocabularyTermInfo);
                        vocabularyDef += `export type ${vocabularyTerm} = ${formatType(
                            vocabularyTermInfo.$UnderlyingType,
                            vocabularyAlias
                        )}`;
                        vocabularyDef += `;`;
                        break;
                    case 'Term':
                        vocabularyDef += `\n// Term \n`;
                        vocabularyDef += getDescription(vocabularyTermInfo);
                        const termType = formatType(vocabularyTermInfo.$Type || 'Edm.String', vocabularyAlias);
                        (vocabularyTermInfo.$AppliesTo || Object.keys(compositesAnnotations)).forEach(
                            (target: string) => {
                                compositesAnnotations[target].push(
                                    // Switch from FQDN to not FQDN
                                    // `\n        '@${vocabularyNamespace}.${vocabularyTerm}'?: ${vocabularyTerm};`
                                    `\n    '${vocabularyTerm}'?: ${vocabularyNamespaceTrans}.${vocabularyTerm};`
                                );
                            }
                        );

                        let [termAlias, termName] = termType.split('.');

                        if (termName === undefined) {
                            termName = termAlias;
                            termAlias = vocabularyAlias;
                        }
                        let renamedTermType = `${termType}`;
                        const targetTerm = vocabularyDefinition[termName];
                        if (
                            termAlias === vocabularyAlias &&
                            (!isSchemaElement(termName, targetTerm) ||
                                (targetTerm.$Kind !== 'TypeDefinition' && !isEnumType(targetTerm)))
                        ) {
                            renamedTermType += `Types`;
                        }
                        if (renamedTermType === 'Edm.AnnotationPath') {
                            renamedTermType = 'Edm.AnnotationPath<any>';
                        }
                        if (vocabularyTermInfo.$Collection) {
                            renamedTermType += `[]`;
                        }
                        //let needNewLine = false;

                        if (isSchemaElement(termName, targetTerm) && isEnumType(targetTerm)) {
                            vocabularyDef += `export type ${vocabularyTerm} = EnumValue<${renamedTermType}>`;
                            //needNewLine = true;
                        } else if (
                            renamedTermType === 'Core.Tag' ||
                            renamedTermType.startsWith('Edm.String') ||
                            (isSchemaElement(termName, targetTerm) && isSimpleType(targetTerm))
                        ) {
                            vocabularyDef += `export type ${vocabularyTerm} = { term : ${vocabularyAlias}AnnotationTerms.${vocabularyTerm}} & AnnotationTerm<PropertyAnnotationValue<${renamedTermType}>>`;
                        } else {
                            vocabularyDef += `export type ${vocabularyTerm} = { term : ${vocabularyAlias}AnnotationTerms.${vocabularyTerm} } & AnnotationTerm<${renamedTermType}>`;
                        }

                        // if (vocabularyTermInfo.$Nullable) {
                        // 	if (needNewLine) {
                        // 		vocabularyDef += `\n       `;
                        // 	}
                        // 	vocabularyDef += ` | null`;
                        // }
                        vocabularyTerms[vocabularyTerm] = true;
                        vocabularyDef += `;`;

                        break;
                    case 'ComplexType':
                        vocabularyDef += `\n// ComplexType \n`;
                        vocabularyDef += getDescription(vocabularyTermInfo);
                        if (!typeInheritances[vocabularyTerm]) {
                            typeInheritances[vocabularyTerm] = [];
                        }
                        vocabularyDef += `export type ${vocabularyTerm} = ComplexType & `;
                        if (vocabularyTermInfo.$BaseType) {
                            const baseType = formatType(vocabularyTermInfo.$BaseType, vocabularyAlias);
                            if (!typeInheritances[baseType]) {
                                typeInheritances[baseType] = [];
                            }
                            typeInheritances[baseType].push(vocabularyTerm);
                            vocabularyDef += `Omit<${baseType}, '$Type'> & `;
                        }
                        vocabularyDef += `{\n`;
                        vocabularyDef += `	$Type: ${vocabularyAlias}AnnotationTypes.${vocabularyTerm};\n`;
                        vocabularyTypes[vocabularyTerm] = `${vocabularyNamespace}.${vocabularyTerm}`;
                        Object.keys(vocabularyTermInfo).forEach((vocabularyTermKey) => {
                            if (vocabularyTermInfo[vocabularyTermKey]['@Core.Description']) {
                                vocabularyDef += `	/**\n        ${vocabularyTermInfo[vocabularyTermKey]['@Core.Description']}\n    */\n`;
                            }
                            if (vocabularyTermKey[0] != '@' && vocabularyTermKey[0] != '$') {
                                let keyType = formatType(
                                    vocabularyTermInfo[vocabularyTermKey].$Type || 'Edm.String',
                                    vocabularyAlias
                                );
                                vocabularyDef += `    ${vocabularyTermKey}`;
                                if (vocabularyTermInfo[vocabularyTermKey].$Nullable) {
                                    vocabularyDef += `?`;
                                }

                                const targetTerm = vocabularyDefinition[keyType];
                                if (
                                    keyType.startsWith('Edm.') &&
                                    keyType !== 'Edm.AnnotationPath' &&
                                    keyType !== 'Edm.PropertyPath' &&
                                    keyType !== 'Edm.NavigationPropertyPath'
                                ) {
                                    if (vocabularyTermInfo[vocabularyTermKey].$Collection) {
                                        keyType += `[]`;
                                    }
                                    keyType = `PropertyAnnotationValue<${keyType}>`;
                                } else if (
                                    targetTerm &&
                                    isSchemaElement(keyType, targetTerm) &&
                                    targetTerm.$Kind === 'ComplexType'
                                ) {
                                    keyType += `Types`;
                                    if (vocabularyTermInfo[vocabularyTermKey].$Collection) {
                                        keyType += `[]`;
                                    }
                                    keyType = `${keyType}`;
                                } else {
                                    if (keyType === 'Edm.AnnotationPath') {
                                        if (vocabularyTermInfo[vocabularyTermKey]['@Validation.AllowedTerms']) {
                                            keyType = `Edm.AnnotationPath<${(
                                                vocabularyTermInfo[vocabularyTermKey]['@Validation.AllowedTerms'] as any
                                            )
                                                .map((type: string) => {
                                                    return formatType(type, vocabularyAlias);
                                                })
                                                .join('|')}>`;
                                        } else {
                                            keyType = 'Edm.AnnotationPath<any>';
                                        }
                                    }
                                    if (vocabularyTermInfo[vocabularyTermKey].$Collection) {
                                        keyType += `[]`;
                                    }
                                }
                                vocabularyDef += `: ${keyType}`;

                                // if (vocabularyTermInfo[vocabularyTermKey].$Nullable) {
                                //     vocabularyDef += ` | null`;
                                // }
                                vocabularyDef += ';\n';
                                if (
                                    vocabularyTermKey === 'Action' &&
                                    (keyType === 'Common.QualifiedName' || keyType === 'Common.ActionOverload')
                                ) {
                                    vocabularyDef += `\n    ActionTarget?: Edm.Action;\n`;
                                }
                            }
                        });
                        vocabularyDef += `}\n`;
                        break;

                    case 'EnumType':
                        vocabularyDef += `\n// EnumType \n`;
                        vocabularyDef += getDescription(vocabularyTermInfo);
                        vocabularyDef += `export const enum ${vocabularyTerm} {\n`;
                        let hasPreviousEnum = false;
                        Object.keys(vocabularyTermInfo).forEach((vocabularyTermKey) => {
                            if (
                                vocabularyTermKey[0] != '@' &&
                                vocabularyTermKey[0] != '$' &&
                                vocabularyTermKey.indexOf('@') === -1
                            ) {
                                if (hasPreviousEnum) {
                                    vocabularyDef += ',';
                                    vocabularyDef += '\n';
                                }
                                if (vocabularyTermInfo[vocabularyTermKey + '@Core.Description']) {
                                    vocabularyDef += `	/**\n	${
                                        vocabularyTermInfo[vocabularyTermKey + '@Core.Description']
                                    }\n    */\n`;
                                }
                                if (vocabularyTermInfo[vocabularyTermKey + '@Core.Description']) {
                                    vocabularyDef += `	/**\n	${
                                        vocabularyTermInfo[vocabularyTermKey + '@Core.LongDescription']
                                    }\n    */\n`;
                                }

                                vocabularyDef += `	${vocabularyTermKey} = "${vocabularyAlias}.${vocabularyTerm}/${vocabularyTermKey}"`;
                                hasPreviousEnum = true;
                            }
                        });
                        vocabularyDef += '\n';
                        vocabularyDef += `}\n`;
                        break;

                    default:
                        if (Array.isArray(vocabularyTermInfo)) {
                            vocabularyTermInfo.forEach((vocabularyTermDetail: Action | Function) => {
                                vocabularyDef += getDescription(vocabularyTermDetail);
                                vocabularyDef += `export type ${vocabularyTerm} = (`;
                                if (vocabularyTermDetail.$Parameter) {
                                    vocabularyTermDetail.$Parameter.forEach((parameterDetail, index: number) => {
                                        if (index > 0) {
                                            vocabularyDef += ', ';
                                        }
                                        vocabularyDef += `${parameterDetail.$Name}`;
                                        if (parameterDetail.$Type) {
                                            vocabularyDef += `: ${parameterDetail.$Type}`;
                                        } else {
                                            vocabularyDef += `: any`;
                                        }
                                    });
                                }
                                vocabularyDef += `) => `;
                                if (vocabularyTermDetail.$ReturnType) {
                                    vocabularyDef += `${vocabularyTermDetail.$ReturnType.$Type}`;
                                } else {
                                    vocabularyDef += `void`;
                                }
                            });
                        } else {
                            console.log('Unsupported Type ' + JSON.stringify(vocabularyTermInfo));
                        }
                        break;
                }
            }
        });
        vocabularyDef += '\n';
        vocabularyDef += `export const enum ${vocabularyAlias}AnnotationTerms {\n`;
        Object.keys(vocabularyTerms).forEach((termName) => {
            vocabularyDef += `    ${termName} = "${vocabularyNamespace}.${termName}",\n`;
        });
        vocabularyDef += '}';

        vocabularyDef += '\n';
        vocabularyDef += `export const enum ${vocabularyAlias}AnnotationTypes {\n`;
        Object.keys(vocabularyTypes).forEach((typeName) => {
            vocabularyDef += `    ${typeName} = "${vocabularyTypes[typeName]}",\n`;
        });
        Object.keys(vocabularyTerms).forEach((termName) => {
            const targetType = unalias(references, (vocabularyDefinition[termName] as Term).$Type);

            if (targetType) {
                allTermsToTypes[`${vocabularyNamespace}.${termName}`] = targetType;
            }
        });
        vocabularyDef += '}\n';
        vocabularyDef += '\n';
        vocabularyDef += '\n';
        vocabularyDef += '\n';
        Object.keys(typeInheritances).forEach((baseType) => {
            let localVocDefinition = vocabularyDefinition;
            const originalBaseType = baseType;
            if (baseType.indexOf('.') !== -1) {
                const [baseVoc, basebaseType] = baseType.split('.');
                localVocDefinition = allVocabularies[baseVoc].content[allVocabularies[baseVoc].namespace];
                baseType = basebaseType;
            }
            if (!(localVocDefinition[baseType] as ComplexType).$Abstract) {
                vocabularyDef += `export type ${baseType}Types = ${originalBaseType}`;
                if (typeInheritances[originalBaseType].length > 0) {
                    vocabularyDef += ` | ${typeInheritances[originalBaseType]
                        .map((type: string) => type + 'Types')
                        .join(' | ')}`;
                }
                vocabularyDef += ';\n';
            } else if (typeInheritances[originalBaseType].length > 0) {
                vocabularyDef += `export type ${originalBaseType}Types = ${typeInheritances[originalBaseType]
                    .map((type: string) => type + 'Types')
                    .join(' | ')}`;
                vocabularyDef += ';\n';
            }
        });
        vocabularyEdmDef = `import * as ${vocabularyNamespaceTrans} from "./${vocabularyAlias}";\n\n`;

        Object.keys(compositesAnnotations).forEach((targetKey) => {
            let compositeTarget = `\n// Type containing all possible annotations to use for ${targetKey}\nexport interface ${targetKey}Annotations_${vocabularyAlias} {`;
            compositeTarget += compositesAnnotations[targetKey].join('');
            compositeTarget += `\n}`;

            compositeTarget += '\n';

            // compositeTarget += `\n// Type containing all possible annotations to use for ${targetKey}\n    export interface ${targetKey}Annotations {`;
            // compositeTarget += `\n    ${vocabularyAlias}?: ${targetKey}Annotations_${vocabularyAlias}`;
            // compositeTarget += `\n}`;

            vocabularyEdmDef += '\n';
            vocabularyEdmDef += compositeTarget;
        });

        await writeFile(path.join(targetFolder, `${vocabularyAlias}.ts`), vocabularyDef);
        await writeFile(path.join(targetFolder, `${vocabularyAlias}_Edm.ts`), vocabularyEdmDef);
    }

    let edmTypesValue = ``;
    Object.keys(allVocabularies).map((vocabularyAlias) => {
        edmTypesValue += `import * as ${vocabularyAlias} from "./${vocabularyAlias}_Edm";\n`;
    });
    edmTypesValue += '\n';
    ANNOTATION_TARGETS.forEach((annotationTarget) => {
        edmTypesValue += `export type ${annotationTarget}Annotations = {\n`;
        Object.keys(allVocabularies).map((vocabularyAlias) => {
            edmTypesValue += `    ${vocabularyAlias}?: ${vocabularyAlias}.${annotationTarget}Annotations_${vocabularyAlias};\n`;
        });

        edmTypesValue += `}\n;`;
    });

    let edmTermToTypes = '';

    edmTermToTypes += `export enum TermToTypes {\n`;
    Object.keys(allTermsToTypes).forEach((termName) => {
        edmTermToTypes += `    "${termName}" = "${allTermsToTypes[termName]}",\n`;
    });
    edmTermToTypes += '}';

    await writeFile(path.join(targetFolder, `Edm_Types.ts`), edmTypesValue);
    await writeFile(path.join(targetFolder, `TermToTypes.ts`), edmTermToTypes);
}

generateTypes(path.join(__dirname, '../src/vocabularies'))
    .then(() => {
        console.log('File generated successfully');
    })
    .catch((e) => {
        console.error('Error while generating vocabularies', e);
    });
