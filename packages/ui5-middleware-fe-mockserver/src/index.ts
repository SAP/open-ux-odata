import * as path from 'path';
import FEMockserver from '@sap-ux/fe-mockserver-core';
import { resolveConfig } from './configResolver';
import type { IRouter } from 'router';

async function FEMiddleware(middlewareConfig: any): Promise<IRouter> {
    // basepath will be the webapp folder so we have to go up a level to retrieve the config
    const basePath = middlewareConfig.resources
        ? path.resolve(middlewareConfig.resources.rootProject._readers[0]._fsBasePath, '..')
        : '';
    const mockserverInstance = new FEMockserver(resolveConfig(middlewareConfig.options.configuration, basePath));
    await mockserverInstance.isReady;
    return mockserverInstance.getRouter();
}

export = FEMiddleware;
