import * as fs from 'fs';
import * as path from 'path';
import { generateEntityFiles } from '../../src/generate-entity-files';

describe('generate-entity-files with real metadata', () => {
    const testDataDir = path.join(__dirname, '__testData');
    const metadataPath = path.join(testDataDir, 'metadata.xml');
    const outputDir = path.join(testDataDir, 'generated');

    beforeAll(() => {
        // Clean up generated files
        if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            for (const file of files) {
                fs.unlinkSync(path.join(outputDir, file));
            }
            fs.rmdirSync(outputDir);
        }
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up generated files
        if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            for (const file of files) {
                fs.unlinkSync(path.join(outputDir, file));
            }
            fs.rmdirSync(outputDir);
        }
    });

    it('should generate entity files from real metadata.xml', async () => {
        // Verify metadata file exists
        expect(fs.existsSync(metadataPath)).toBe(true);

        // Generate entity files
        await generateEntityFiles(metadataPath, outputDir);

        // Check that files were generated
        const generatedFiles = fs.readdirSync(outputDir);
        expect(generatedFiles.length).toBeGreaterThan(0);

        // Should generate RootEntity.ts based on the metadata
        const rootEntityFile = path.join(outputDir, 'RootEntity.ts');
        expect(fs.existsSync(rootEntityFile)).toBe(true);

        // Read and validate the generated RootEntity.ts content
        const rootEntityContent = fs.readFileSync(rootEntityFile, 'utf8');

        // Check for expected TypeScript interfaces and types
        expect(rootEntityContent).toContain('export type RootEntityType');
        expect(rootEntityContent).toContain('export type RootEntityKeys');
        expect(rootEntityContent).toContain('ID: number;');
        expect(rootEntityContent).toContain('name?: string;');
        expect(rootEntityContent).toContain('description?: string;');
        expect(rootEntityContent).toContain('IsActiveEntity: boolean;');
        expect(rootEntityContent).toContain('HasActiveEntity: boolean;');
        expect(rootEntityContent).toContain('HasDraftEntity: boolean;');

        // Check for navigation property types
        expect(rootEntityContent).toContain('export type RootEntityNavPropNames');
        expect(rootEntityContent).toContain('export type RootEntityNavPropTypes');
        expect(rootEntityContent).toContain('"SiblingEntity"');

        // Check for action types (should exclude draft actions)
        expect(rootEntityContent).toContain('export type RootEntityActionData');
        expect(rootEntityContent).toContain("_type: 'myCustomAction'");

        // Should NOT contain draft actions in action data
        expect(rootEntityContent).not.toContain('draftEdit');
        expect(rootEntityContent).not.toContain('draftActivate');
        expect(rootEntityContent).not.toContain('draftPrepare');

        // Check for MockDataContributor implementation
        expect(rootEntityContent).toContain('const RootEntity: MockDataContributor<RootEntityType>');
        expect(rootEntityContent).toContain('executeAction');
        expect(rootEntityContent).toContain("case 'myCustomAction':");
        expect(rootEntityContent).toContain('export default RootEntity;');

        // Log the generated content for manual inspection
        console.log('Generated RootEntity.ts content:');
        console.log('='.repeat(50));
        console.log(rootEntityContent);
        console.log('='.repeat(50));
    });

    it('should generate EntityContainer.ts if action imports exist', async () => {
        // Generate entity files
        await generateEntityFiles(metadataPath, outputDir);

        // Check if EntityContainer.ts was generated (depends on metadata having action imports)
        const entityContainerFile = path.join(outputDir, 'EntityContainer.ts');

        if (fs.existsSync(entityContainerFile)) {
            const entityContainerContent = fs.readFileSync(entityContainerFile, 'utf8');
            expect(entityContainerContent).toContain('MockEntityContainerContributor');
            expect(entityContainerContent).toContain('executeAction');
            expect(entityContainerContent).toContain('export default EntityContainer;');

            console.log('Generated EntityContainer.ts content:');
            console.log('='.repeat(50));
            console.log(entityContainerContent);
            console.log('='.repeat(50));
        } else {
            console.log('No EntityContainer.ts generated (no action imports in metadata)');
        }
    });

    it('should handle navigation properties correctly', async () => {
        await generateEntityFiles(metadataPath, outputDir);

        const rootEntityFile = path.join(outputDir, 'RootEntity.ts');
        const rootEntityContent = fs.readFileSync(rootEntityFile, 'utf8');

        // Should include SiblingEntity navigation but exclude DraftAdministrativeData
        expect(rootEntityContent).toContain('SiblingEntity: RootEntityType;');
        expect(rootEntityContent).not.toContain('DraftAdministrativeData');

        // Should include getReferentialConstraints method if there are nav props without constraints
        if (rootEntityContent.includes('getReferentialConstraints')) {
            expect(rootEntityContent).toContain("case 'SiblingEntity':");
            expect(rootEntityContent).toContain('// TODO add the missing referential constraints');
        }
    });

    it('should validate metadata parsing and conversion', async () => {
        // This test validates the parsing process
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');

        // Basic validation that metadata contains expected elements
        expect(metadataContent).toContain('EntitySet Name="RootEntity"');
        expect(metadataContent).toContain('EntityType Name="RootEntity"');
        expect(metadataContent).toContain('Action Name="myCustomAction"');
        expect(metadataContent).toContain('NavigationProperty Name="SiblingEntity"');

        // Generate files and verify no errors
        await expect(generateEntityFiles(metadataPath, outputDir)).resolves.not.toThrow();
    });
});
