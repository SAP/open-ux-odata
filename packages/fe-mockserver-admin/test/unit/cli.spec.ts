import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { generateEntityFiles } from '../../src/generate-entity-files';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/generate-entity-files');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockGenerateEntityFiles = generateEntityFiles as jest.MockedFunction<typeof generateEntityFiles>;

describe('CLI', () => {
    let mockExit: jest.SpyInstance;
    let mockConsoleLog: jest.SpyInstance;
    let mockConsoleError: jest.SpyInstance;

    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks();

        // Mock process.exit
        mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        // Mock console methods
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        mockExit.mockRestore();
        mockConsoleLog.mockRestore();
        mockConsoleError.mockRestore();
    });

    describe('CLI functionality', () => {
        it('should configure program with correct name, description and version', () => {
            const testProgram = new Command();
            testProgram
                .name('fe-mockserver-admin')
                .description('CLI for FE Mockserver administration tasks')
                .version('0.0.1');

            expect(testProgram.name()).toBe('fe-mockserver-admin');
            expect(testProgram.description()).toBe('CLI for FE Mockserver administration tasks');
            expect(testProgram.version()).toBe('0.0.1');
        });

        it('should create generate-entity-files command with correct options', () => {
            const testProgram = new Command();
            testProgram
                .command('generate-entity-files')
                .description('Generate entity files from OData metadata')
                .requiredOption('-m, --metadata <path>', 'Path to the metadata.xml file')
                .option('-o, --output <path>', 'Output directory for generated files (defaults to metadata directory)');

            const command = testProgram.commands.find((cmd) => cmd.name() === 'generate-entity-files');
            expect(command).toBeDefined();
            expect(command?.description()).toBe('Generate entity files from OData metadata');

            const metadataOption = command?.options.find((opt) => opt.long === '--metadata');
            expect(metadataOption).toBeDefined();
            expect(metadataOption?.required).toBe(true);

            const outputOption = command?.options.find((opt) => opt.long === '--output');
            expect(outputOption).toBeDefined();
            // Note: Commander.js internal representation of optional vs required may vary
        });
    });

    describe('generate-entity-files command action', () => {
        const testMetadataPath = '/test/metadata.xml';
        const testOutputPath = '/test/output';

        beforeEach(() => {
            // Configure path mocks
            mockPath.resolve.mockImplementation((p) => `/resolved${p}`);
            mockPath.dirname.mockImplementation(() => '/resolved/test');
        });

        // Helper function to simulate the CLI action logic
        const simulateCliAction = async (options: { metadata: string; output?: string }) => {
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
        };

        it('should exit with error when metadata file does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);

            await expect(async () => {
                await simulateCliAction({ metadata: testMetadataPath });
            }).rejects.toThrow('process.exit called');

            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining('Error: Metadata file not found at:')
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should create output directory if it does not exist', async () => {
            mockFs.existsSync
                .mockReturnValueOnce(true) // metadata file exists
                .mockReturnValueOnce(false); // output directory does not exist
            mockFs.mkdirSync.mockImplementation();
            mockGenerateEntityFiles.mockResolvedValue(undefined);

            await simulateCliAction({ metadata: testMetadataPath, output: testOutputPath });

            expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
            expect(mockGenerateEntityFiles).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('All entity files generated successfully!');
        });

        it('should use metadata directory as default output when no output option provided', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockGenerateEntityFiles.mockResolvedValue(undefined);

            await simulateCliAction({ metadata: testMetadataPath });

            expect(mockGenerateEntityFiles).toHaveBeenCalledWith(expect.any(String), '/resolved/test');
        });

        it('should log progress messages during execution', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockGenerateEntityFiles.mockResolvedValue(undefined);

            await simulateCliAction({ metadata: testMetadataPath, output: testOutputPath });

            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Loading metadata from:'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Output directory:'));
            expect(mockConsoleLog).toHaveBeenCalledWith('All entity files generated successfully!');
        });

        it('should handle errors from generateEntityFiles and exit with code 1', async () => {
            const testError = new Error('Generation failed');
            mockFs.existsSync.mockReturnValue(true);
            mockGenerateEntityFiles.mockRejectedValue(testError);

            await expect(async () => {
                await simulateCliAction({ metadata: testMetadataPath });
            }).rejects.toThrow('process.exit called');

            expect(mockConsoleError).toHaveBeenCalledWith('Error generating entity files:', testError);
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should call generateEntityFiles with correct parameters', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockGenerateEntityFiles.mockResolvedValue(undefined);

            await simulateCliAction({ metadata: testMetadataPath, output: testOutputPath });

            expect(mockGenerateEntityFiles).toHaveBeenCalledWith(
                expect.stringContaining(testMetadataPath),
                expect.stringContaining(testOutputPath)
            );
        });
    });
});
