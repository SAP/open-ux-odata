#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { generateEntityFiles } from './generate-entity-files';

const program = new Command();

program.name('fe-mockserver-admin').description('CLI for FE Mockserver administration tasks').version('0.0.2');

program
    .command('generate-types')
    .description('Generate TypeScript types from OData metadata')
    .requiredOption('-m, --metadata <path>', 'Path to the metadata.xml file')
    .option('-o, --output <path>', 'Output directory for generated types (defaults to metadata directory)')
    .action(async (options) => {
        try {
            const metadataPath = path.resolve(options.metadata);
            const outputDir = options.output ? path.resolve(options.output) : path.dirname(metadataPath);

            // Validate metadata file exists

            if (!fs.existsSync(metadataPath)) {
                console.error(`Error: Metadata file not found at: ${metadataPath}`);
                process.exit(1);
            }

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            console.log(`Loading metadata from: ${metadataPath}`);
            console.log(`Output directory: ${outputDir}`);

            const { generateTypes } = await import('./generate-types');
            await generateTypes(metadataPath, outputDir);
        } catch (error) {
            console.error('Error generating types:', error);
            process.exit(1);
        }
    });

program
    .command('generate-entity-files')
    .description('Generate entity files from OData metadata')
    .requiredOption('-m, --metadata <path>', 'Path to the metadata.xml file')
    .option('-o, --output <path>', 'Output directory for generated files (defaults to metadata directory)')
    .action(async (options) => {
        try {
            const metadataPath = path.resolve(options.metadata);
            const outputDir = options.output ? path.resolve(options.output) : path.dirname(metadataPath);

            // Validate metadata file exists
            if (!fs.existsSync(metadataPath)) {
                console.error(`Error: Metadata file not found at: ${metadataPath}`);
                process.exit(1);
            }

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            console.log(`Loading metadata from: ${metadataPath}`);
            console.log(`Output directory: ${outputDir}`);

            await generateEntityFiles(metadataPath, outputDir);

            console.log('All entity files generated successfully!');
        } catch (error) {
            console.error('Error generating entity files:', error);
            process.exit(1);
        }
    });

// Parse arguments and execute
program.parse();
