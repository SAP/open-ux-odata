import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';

const readFile = util.promisify(fs.readFile);
const FIXTURE_DIR = 'fixtures';

export function fileExist(name: string): boolean {
    return fs.existsSync(path.join(__dirname, FIXTURE_DIR, name));
}

export async function loadFixture(name: string): Promise<string> {
    return (await readFile(path.join(__dirname, FIXTURE_DIR, name))).toString('utf-8');
}
