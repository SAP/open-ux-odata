import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type {
    Action,
    ComplexType,
    ConvertedMetadata,
    EntitySet,
    EntityType,
    NavigationProperty,
    RawMetadata,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import * as fs from 'fs';
import * as path from 'path';
import { generateTypes } from './generate-types';

/**
 *
 * @param METADATA_PATH
 * @param OUTPUT_DIR
 */
export async function generateEntityFiles(METADATA_PATH: string, OUTPUT_DIR: string) {
    try {
        console.log('Loading metadata.xml...');
        const metadataContent = fs.readFileSync(METADATA_PATH, 'utf8');

        console.log('Parsing EDMX...');
        const parsedMetadata: RawMetadata = parse(metadataContent);

        console.log('Converting metadata with annotation converter...');
        const convertedMetadata: ConvertedMetadata = convert(parsedMetadata);

        await generateTypes(METADATA_PATH, OUTPUT_DIR);
        // Generate TS files for each entity set
        for (const entitySet of convertedMetadata.entitySets) {
            console.log(`Generating TS file for ${entitySet.name}...`);
            await generateEntityFile(entitySet, convertedMetadata, OUTPUT_DIR);
        }

        await generateEntityContainerFile(convertedMetadata, OUTPUT_DIR);

        console.log('All entity files generated successfully!');
    } catch (error) {
        console.error('Error generating entity files:', error);
        process.exit(1);
    }
}

/**
 *
 * @param convertedMetadata
 * @param OUTPUT_DIR
 */
async function generateEntityContainerFile(convertedMetadata: ConvertedMetadata, OUTPUT_DIR: string): Promise<void> {
    const actions = convertedMetadata.actionImports;
    if (actions.length > 0) {
        const actionFunctionCase = actions
            .map((action) => {
                let returnType = 'unknown';
                const actionDataType = `EntityContainerAction_${action.name}Data`;
                if (action.action.returnType) {
                    returnType = mapODataTypeToTypeScript(action.action.returnType, action.action.returnTypeReference);
                }
                if (action.action.returnCollection) {
                    returnType += '[]';
                }
                return `    async ${action.name}(_actionDefinition: Action, _actionData: ${actionDataType}, _keys: KeyDefinitions, _odataRequest: ODataRequest): Promise<${returnType}> { 
                    throw new Error('${action.name} is not implemented');
                }`;
            })
            .join('\n');

        const actionSwitchCase = actions
            .map((action) => {
                return `case '${action.name}':
                    return this.${action.name}(actionDefinition, actionData, keys, odataRequest);`;
            })
            .join('\n');
        const importMap = new Set<string>();
        const entityActionParams = generateEntityActionParams(
            'EntityContainer',
            actions.reduce((acc, action) => {
                acc[action.name] = action.action;
                return acc;
            }, {} as Record<string, Action>),
            importMap
        );

        const outputPath = path.join(OUTPUT_DIR, `EntityContainer.ts`);
        const mockEntityContainer = `import type {ODataRequest, Action, KeyDefinitions} from "@sap-ux/ui5-middleware-fe-mockserver";
import {MockEntityContainerContributorClass} from "@sap-ux/ui5-middleware-fe-mockserver";
import type { ${Array.from(importMap).join(', ')}} from "./ODataTypes";
${entityActionParams}

export default class EntityContainer extends MockEntityContainerContributorClass {

     ${actionFunctionCase}

    async executeAction(actionDefinition: Action, actionData: EntityContainerActionData, keys: KeyDefinitions, odataRequest: ODataRequest): Promise<unknown> {
        switch(actionData._type) {
            ${actionSwitchCase}
            default:
                this.throwError(\`Action \${actionDefinition.name} not implemented\`, 501);
                return;
        }
    }
}`;
        fs.writeFileSync(outputPath, mockEntityContainer);
    }
}

/**
 *
 * @param entitySet
 * @param metadata
 * @param OUTPUT_DIR
 */
async function generateEntityFile(
    entitySet: EntitySet,
    metadata: ConvertedMetadata,
    OUTPUT_DIR: string
): Promise<void> {
    const entityType = entitySet.entityType;
    const keyName = entityType.name.split('.').pop() + 'Keys';
    const actionDataName = entityType.name.split('.').pop() + 'ActionData';
    // Get actions for this entity set
    const actions = entitySet.entityType.actions;

    // Get navigation properties without constraints for this entity set
    const entityNavPropsWithoutConstraints = entityType.navigationProperties.filter(
        (prop) =>
            prop.name !== 'DraftAdministrativeData' &&
            prop.name !== 'SiblingEntity' && // Exclude DraftAdministrativeData and SiblingEntity
            prop.referentialConstraint.length === 0 &&
            prop.annotations.Common?.ReferentialConstraint?.length === 0 &&
            (!prop.partner ||
                prop.targetType.navigationProperties.by_name(prop.partner)?.referentialConstraint.length === 0)
    );

    // Generate TypeScript interface for the entity
    const importMap = new Set<string>();
    importMap.add(entityType.name);
    importMap.add(entityType.name + 'Keys');
    const entityActionParams = generateEntityActionParams(entitySet.entityType.name, actions, importMap);
    // Generate action switch cases
    const actionFunctionCase = Object.keys(actions)
        .filter((actionName) => {
            return (
                !actionName.endsWith('draftEdit') &&
                !actionName.endsWith('draftActivate') &&
                !actionName.endsWith('draftPrepare') &&
                !actionName.endsWith('draftDiscard')
            );
        })
        .map((actionName) => {
            const action = actions[actionName];
            let returnType = 'unknown';
            const actionDataType = `${entitySet.entityType.name}Action_${action.name}Data`;
            if (action.returnType) {
                returnType = mapODataTypeToTypeScript(action.returnType, action.returnTypeReference);
            }
            if (action.returnCollection) {
                returnType += '[]';
            }
            return `    async ${action.name}(_actionDefinition: Action, _actionData: ${actionDataType}, _keys: ${keyName}, _odataRequest: ODataRequest): Promise<${returnType}> { 
                    throw new Error('${action.name} is not implemented');
                }`;
        })
        .join('\n');
    const actionSwitchCases = generateActionSwitchCases(actions);
    let executeActionMethod = '';
    if (entityActionParams.length > 0) {
        executeActionMethod = `async executeAction(actionDefinition: Action, actionData: ${actionDataName}, keys: ${keyName}, odataRequest: ODataRequest): Promise<object | undefined> {
        switch(actionData._type) {
${actionSwitchCases}
            default:
                this.throwError(\`Action \${actionDefinition.name} not implemented\`, 501);
                return;
        }
    }`;
    }

    // Generate getReferentialConstraints method
    const getReferentialConstraintsMethod = generateGetReferentialConstraintsMethod(entityNavPropsWithoutConstraints);
    const allMethods = [];
    if (actionFunctionCase.length) {
        allMethods.push(actionFunctionCase);
    }
    if (executeActionMethod.length) {
        allMethods.push(executeActionMethod);
    }
    if (getReferentialConstraintsMethod.length) {
        allMethods.push(getReferentialConstraintsMethod);
    }
    const fileContent = `import type { ODataRequest, Action, NavigationProperty, PartialReferentialConstraint } from "@sap-ux/ui5-middleware-fe-mockserver"
import { MockDataContributorClass } from "@sap-ux/ui5-middleware-fe-mockserver"
import type { ${Array.from(importMap).join(', ')}} from "./ODataTypes";
${entityActionParams}


export default class ${entitySet.name}Contributor extends MockDataContributorClass<${entitySet.entityTypeName
        .split('.')
        .pop()}> {
    ${allMethods.join('\n\n')}
}
`;

    //if(allMethods.length > 0) {
    const outputPath = path.join(OUTPUT_DIR, `${entitySet.name}.ts`);
    fs.writeFileSync(outputPath, fileContent);
    console.log(`Generated: ${outputPath}`);
    //} else {
    //   console.log(`No method to generate for ${entitySet.name}, skipping file creation.`);
    //}
}

function mapODataTypeToTypeScript(
    odataType: string,
    typeReference?: ComplexType | EntityType | TypeDefinition
): string {
    const typeMap: Record<string, string> = {
        'Edm.String': 'string',
        'Edm.Int32': 'number',
        'Edm.Int64': 'number',
        'Edm.Double': 'number',
        'Edm.Decimal': 'number',
        'Edm.Boolean': 'boolean',
        'Edm.DateTime': 'Date',
        'Edm.DateTimeOffset': 'Date',
        'Edm.Date': 'Date',
        'Edm.Time': 'Date',
        'Edm.Guid': 'string',
        'Edm.Binary': 'string'
    };

    return typeMap[odataType] || typeReference?.name || 'any';
}

function generateEntityActionParams(
    entityTypeName: string,
    actions: Record<string, Action>,
    importMap: Set<string>
): string {
    if (Object.keys(actions).length === 0) {
        return '';
    }
    const actionDataTypes: string[] = [];
    const actionParams = Object.keys(actions)
        .filter((actionName) => {
            return (
                !actionName.endsWith('draftEdit') &&
                !actionName.endsWith('draftActivate') &&
                !actionName.endsWith('draftPrepare') &&
                !actionName.endsWith('draftDiscard')
            );
        })
        .map((actionName) => {
            const action = actions[actionName];
            let actionReturnType = mapODataTypeToTypeScript(action.returnType);
            if (actionReturnType === 'any' && action.returnTypeReference) {
                actionReturnType = action.returnTypeReference.name;
                importMap.add(actionReturnType);
            }
            if (action.parameters && action.parameters.length > 0) {
                const params = action.parameters
                    .map((param) => {
                        let tsType = mapODataTypeToTypeScript(param.type);
                        if (tsType === 'any' && param.typeReference) {
                            tsType = param.typeReference.name;
                            importMap.add(tsType);
                        }
                        if (param.isCollection) {
                            tsType += '[]';
                        }
                        const optional = param.nullable ? '?' : '';
                        return `    ${param.name}${optional}: ${tsType};`;
                    })
                    .join('\n');
                const actionDataTypeName = `${entityTypeName}Action_${action.name}Data`;
                const actionDataType = `type ${actionDataTypeName} = {\n${params}\n}`;
                actionDataTypes.push(actionDataType);
                return `    | {\n    _type: '${action.name}';\n} & ${actionDataTypeName}`;
            } else {
                const actionDataTypeName = `${entityTypeName}Action_${action.name}Data`;
                const actionDataType = `type ${actionDataTypeName} = {\n}`;
                actionDataTypes.push(actionDataType);
                return `    | {\n    _type: '${action.name}';\n} `;
            }
        })
        .join('\n');

    if (actionParams.length > 0) {
        return `${actionDataTypes.join('\n')}\n;export type ${entityTypeName}ActionData =\n${actionParams};`;
    }
    return '';
}

function generateActionSwitchCases(actions: Record<string, Action>): string {
    return Object.keys(actions)
        .filter(
            (actionName) =>
                !actionName.endsWith('draftEdit') &&
                !actionName.endsWith('draftActivate') &&
                !actionName.endsWith('draftPrepare') &&
                !actionName.endsWith('draftDiscard')
        )
        .map(
            (actionName) => `            case '${actions[actionName].name}':
                  return this.${actions[actionName].name}(actionDefinition, actionData, keys, odataRequest);`
        )
        .join('\n');
}

function generateGetReferentialConstraintsMethod(navPropsWithoutConstraints: NavigationProperty[]): string {
    if (navPropsWithoutConstraints.length === 0) {
        return '';
    }

    const allPotentialCases = navPropsWithoutConstraints
        .map(
            (prop) =>
                `
            case '${prop.name}':  // Navigation to ${prop.targetTypeName}
                return []; // TODO add the missing referential constraints
            break;`
        )
        .join('\n');

    return `
    getReferentialConstraints: (navigationProperty: NavigationProperty):PartialReferentialConstraint[] | undefined =>  {
        // Navigation properties without referential constraints:
        switch(navigationProperty.name) {
             ${allPotentialCases}
             default:
                return this.base.getReferentialConstraint(navigationProperty);
        }
    }`;
}
