import type { IncomingMessage, ServerResponse } from 'http';
import type { IRouter } from 'router';
import Router from 'router';
import { URL } from 'url';
import type { ServiceConfigEx } from '../api';

/**
 * Create a service mocking the catalog service from the ABAP backend.
 *
 * @param servicesConfig the service configuration.
 * @param version the version of the services
 * @returns a sub router
 */
export function catalogServiceRouter(servicesConfig: ServiceConfigEx[], version = 2): IRouter {
    const router: IRouter = new Router();

    router.get('/', (_req: IncomingMessage, res: ServerResponse) => {
        const parsedUrl = new URL(`http://dummy${_req.url}`);
        let data: string;
        const serviceUrlPath = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2';
        const allEntitySets = [
            'Annotations',
            'Vocabularies',
            'ServiceCollection',
            'ServiceNames',
            'TagCollection',
            'EntitySetCollection',
            'CatalogCollection',
            'RecommendedServiceCollection',
            'ScopedServiceCollection'
        ];
        if (parsedUrl.searchParams.get('$format') === 'json') {
            data = JSON.stringify({
                d: { EntitySets: allEntitySets.map((entitySet) => entitySet) }
            });
            res.setHeader('content-type', 'application/json');
        } else {
            data = `<?xml version="1.0" encoding="utf-8"?>
            <app:service xml:lang="en" xml:base="${serviceUrlPath}/"
                xmlns:app="http://www.w3.org/2007/app"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
                xmlns:sap="http://www.sap.com/Protocols/SAPData">
                <app:workspace>
                ${allEntitySets
                    .map(
                        (entitySet) =>
                            `<atom:collection href="${entitySet}"><atom:title type="text">${entitySet}</atom:title></atom:collection>`
                    )
                    .join('')}
                </app:workspace>
                <atom:link rel="self" href="${serviceUrlPath}/"/>
                <atom:link rel="latest-version" href="${serviceUrlPath}/"/>
            </app:service>`;
            res.setHeader('Content-Type', 'application/xml');
        }

        res.write(data);
        res.end();
    });
    router.get('/ServiceCollection', (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('content-type', 'application/json');
        res.write(
            JSON.stringify({
                d: {
                    results: servicesConfig.map((serviceConfig) => {
                        return {
                            ID: serviceConfig._internalName
                        };
                    })
                }
            })
        );
        res.end();
    });

    router.get('/ServiceCollection\\(*', (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('content-type', 'application/json');
        res.write(
            JSON.stringify({
                d: {
                    results: servicesConfig.map((serviceConfig) => {
                        return {
                            TechnicalName: serviceConfig._internalName,
                            Version: version
                        };
                    })
                }
            })
        );
        res.end();
    });

    return router;
}
