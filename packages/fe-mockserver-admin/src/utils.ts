import { compileSources, compileSync, to } from '@sap/cds-compiler';
import fs from 'fs';
import path from 'path';
import { commonCds } from './CommonCds';

/**
 * Compile CDS source to EDMX metadata.
 * @param filePathOrContent - File path to CDS file, or CDS content string if mode is 'inline'
 * @param targetModeOrInline - EDMX format ('flat' | 'structured') or 'inline' for inline CDS content
 * @returns EDMX metadata string
 */
export const compileCDS = function (
    filePathOrContent: string,
    targetModeOrInline: 'flat' | 'structured' | 'inline' = 'flat'
): string | undefined {
    // Handle inline CDS content (for tests with embedded CDS)
    if (targetModeOrInline === 'inline') {
        const csn = compileSources({ 'string.cds': filePathOrContent, 'common.cds': commonCds }, {});
        const targetEdmx = to.edmx.all(csn, {
            odataVersion: 'v4',
            odataFormat: 'flat',
            odataForeignKeys: true,
            odataContainment: false
        });
        return targetEdmx[Object.keys(targetEdmx)[0]!];
    }

    // Handle file-based compilation
    const filePath = filePathOrContent;
    const targetMode = targetModeOrInline;

    const cdsContent = fs.readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.xml')) {
        return cdsContent;
    }
    const usingReg = new RegExp(/from '([^']+)/g);
    const matches = cdsContent.match(usingReg);
    const fileCache: Record<string, string> = {};
    fileCache[filePath] = cdsContent;
    fileCache[path.resolve('./dummyHomme/common.cds')] = commonCds;
    fileCache['@sap/cds/common'] = commonCds;
    if (matches) {
        let additionalFiles: string[] = matches.map((match) => /from '([^']+)/.exec(match)![1]) as string[];
        additionalFiles = additionalFiles.filter((fileName) => fileName !== '@sap/cds/common');

        for (const additionalFilesKey of additionalFiles) {
            let additionalFilePath = path.resolve(path.dirname(filePath), additionalFilesKey);
            if (!additionalFilePath.endsWith('.cds')) {
                additionalFilePath += '.cds';
            }
            fileCache[additionalFilePath] = fs.readFileSync(additionalFilePath, 'utf-8');
        }
    }

    const dirName = path.dirname(filePath);
    const csn = compileSync([filePath], dirName, { cdsHome: path.resolve('./dummyHomme') }, fileCache);

    const targetEdmx = to.edmx.all(csn, {
        odataVersion: 'v4',
        odataFormat: targetMode,
        odataForeignKeys: true,
        odataContainment: false
    });

    if (Object.keys(targetEdmx).length > 1) {
        throw new Error(
            `Compilation failed, you can only define one service, found ${Object.keys(targetEdmx).length.toString()}`
        );
    }
    return targetEdmx[Object.keys(targetEdmx)[0]!];
};
