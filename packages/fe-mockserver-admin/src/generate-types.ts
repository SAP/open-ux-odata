import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type {
    ComplexType,
    ConvertedMetadata,
    EntityType,
    RawMetadata,
    TypeDefinition
} from '@sap-ux/vocabularies-types';

import fs from 'fs';
import { compileCDS } from './utils';

// Helper to build lookup maps for types
function buildTypeMaps(metadata: ConvertedMetadata) {
    const entityTypeMap = new Map<string, any>();
    const complexTypeMap = new Map<string, any>();
    const typeDefMap = new Map<string, any>();

    for (const et of metadata.entityTypes) {
        entityTypeMap.set(et.fullyQualifiedName || et.name, et);
    }
    for (const ct of metadata.complexTypes) {
        complexTypeMap.set(ct.fullyQualifiedName || ct.name, ct);
    }
    for (const td of metadata.typeDefinitions) {
        typeDefMap.set(td.fullyQualifiedName || td.name, td);
    }
    return { entityTypeMap, complexTypeMap, typeDefMap };
}

// Enhanced mapping function to handle complex types and typeDefs
function mapEdmTypeToTsType(
    edmType: string,
    typeMaps: { entityTypeMap: Map<string, any>; complexTypeMap: Map<string, any>; typeDefMap: Map<string, any> }
): string {
    // Handle collection types
    const collectionMatch = edmType.match(/^Collection\((.+)\)$/);
    if (collectionMatch) {
        const innerType = mapEdmTypeToTsType(collectionMatch[1], typeMaps);
        return `${innerType}[]`;
    }

    // Primitive EDM types
    switch (edmType) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Boolean':
            return 'boolean';
        case 'Edm.Int32':
        case 'Edm.Int16':
        case 'Edm.Int64':
        case 'Edm.Decimal':
        case 'Edm.Double':
        case 'Edm.Single':
        case 'Edm.Byte':
        case 'Edm.SByte':
            return 'number';
        case 'Edm.DateTimeOffset':
        case 'Edm.Date':
        case 'Edm.TimeOfDay':
            return 'string';
        case 'Edm.Guid':
        case 'Edm.Binary':
            return 'string';
    }

    // Complex types
    if (typeMaps.complexTypeMap.has(edmType)) {
        return typeMaps.complexTypeMap.get(edmType).name;
    }
    // Type definitions
    if (typeMaps.typeDefMap.has(edmType)) {
        return typeMaps.typeDefMap.get(edmType).name;
    }
    // Entity types (rare for property, but possible for navigation)
    if (typeMaps.entityTypeMap.has(edmType)) {
        return typeMaps.entityTypeMap.get(edmType).name;
    }

    // Fallback: strip namespace if present
    return edmType.split('.').pop() || edmType;
}

// Generate TypeScript type for an entity type and its keys
function generateEntityType(entityType: EntityType, typeMaps: any): string {
    let result = `export type ${entityType.name} = {\n`;
    for (const prop of entityType.entityProperties) {
        const tsType = mapEdmTypeToTsType(prop.type, typeMaps);
        result += `  ${prop.name}${prop.nullable ? '?' : ''}: ${tsType};\n`;
    }

    // Include navigation properties (wrapped with NavPropTo<...>)
    if (entityType.navigationProperties && entityType.navigationProperties.length > 0) {
        for (const nav of entityType.navigationProperties) {
            // Resolve target entity type name
            let targetName: string;
            if ((nav as any).targetType && (nav as any).targetType.name) {
                targetName = (nav as any).targetType.name;
            } else {
                const fqn = (nav as any).targetTypeName || (nav as any).targetType?.fullyQualifiedName || '';
                const et = typeMaps.entityTypeMap.get(fqn) || typeMaps.entityTypeMap.get((fqn || '').toString());
                targetName = et?.name || (fqn ? fqn.split('.').pop() : 'any');
            }

            const navInnerType = nav.isCollection ? `${targetName}[]` : targetName;
            // Navigation properties are typically optional in generated types
            result += `  ${nav.name}?: NavPropTo<${navInnerType}>;\n`;
        }
    }

    result += '}\n';

    result += `export type ${entityType.name}Keys = {\n`;
    for (const prop of entityType.keys) {
        const tsType = mapEdmTypeToTsType(prop.type, typeMaps);
        result += `  ${prop.name}${prop.nullable ? '?' : ''}: ${tsType};\n`;
    }
    result += '}\n';

    return result;
}

// Generate TypeScript type for a complex type
function generateComplexType(complexType: ComplexType, typeMaps: any): string {
    let result = `export type ${complexType.name} = {\n`;
    for (const prop of complexType.properties) {
        const tsType = mapEdmTypeToTsType(prop.type, typeMaps);
        result += `  ${prop.name}${prop.nullable ? '?' : ''}: ${tsType};\n`;
    }
    result += '}\n';
    return result;
}

// Generate TypeScript type alias for a type definition
function generateTypeDefinition(typeDefinition: TypeDefinition, typeMaps: any): string {
    const tsType = mapEdmTypeToTsType(typeDefinition.underlyingType, typeMaps);
    return `export type ${typeDefinition.name} = ${tsType};\n`;
}

export async function generateTypes(METADATA_PATH: string, OUTPUT_DIR: string) {
    try {
        console.log('Loading metadata.xml...');
        let metadataContent = fs.readFileSync(METADATA_PATH, 'utf8');

        if (METADATA_PATH.endsWith('.cds')) {
            metadataContent = compileCDS(metadataContent);
        }

        console.log('Parsing EDMX...');
        const parsedMetadata: RawMetadata = parse(metadataContent);

        console.log('Converting metadata with annotation converter...');
        const convertedMetadata: ConvertedMetadata = convert(parsedMetadata);

        // Build type maps for reference resolution
        const typeMaps = buildTypeMaps(convertedMetadata);

        let typeDefinitions = 'export type NavPropTo<T> = T;\n\n';
        // Generate TS files for each entity set
        typeDefinitions += '// ====== Entity Types ======\n\n';
        for (const entityType of convertedMetadata.entityTypes) {
            console.log(`Generating TS file for ${entityType.name}...`);
            typeDefinitions += '// Type definitions for ' + entityType.name + '\n';
            typeDefinitions += generateEntityType(entityType, typeMaps);
            typeDefinitions += '\n';
        }

        if (convertedMetadata.complexTypes.length > 0) {
            typeDefinitions += '// ====== Complex Types ======\n\n';
            for (const complexType of convertedMetadata.complexTypes) {
                console.log(`Generating TS file for ${complexType.name}...`);
                typeDefinitions += '// Type definitions for ' + complexType.name + '\n';
                typeDefinitions += generateComplexType(complexType, typeMaps);
                typeDefinitions += '\n';
            }
        }

        if (convertedMetadata.typeDefinitions.length > 0) {
            typeDefinitions += '// ====== Type Definition ===\n\n';
            for (const typeDefinition of convertedMetadata.typeDefinitions) {
                console.log(`Generating TS file for ${typeDefinition.name}...`);
                typeDefinitions += '// Type definitions for ' + typeDefinition.name + '\n';
                typeDefinitions += generateTypeDefinition(typeDefinition, typeMaps);
                typeDefinitions += '\n';
            }
        }

        const outputPath = `${OUTPUT_DIR}/ODataTypes.d.ts`;
        fs.writeFileSync(outputPath, typeDefinitions, 'utf8');
        console.log(`Type definitions written to ${outputPath}`);
    } catch (error) {
        console.error('Error generating entity files:', error);
        process.exit(1);
    }
}
