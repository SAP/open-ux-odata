import { getLogger } from '@ui5/logger';
import { raw } from 'body-parser';
import type { IncomingMessage } from 'connect';
import type { NextFunction } from 'express';
import type { ServerResponse } from 'http';
import type { IRouter } from 'router';
import Router from 'router';
import { URL } from 'url';
import type { ServiceConfigEx } from '../api';
import type { DataAccess } from '../data/dataAccess';
import ODataRequest from '../request/odataRequest';
import { batchRouter } from './batchRouter';

export type IncomingMessageWithTenant = IncomingMessage & {
    tenantId?: string;
};

/**
 * Checks if a CSRF Token is requested and adds it to the header if so
 *
 * UI5 may user both methods HEAD or GET with the service document url to fetch
 * the token.
 *
 * @param _req IncomingMessage
 * @param res ServerResponse
 */
const addCSRFTokenIfRequested = (_req: IncomingMessage, res: ServerResponse) => {
    if (_req.headers['X-CSRF-Token'.toLowerCase()] === 'Fetch') {
        res.setHeader('X-CSRF-Token', '0504-71383');
    }
};

/**
 * Small middleware to disable the cache on the queries for the mockserver.
 *
 * @param _req
 * @param res
 * @param next
 */
function disableCache(_req: IncomingMessage, res: ServerResponse, next: NextFunction): void {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Expires', '-1');
    res.setHeader('Pragma', 'no-cache');
    next();
}

/**
 * Creates the sub router containing the odata protocol processing.
 *
 * @param service
 * @param dataAccess
 * @returns the sub router specific to that odata query
 */
export async function serviceRouter(service: ServiceConfigEx, dataAccess: DataAccess): Promise<IRouter> {
    const router = new Router();
    const log = getLogger('server:ux-fe-mockserver');
    router.use(disableCache);
    router.head('/', (_req: IncomingMessage, res: ServerResponse, next) => {
        addCSRFTokenIfRequested(_req, res); //HEAD use case
        next();
    });

    // Deal with the $metadata support
    router.get('/$metadata', (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/xml');
        if (service.ETag) {
            res.setHeader('ETag', service.ETag);
        }

        res.write(dataAccess.getMetadata().getEdmx());
        res.end();
    });
    router.post('/$metadata/reload', (_req: IncomingMessage, res: ServerResponse) => {
        dataAccess.reloadData();
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({ message: 'Reload success' }));
        res.end();
    });
    router.get('/', (_req: IncomingMessage, res: ServerResponse) => {
        const allEntitySets = dataAccess.getMetadata().getEntitySets();
        const parsedUrl = new URL(`http://dummy${_req.url}`);
        let data: string;
        if (parsedUrl.searchParams.get('$format') === 'json') {
            if (dataAccess.isV4()) {
                data = JSON.stringify({
                    '@odata.context': '$metadata',
                    '@odata.metadataEtag': service.ETag,
                    value: allEntitySets.map((entitySet) => {
                        return {
                            name: entitySet.name,
                            kind: entitySet._type,
                            url: entitySet.name
                        };
                    })
                });
            } else {
                data = JSON.stringify({
                    d: { EntitySets: allEntitySets.map((entitySet) => entitySet.name) }
                });
            }
            res.setHeader('content-type', 'application/json');
        } else {
            data = `<?xml version="1.0" encoding="utf-8"?>
            <app:service xml:lang="en" xml:base="${service.urlPath}/"
                xmlns:app="http://www.w3.org/2007/app"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
                xmlns:sap="http://www.sap.com/Protocols/SAPData">
                <app:workspace>
                ${allEntitySets
                    .map(
                        (entitySet) =>
                            `<atom:collection href="${entitySet.name}"><atom:title type="text">${entitySet.name}</atom:title><sap:member-title>${entitySet.entityTypeName}</sap:member-title></atom:collection>`
                    )
                    .join('')}
                </app:workspace>
                <atom:link rel="self" href="${service.urlPath}/"/>
                <atom:link rel="latest-version" href="${service.urlPath}/"/>
            </app:service>`;
            res.setHeader('Content-Type', 'application/xml');
        }

        addCSRFTokenIfRequested(_req, res); //GET use case
        res.write(data);
        res.end();
    });
    // Standard processing for the incoming message
    router.use((req: IncomingMessageWithTenant, res, next) => {
        const parser = raw({ type: '*/*' });
        const tenantId = req.originalUrl?.startsWith('/tenant-') ? req.originalUrl?.split('/')[1] : 'tenant-default';
        req.tenantId = tenantId;
        const sapClient = req.originalUrl?.includes('sap-client');
        if (sapClient) {
            const parsedUrl = new URL(`http://dummy${req.originalUrl}`);
            req.tenantId = `tenant-${parsedUrl.searchParams.get('sap-client')}`;
        }
        parser(req, res, function () {
            if (
                (req as any).body === null ||
                (typeof (req as any).body === 'object' && Object.keys((req as any).body).length === 0)
            ) {
                (req as any).body = '{}';
            } else {
                (req as any).body = (req as any).body.toString('utf-8');
            }

            if (
                req.headers['content-type'] &&
                (req as any).body &&
                req.headers['content-type'].indexOf('application/json') !== -1
            ) {
                (req as any).body = JSON.parse((req as any).body);
            }
            next();
        });
    });

    router.use('/\\$batch', batchRouter(dataAccess));

    router.route('/*all').all(async (req: IncomingMessageWithTenant, res: ServerResponse, next: NextFunction) => {
        try {
            const oDataRequest = new ODataRequest(
                {
                    url: req.url!,
                    tenantId: req.tenantId!,
                    body: (req as any).body,
                    headers: req.headers,
                    method: req.method!
                },
                dataAccess
            );
            await oDataRequest.handleRequest();
            const responseData = oDataRequest.getResponseData();
            res.statusCode = oDataRequest.statusCode;
            for (const responseHeader in oDataRequest.responseHeaders) {
                const value = oDataRequest.responseHeaders[responseHeader];
                if (value) {
                    res.setHeader(responseHeader, value);
                }
            }
            for (const responseHeader in oDataRequest.globalResponseHeaders) {
                const value = oDataRequest.globalResponseHeaders[responseHeader];
                if (value) {
                    res.setHeader(responseHeader, value);
                }
            }
            if (responseData) {
                res.write(responseData);
            }
            res.end();
        } catch (e) {
            next(e);
        }
    });

    router.use('*all', (err: any, _req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
        log.error(err);
        if (res.headersSent) {
            return next(err);
        } else {
            res.statusCode = err.statusCode ?? 500;
            res.write(err.message);
            res.end();
        }
    });

    return router;
}
