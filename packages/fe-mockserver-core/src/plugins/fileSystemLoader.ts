import { access, accessSync, readFile, readFileSync } from 'graceful-fs';
import { promisify } from 'util';
import type { IFileLoader } from '../index';
const readFileP = promisify(readFile);
const accessP = promisify(access);

export default class FileSystemLoader implements IFileLoader {
    async loadFile(filePath: string): Promise<string> {
        return readFileP(filePath, 'utf-8');
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
        return Promise.resolve(require(filePath));
    }
}
