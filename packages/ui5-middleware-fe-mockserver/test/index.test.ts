import FEMiddleware = require('../src');

describe('The middleware', () => {
    it('can create middleware', async () => {
        const myMiddleware = await FEMiddleware({ options: { configuration: {} } });
        expect(myMiddleware).toBeDefined();
    });
    it('can create middleware with a custom logic', async () => {
        const logFn = jest.fn();
        const myMiddleware = await FEMiddleware({
            options: {
                configuration: {
                    logger: {
                        info(message: string) {
                            return logFn(message);
                        },
                        error(message: string | Error) {}
                    }
                }
            }
        });
        expect(myMiddleware).toBeDefined();
        expect(logFn).toHaveBeenCalled();
    });
});
