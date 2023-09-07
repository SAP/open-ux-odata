/* eslint-disable */

/*
 * Temporary workaround for supporting the native fetch implementation.
 * Taken over from https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924#issuecomment-1707342243
 */

declare namespace NodeJS {
    namespace undici {
        type Request = typeof globalThis extends { onmessage: any } ? {} : import('undici').Request;
        type Response = typeof globalThis extends { onmessage: any } ? {} : import('undici').Response;
        type File = typeof globalThis extends { onmessage: any } ? {} : import('undici').File;
        type FormData = typeof globalThis extends { onmessage: any } ? {} : import('undici').FormData;
        type Headers = typeof globalThis extends { onmessage: any } ? {} : import('undici').Headers;
    }
}

declare function fetch(input: import('undici').RequestInfo, init?: import('undici').RequestInit): Promise<Response>;

interface Request extends NodeJS.undici.Request {}
declare var Request: typeof globalThis extends {
    onmessage: any;
    Request: infer T;
}
    ? T
    : typeof import('undici').Request;

interface Response extends NodeJS.undici.Response {}
declare var Response: typeof globalThis extends {
    onmessage: any;
    Response: infer T;
}
    ? T
    : typeof import('undici').Response;

declare var File: typeof globalThis extends {
    onmessage: any;
    File: infer T;
}
    ? T
    : typeof import('undici').File;
interface File extends NodeJS.undici.File {}

declare var FormData: typeof globalThis extends {
    onmessage: any;
    FormData: infer T;
}
    ? T
    : typeof import('undici').FormData;
interface FormData extends NodeJS.undici.FormData {}

declare var Headers: typeof globalThis extends {
    onmessage: any;
    Headers: infer T;
}
    ? T
    : typeof import('undici').Headers;
interface Headers extends NodeJS.undici.Headers {}
