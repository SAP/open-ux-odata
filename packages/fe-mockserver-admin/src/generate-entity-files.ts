import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type {
    Action,
    ConvertedMetadata,
    EntitySet,
    EntityType,
    NavigationProperty,
    RawMetadata
} from '@sap-ux/vocabularies-types';
import * as fs from 'fs';
import * as path from 'path';

export async function generateEntityFiles(METADATA_PATH: string, OUTPUT_DIR: string) {
    try {
        console.log('Loading metadata.xml...');
        const metadataContent = fs.readFileSync(METADATA_PATH, 'utf8');

        console.log('Parsing EDMX...');
        const parsedMetadata: RawMetadata = parse(metadataContent);

        console.log('Converting metadata with annotation converter...');
        const convertedMetadata: ConvertedMetadata = convert(parsedMetadata);

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

async function generateEntityContainerFile(convertedMetadata: ConvertedMetadata, OUTPUT_DIR: string): Promise<void> {
    const actions = convertedMetadata.actionImports;
    if (actions.length > 0) {
        const actionSwitchCase = actions
            .map((action) => {
                return `case '${action.name}':
            break; // TODO: Implement ${action.name} action`;
            })
            .join('\n');

        const mockEntityContainer = `import type {MockEntityContainerContributor, ODataRequest, Action} from "@sap-ux/ui5-middleware-fe-mockserver";


const EntityContainer: MockEntityContainerContributor = {
    async executeAction(actionDefinition: Action, _actionData: any, _keys: Record<string, unknown>, _odataRequest: ODataRequest): Promise<unknown> {
        switch(actionDefinition.name) {
            ${actionSwitchCase}
            // Implement action handlers here
            default:
                return undefined; // No custom action handler, proceed with default handling
        }
    }
}
export default EntityContainer;`;
        const outputPath = path.join(OUTPUT_DIR, `EntityContainer.ts`);
        fs.writeFileSync(outputPath, mockEntityContainer);
    }
}

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
            (!prop.partner ||
                prop.targetType.navigationProperties.by_name(prop.partner)?.referentialConstraint.length === 0)
    );

    // Generate TypeScript interface for the entity
    const entityInterface = generateEntityInterface(entityType);
    const entityNavPropNamesInterface = generateEntityNavPropNamesInterface(entityType);
    const entityNavPropTypesInterface = generateEntityNavPropTypesInterface(entityType);
    const entityActionParams = generateEntityActionParams(entitySet, actions);
    // Generate action switch cases
    const actionSwitchCases = generateActionSwitchCases(actions);
    let executeActionMethod = '';
    if (Object.keys(actions).length > 0) {
        executeActionMethod = `async executeAction(actionDefinition: Action, actionData: ${actionDataName}, _keys: ${keyName}, _odataRequest: ODataRequest): Promise<object | undefined> {
        switch(actionData._type) {
${actionSwitchCases}
            default:
                console.warn(\`Unhandled action: \${actionDefinition.name}\`);
                return undefined;
        }
    }`;
    }

    // Generate getReferentialConstraints method
    const getReferentialConstraintsMethod = generateGetReferentialConstraintsMethod(entityNavPropsWithoutConstraints);
    const allMethods = [];
    if (executeActionMethod.length) {
        allMethods.push(executeActionMethod);
    }
    if (getReferentialConstraintsMethod.length) {
        allMethods.push(getReferentialConstraintsMethod);
    }
    const fileContent = `import type { MockDataContributor, ODataRequest, Action, NavigationProperty, ReferentialConstraint } from "@sap-ux/ui5-middleware-fe-mockserver"
${entityNavPropTypesInterface}
${entityNavPropNamesInterface}
${entityInterface}
${entityActionParams}


const ${entitySet.name}: MockDataContributor<${entitySet.entityTypeName.split('.').pop()}Type> = {
    ${allMethods.join(',')}
}

export default ${entitySet.name};
`;

    //if(allMethods.length > 0) {
    const outputPath = path.join(OUTPUT_DIR, `${entitySet.name}.ts`);
    fs.writeFileSync(outputPath, fileContent);
    console.log(`Generated: ${outputPath}`);
    //} else {
    //   console.log(`No method to generate for ${entitySet.name}, skipping file creation.`);
    //}
}

