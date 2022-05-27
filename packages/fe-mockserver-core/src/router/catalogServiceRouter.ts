import type { ServiceConfigEx } from '../api';
import type { IRouter } from 'router';
import Router from 'router';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Create a service mocking the catalog service from the ABAP backend.
 *
 * @param servicesConfig the service configuration.
 * @param version the version of the services
 * @returns a sub router
 */
export function catalogServiceRouter(servicesConfig: ServiceConfigEx[], version = 2): IRouter {
    const router: IRouter = new Router();

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
