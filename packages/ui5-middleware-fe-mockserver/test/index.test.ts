import FEMiddleware = require('../src');

describe('The middleware', () => {
    it('can create middleware', async () => {
        const myMiddleware = await FEMiddleware({ options: { configuration: {} } });
        expect(myMiddleware).toBeDefined();
    });
});