function generateEntityNavPropNamesInterface(entityType: EntityType): string {
    const typeName = entityType.name.split('.').pop() + 'NavPropNames';

    const properties: string[] = [];

    for (const prop of entityType.navigationProperties) {
        if (prop.name !== 'DraftAdministrativeData') {
            properties.push(`"${prop.name}"`);
        }
    }
    if (!entityType || !entityType.navigationProperties || properties.length === 0) {
        return `export type ${typeName} = {
    // Navigation properties not available in metadata
}`;
    }
    return `export type ${typeName} = ${properties.join(' | ')};`;
}
function generateEntityNavPropTypesInterface(entityType: EntityType): string {
    const currentType = entityType.name.split('.').pop() + 'Type';
    const typeName = entityType.name.split('.').pop() + 'NavPropTypes';
    const importStatements: Set<string> = new Set();
    if (!entityType || !entityType.navigationProperties) {
        return `export type ${typeName} = {
    // Navigation properties not available in metadata
}`;
    }

    const properties: string[] = [];

    for (const prop of entityType.navigationProperties) {
        const targetTypeName = prop.targetType.name.split('.').pop() + 'Type';
        if (targetTypeName !== 'DraftAdministrativeDataType' && targetTypeName !== currentType) {
            importStatements.add(
                `import type { ${targetTypeName} } from "./${prop.targetType.name.split('.').pop()}";`
            );
        }
        if (targetTypeName !== 'DraftAdministrativeDataType') {
            if (prop.isCollection) {
                properties.push(`${prop.name}: ${targetTypeName}[];`);
            } else {
                properties.push(`${prop.name}: ${targetTypeName};`);
            }
        }
    }

    return `${Array.from(importStatements).join('\n')}
export type ${typeName} = {
${properties.join('\n')}
}`;
}
function generateEntityInterface(entityType: EntityType): string {
    const typeName = entityType.name.split('.').pop() + 'Type';
    const keyName = entityType.name.split('.').pop() + 'Keys';

    if (!entityType || !entityType.keys) {
        return `export type ${typeName} = {
    // Entity type definition not available in metadata
};
export type ${keyName} = {
    // Entity type definition not available in metadata
};`;
    }

    const keys: string[] = [];
    const properties: string[] = [];

    // Add key properties
    if (entityType.keys) {
        for (const key of entityType.keys) {
            const prop = entityType.entityProperties.by_name(key.name);
            if (prop) {
                const tsType = mapODataTypeToTypeScript(prop.type);
                const nullable = prop.nullable ? '?' : '';
                properties.push(`    ${key.name}${nullable}: ${tsType};`);
                keys.push(`    ${key.name}${nullable}: ${tsType};`);
            }
        }
    }

    // Add other entity properties
    if (entityType.entityProperties) {
        for (const prop of entityType.entityProperties) {
            if (!entityType.keys?.some((k: any) => k.name === prop.name)) {
                const tsType = mapODataTypeToTypeScript((prop as any).type);
                const nullable = (prop as any).nullable ? '?' : '';
                properties.push(`    ${prop.name}${nullable}: ${tsType};`);
            }
        }
    }

    return `export type ${typeName} = {
${properties.join('\n')}
};

export type ${keyName} = {
${keys.join('\n')}
};`;
}

function mapODataTypeToTypeScript(odataType: string): string {
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

    return typeMap[odataType] || 'any';
}

function generateEntityActionParams(entitySet: EntitySet, actions: Record<string, Action>): string {
    if (Object.keys(actions).length === 0) {
        return '';
    }

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
            if (action.parameters && action.parameters.length > 0) {
                const params = action.parameters
                    .map((param) => {
                        let tsType = mapODataTypeToTypeScript(param.type);
                        if (tsType === 'any' && param.type === entitySet.entityTypeName) {
                            tsType = entitySet.entityTypeName.split('.').pop() + 'Type';
                        }
                        const optional = param.nullable ? '?' : '';
                        return `    ${param.name}${optional}: ${tsType};`;
                    })
                    .join('\n');
                return `    | {\n    _type: '${action.name}';\n${params}\n}`;
            }
        })
        .join('\n');

    return `export type ${entitySet.entityType.name}ActionData =\n${actionParams};`;
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
                // TODO: Implement ${actions[actionName].name} action
                console.log('Executing action: ${actions[actionName].name}');
                return {};`
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
    getReferentialConstraints: (navigationProperty: NavigationProperty):ReferentialConstraint[] | undefined =>  {
        // Navigation properties without referential constraints:
        switch(navigationProperty.name) {
             ${allPotentialCases}
             default:
                return navigationProperty.referentialConstraint;
        }
    }`;
}
