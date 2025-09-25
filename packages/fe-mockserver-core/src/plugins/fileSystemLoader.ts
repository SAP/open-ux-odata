import { access, accessSync, readFile, readFileSync } from 'graceful-fs';
import { promisify } from 'util';
import type { IFileLoader } from '../index';
const readFileP = promisify(readFile);
const accessP = promisify(access);

export default class FileSystemLoader implements IFileLoader {
    private isTSLoaded = false;
    constructor(private readonly tsConfigPath?: string) {}
    async loadFile(filePath: string): Promise<string> {
        return readFileP(filePath, 'utf-8');
    }
    isTypescriptEnabled(): boolean {
        let isTSNodeThere;
        try {
            require.resolve('ts-node');
            // Checking CDS_TYPESCRIPT to let CAP do their things
            isTSNodeThere = process.env.CDS_TYPESCRIPT !== 'tsx';
        } catch (e) {
            isTSNodeThere = false;
        }
        if (isTSNodeThere && !this.isTSLoaded) {
            let options = {};
            if (this.tsConfigPath) {
                options = { project: this.tsConfigPath };
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('ts-node').register(options);
            this.isTSLoaded = true;
            return true;
        }
        return this.isTSLoaded;
    }
    async exists(filePath: string): Promise<boolean> {
        try {
            await accessP(filePath);
            return true;
        } catch {
            return false;
        }
    }
    syncSupported(): boolean {
        return true;
    }

    existsSync(filePath: string): boolean {
        try {
            accessSync(filePath);
            return true;
        } catch {
            return false;
        }
    }

    loadFileSync(filePath: string): string {
        return readFileSync(filePath, 'utf-8');
    }

    async loadJS(filePath: string): Promise<any> {
        delete require.cache[filePath];
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        let requireResult = require(filePath);
        if (requireResult.default) {
            requireResult = requireResult.default;
        }
        return Promise.resolve(requireResult);
    }
}
