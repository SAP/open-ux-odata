import * as path from 'path';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';

describe('Filesystem Loader', () => {
    const myFSLoader = new FileSystemLoader();
    it('can load json / text files', async () => {
        const jsonData = await myFSLoader.loadFile(path.join(__dirname, 'fixtures', 'myFile.json'));
        expect(jsonData).toMatchSnapshot();
    });
    it('can load js files', async () => {
        const jsonData = await myFSLoader.loadJS(path.join(__dirname, 'fixtures', 'myFile.js'));
        expect(jsonData.getData()).toMatchSnapshot();
    });
    it('can check file exists', async () => {
        let doesExist = await myFSLoader.exists(path.join(__dirname, 'fixtures', 'myFile.json'));
        expect(doesExist).toBe(true);
        doesExist = await myFSLoader.exists(path.join(__dirname, 'fixtures', 'notAtRealFile.json'));
        expect(doesExist).toBe(false);
    });
});
