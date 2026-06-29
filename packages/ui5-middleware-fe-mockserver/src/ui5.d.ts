declare module '@ui5/server' {
    import type { ReaderCollection } from '@ui5/fs';

    export interface MiddlewareUtils {
        getProject(): {
            getRootPath(): string;
            getSourcePath(): string;
            getName(): string;
            getNamespace(): string;
        };
    }

    export interface MiddlewareParameters<C> {
        resources: {
            all: ReaderCollection;
            dependencies: ReaderCollection;
            rootProject: ReaderCollection;
        };
        options: {
            configuration?: C;
        };
        middlewareUtil: MiddlewareUtils;
    }
}

declare module '@ui5/fs' {
    export class Resource {
        getPath(): string;
        getBuffer(): Promise<Buffer>;
        getString(): Promise<string>;
        getName(): string;
    }

    export class ReaderCollection {
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;
        byPath(virPattern: string | string[], options?: object): Promise<Resource>;
    }
}
