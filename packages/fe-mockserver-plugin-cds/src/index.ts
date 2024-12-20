export interface IFileLoader {
    loadFile(filePath: string): Promise<string>;
    exists(filePath: string): Promise<boolean>;
    loadJS(filePath: string): Promise<any>;
}
export interface IMetadataProcessor {
    loadMetadata(filePath: string): Promise<string>;
}
import { compileSync, to } from '@sap/cds-compiler';
import path from 'path';
import { commonCDS } from './common.cds';
import { commonI18n } from './common.i18n';

export type CDSMetadataProviderOptions = {
    odataVersion?: 'v2' | 'v4';
    odataFormat?: 'structured' | 'flat';
};

/**
 * Metadata Processor class dedicated to handling cds source files.
 */
export default class CDSMetadataProvider implements IMetadataProcessor {
    /**
     * Constructor for the CDSMetadataProvider.
     *
     * @param fileLoader the file loader injected by the mockserver
     * @param options a set of options for the plugin
     * @param i18nPath a list of paths to look for i18n files
     */
    constructor(
        private fileLoader: IFileLoader,
        private options?: CDSMetadataProviderOptions,
        private i18nPath?: string[]
    ) {}

    async loadI18nMapFolder(targetFolder: string, i18nMap: Record<string, string>): Promise<void> {
        if (await this.fileLoader.exists(targetFolder)) {
            const i18nProp = await this.fileLoader.loadFile(path.resolve(targetFolder, 'i18n.properties'));
            const i18nPropLines = i18nProp.split('\n');
            for (const line of i18nPropLines) {
                const [key, value] = line.trim().split(/[=](.*)/s);
                i18nMap[key] = value;
            }
        }
    }

    addI18nPath(i18nPath?: string[]): void {
        if (!this.i18nPath) {
            this.i18nPath = [];
        }
        this.i18nPath = this.i18nPath.concat(i18nPath ?? []);
    }

    async loadI18nMap(dirName: string): Promise<Record<string, string>> {
        const i18nMap = { ...commonI18n };
        if (await this.fileLoader.exists(path.resolve(dirName, './i18n'))) {
            await this.loadI18nMapFolder(path.resolve(dirName, './i18n'), i18nMap);
        }
        if (await this.fileLoader.exists(path.resolve(dirName, './_i18n'))) {
            await this.loadI18nMapFolder(path.resolve(dirName, './_i18n'), i18nMap);
        }
        if (await this.fileLoader.exists(path.resolve(dirName, '../_i18n'))) {
            await this.loadI18nMapFolder(path.resolve(dirName, '../_i18n'), i18nMap);
        }
        let i18nPaths: string[] = this.i18nPath as string[];
        i18nPaths ??= [];
        for (const i18nPath of i18nPaths) {
            if (await this.fileLoader.exists(path.resolve(dirName, i18nPath))) {
                await this.loadI18nMapFolder(path.resolve(dirName, i18nPath), i18nMap);
            }
        }
        return i18nMap;
    }
    /**
     * Load the metadata file (cds or xml) and process it accordingly.
     *
     * @param filePath The location of the file
     * @returns a promise with the EDMX content
     */
    async loadMetadata(filePath: string): Promise<string> {
        const cdsContent = await this.fileLoader.loadFile(filePath);
        if (filePath.endsWith('.xml')) {
            return cdsContent;
        }
        const usingReg = new RegExp(/from '([^']+)/g);
        const matches = cdsContent.match(usingReg);
        const fileCache: Record<string, string> = {};
        fileCache[filePath] = cdsContent;
        fileCache[path.resolve('./dummyHomme/common.cds')] = commonCDS;
        fileCache['@sap/cds/common'] = commonCDS;
        if (matches) {
            let additionalFiles: string[] = matches.map((match) => /from '([^']+)/.exec(match)![1]);
            additionalFiles = additionalFiles.filter((fileName) => fileName !== '@sap/cds/common');

            for (const additionalFilesKey of additionalFiles) {
                let additionalFilePath = path.resolve(path.dirname(filePath), additionalFilesKey);
                if (!additionalFilePath.endsWith('.cds')) {
                    additionalFilePath += '.cds';
                }
                fileCache[additionalFilePath] = await this.fileLoader.loadFile(additionalFilePath);
            }
        }

        const dirName = path.dirname(filePath);
        const csn = compileSync([filePath], dirName, { cdsHome: path.resolve('./dummyHomme') }, fileCache);
        const i18nMap = await this.loadI18nMap(dirName);

        const odataVersion = this.options?.odataVersion ?? 'v4';
        const odataFormat = odataVersion === 'v4' && this.options?.odataFormat ? this.options.odataFormat : 'flat';

        const edmx = to.edmx.all(csn, {
            odataVersion,
            odataFormat,
            odataForeignKeys: true,
            odataContainment: false
        });

        if (Object.keys(edmx).length > 1) {
            throw new Error(`Compilation failed, you can only define one service, found ${Object.keys(edmx).length}`);
        }
        let targetEdmx = edmx[Object.keys(edmx)[0]];
        targetEdmx = targetEdmx.replaceAll(/\{i18n>([^}]+)\}/g, (match, subMatch) => {
            return i18nMap[subMatch] ?? subMatch;
        });
        return targetEdmx;
    }
}
