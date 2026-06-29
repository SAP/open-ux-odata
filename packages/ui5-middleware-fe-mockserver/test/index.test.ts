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

const mockResourcesWithReader0 = {
    all: {} as any,
    dependencies: {} as any,
    rootProject: {
        _readers: [{ _fsBasePath: __dirname }]
    } as any
};

const mockResourcesWithReader1 = {
    all: {} as any,
    dependencies: {} as any,
    rootProject: {
        _readers: [undefined, { _project: { _modulePath: __dirname } }]
    } as any
};

const noMiddlewareUtil = undefined as any;

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
    it('falls back to _readers[0]._fsBasePath when middlewareUtil is unavailable', async () => {
        const myMiddleware = await FEMiddleware({
            resources: mockResourcesWithReader0,
            options: { configuration: {} },
            middlewareUtil: noMiddlewareUtil
        });
        expect(myMiddleware).toBeDefined();
    });
    it('falls back to _readers[1]._project._modulePath when _readers[0] has no _fsBasePath', async () => {
        const myMiddleware = await FEMiddleware({
            resources: mockResourcesWithReader1,
            options: { configuration: {} },
            middlewareUtil: noMiddlewareUtil
        });
        expect(myMiddleware).toBeDefined();
    });
    it('uses empty string as basePath when no path source is available', async () => {
        const myMiddleware = await FEMiddleware({
            resources: mockResources,
            options: { configuration: {} },
            middlewareUtil: noMiddlewareUtil
        });
        expect(myMiddleware).toBeDefined();
    });
});
