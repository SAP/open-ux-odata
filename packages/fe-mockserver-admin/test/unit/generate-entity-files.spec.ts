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
        expect(rootEntityContent).toMatchSnapshot();

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
            expect(entityContainerContent).toMatchSnapshot();
        } else {
            console.log('No EntityContainer.ts generated (no action imports in metadata)');
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
