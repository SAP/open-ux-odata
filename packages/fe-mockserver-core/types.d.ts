declare module 'router' {
    import type { IncomingMessage, HandleFunction, NextFunction, NextHandleFunction } from 'connect';
    import type { ServerResponse } from 'http';

    export type Path = string | RegExp | Array<string | RegExp>;

    export namespace Router {
        export interface RouteType {
            new (path: string): Route;
            prototype: Route;
        }

        type Method = 'all' | 'head' | 'get' | 'post' | 'delete' | 'put' | 'patch' | 'options';

        export type Route = { readonly path: Path } & Record<
            Method,
            (middleware: NextHandleFunction, ...middlewares: NextHandleFunction[]) => Route
        >;

        export interface Options {
            caseSensitive?: boolean;
            strict?: boolean;
            mergeParams?: <C extends {}, P extends {}>(
                currentParams: C,
                parentParams: P
            ) => Record<string | number, any>;
        }

        export type ParamCallback<K = string | number> = (
            req: IncomingMessage,
            res: ServerResponse,
            next: NextFunction,
            value: any,
            name: K
        ) => any;

        interface InnerRouter extends NextHandleFunction {
            route(path: Path): Route;
            param: <K extends string | number>(name: K, fn: ParamCallback<K>) => this;
        }

        export type IRouter = InnerRouter &
            Record<
                'use' | Method,
                {
                    (path: Path, middleware: NextHandleFunction, ...middlewares: NextHandleFunction[]): Router;
                    (middleware: NextHandleFunction, ...middlewares: NextHandleFunction[]): Router;
                    (path: Path, middleware: HandleFunction, ...middlewares: NextHandleFunction[]): Router;
                }
            >;

        interface Router extends IRouter {
            new (options?: Options): IRouter;
            (options?: Options): Router;
            Route: RouteType;
            prototype: Router;
        }
    }

    export type IRouter = Router.IRouter;
    const Router: Router.Router;
    export default Router;
}
declare module '@ui5/logger' {
    type ILogger = {
        info(message: string): void;
        error(message: string | Error): void;
    };
    export function getLogger(loggerName: string): ILogger;
}
