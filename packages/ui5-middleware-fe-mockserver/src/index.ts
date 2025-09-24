import type { ServerConfig } from '@sap-ux/fe-mockserver-core';
import FEMockserver from '@sap-ux/fe-mockserver-core';
import * as path from 'path';
import type { IRouter } from 'router';
import { resolveConfig } from './configResolver';
export type {
    Action,
    MockDataContributor,
    MockEntityContainerContributor,
    NavigationProperty,
    ODataRequest,
    PartialReferentialConstraint,
    ServiceRegistry
} from '@sap-ux/fe-mockserver-core';

async function FEMiddleware(middlewareConfig: {
    resources?: any;
    options: {
        configuration: ServerConfig;
    };
}): Promise<IRouter> {
    // basepath will be the webapp folder so we have to go up a level to retrieve the config
    let basePath = middlewareConfig?.resources?.rootProject?._readers[0]?._fsBasePath;
    if (basePath) {
        basePath = path.resolve(middlewareConfig.resources.rootProject._readers[0]._fsBasePath, '..');
    } else {
        basePath = middlewareConfig?.resources?.rootProject?._readers[1]?._project?._modulePath ?? '';
    }
    const mockserverInstance = new FEMockserver(resolveConfig(middlewareConfig.options.configuration, basePath));
    await mockserverInstance.isReady;
    return mockserverInstance.getRouter();
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export = FEMiddleware;
