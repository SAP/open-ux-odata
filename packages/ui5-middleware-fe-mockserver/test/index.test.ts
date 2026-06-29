import FEMiddleware = require('../src');

const mockMiddlewareUtil = {
    getProject: () => ({
        getRootPath: () => __dirname,
        getSourcePath: () => __dirname,
        getName: () => 'test',
        getNamespace: () => 'test'
    })
};

const mockResources = {
    all: {} as any,
    dependencies: {} as any,
    rootProject: {} as any
};

describe('The middleware', () => {
    it('can create middleware', async () => {
        const myMiddleware = await FEMiddleware({
            resources: mockResources,
            options: { configuration: {} },
            middlewareUtil: mockMiddlewareUtil
        });
        expect(myMiddleware).toBeDefined();
    });
    it('can create middleware with a custom logic', async () => {
        const logFn = jest.fn();
        const myMiddleware = await FEMiddleware({
            resources: mockResources,
            options: {
                configuration: {
                    logger: {
                        info(message: string) {
                            return logFn(message);
                        },
                        error(message: string | Error): void {
                            // do nothing
                        }
                    }
                }
            },
            middlewareUtil: mockMiddlewareUtil
        });
        expect(myMiddleware).toBeDefined();
        expect(logFn).toHaveBeenCalled();
    });
});
