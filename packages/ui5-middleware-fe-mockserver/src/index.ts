import type { ServerConfig } from '@sap-ux/fe-mockserver-core';
import FEMockserver, {
    MockDataContributorClass,
    MockEntityContainerContributorClass
} from '@sap-ux/fe-mockserver-core';
import type { MiddlewareParameters } from '@ui5/server';
import * as path from 'node:path';
import type { IRouter } from 'router';
import { resolveConfig } from './configResolver';
export type {
    Action,
    KeyDefinitions,
    MockDataContributor,
    MockEntityContainerContributor,
    NavigationProperty,
    ODataRequest,
    PartialReferentialConstraint,
    ServiceRegistry
} from '@sap-ux/fe-mockserver-core';

async function FEMiddleware({
    resources,
    options,
    middlewareUtil
}: MiddlewareParameters<ServerConfig>): Promise<IRouter> {
    let basePath = middlewareUtil?.getProject?.()?.getSourcePath();
    if (basePath) {
        basePath = path.resolve(basePath, '..');
    } else {
        // Fallback for older @ui5/cli versions that don't provide middlewareUtil.getProject()
        basePath = (resources?.rootProject as any)?._readers?.[0]?._fsBasePath;
        if (basePath) {
            basePath = path.resolve(basePath, '..');
        } else {
            basePath = (resources?.rootProject as any)?._readers?.[1]?._project?._modulePath ?? '';
        }
    }
    const mockserverInstance = new FEMockserver(resolveConfig(options.configuration ?? {}, basePath));
    await mockserverInstance.isReady;
    return mockserverInstance.getRouter();
}
FEMiddleware.MockDataContributorClass = MockDataContributorClass;
FEMiddleware.MockEntityContainerContributorClass = MockEntityContainerContributorClass;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export = FEMiddleware;
