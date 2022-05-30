import fetch, { Headers } from 'node-fetch';
import type { BatchPart } from '../../../src/router/batchParser';
import { BatchContent, parseBatch } from '../../../src/router/batchParser';
import { isPartChangeSet } from '../../../src/router/batchRouter';

export type ExpandDefinitions = Record<string, ExpandDefinition>;
export type ExpandDefinition = {
    expand?: ExpandDefinition;
    select?: string[];
};

export type ODataKey = Record<string, string>;

/**
 *
 */
export abstract class ODataRequest<T> {
    /**
     * @param odataRootUri
     * @param targetPath
     */
    constructor(protected odataRootUri: string, protected targetPath: string) {}

    protected abstract buildUrl(relative?: boolean): string;
    protected abstract buildHeaders(): Headers;
    protected abstract getBody(): any;
    protected abstract buildBatchContent(boundary: string, changesetBoundary: string): string;

    protected abstract extractContent<T>(content: any): T;
    protected abstract extractBatchContent<T>(content: any, boundary: string): T;

    /**
     *
     */
    public async execute(method: string = 'GET'): Promise<T> {
        const body = this.getBody();
        let response;
        if (body) {
            response = await fetch(this.buildUrl(), { method: method, headers: this.buildHeaders(), body: body });
        } else {
            response = await fetch(this.buildUrl(), { method: method, headers: this.buildHeaders() });
        }

        const responseData = await response.text();
        try {
            const json = JSON.parse(responseData);
            return this.extractContent<T>(json);
        } catch (e) {
            return responseData as any;
        }
    }
    /**
     *
     */
    public async executeAsBatch(asChangeset: boolean = false): Promise<T> {
        const boundary = 'batch_id-1624000588304-308';
        let changesetBoundary = '';
        if (asChangeset) {
            changesetBoundary = 'changeset_5ac8-f85f-2a92';
        }
        const fetchContent = {
            method: 'POST',
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            headers: new Headers({
                'content-type': 'multipart/mixed; boundary=' + boundary,
                accept: 'multipart/mixed'
            }),
            body: this.buildBatchContent(boundary, changesetBoundary)
        };
        const response = await fetch(`${this.odataRootUri}/$batch`, fetchContent as any);
        const contentType = response.headers.get('content-type');
        const responseBoundary = contentType?.split('boundary=')[1];
        const responseData = await response.text();
        return this.extractBatchContent<T>(responseData, responseBoundary!);
    }
}
/**
 *
 */
export abstract class ODataRequestor {
    protected readonly headers: Headers = new Headers();

    /**
     * @param odataRootUri
     */
    constructor(protected odataRootUri: string) {
        if (odataRootUri.endsWith('/')) {
            this.odataRootUri = odataRootUri.substr(0, odataRootUri.length - 1);
        }
    }

    abstract getObject<T>(entityPath: string, objectKeys: ODataKey): ODataRequest<T>;

    abstract getList<T>(entityPath: string): ODataRequest<T>;

    /**
     * @param name
     * @param value
     */
    addHeader(name: string, value: string): void {
        this.headers.set(name, value);
    }

    /**
     * @param username
     * @param password
     */
    addBasicAuth(username: string, password: string): void {
        this.addHeader('Authorization', 'Basic ' + Buffer.from(username + ':' + password).toString('base64'));
    }

    /**
     * Fetch additional EDMX files
     *
     * @param path
     */
    public async fetchEDMX(path: string): Promise<string> {
        const res = await fetch(path, {
            headers: this.headers
        });
        const xmlText = await res.text();
        return xmlText;
    }

    /**
     *
     */
    public async fetchMetadata(): Promise<string> {
        return this.fetchEDMX(`${this.odataRootUri}/$metadata`);
    }
}

/**
 *
 */
export class ODataV4ListRequest<T> extends ODataRequest<T> {
    private filterDefinition: Record<string, string>;
    private selectDefinition: string[];
    private expandDefinition: ExpandDefinitions;
    private isInvalidBatch: boolean;

    /**
     * @param relative
     */
    protected buildUrl(relative: boolean): string {
        const baseUrl = `${!relative ? this.odataRootUri + '/' : ''}${this.targetPath}`;
        const urlParts = [];
        if (this.selectDefinition) {
            urlParts.push('$select=' + this.selectDefinition.join(','));
        }
        if (this.expandDefinition) {
            let expandDef = '$expand=';

            expandDef += Object.keys(this.expandDefinition)
                .map((expandName) => {
                    return `${expandName}($select=${this.expandDefinition[expandName].select?.join(',')})`;
                })
                .join(',');
            urlParts.push(expandDef);
        }
        if (this.filterDefinition) {
            let filterParts = '$filter=';
            Object.keys(this.filterDefinition).forEach((filterProp) => {
                filterParts += `${filterProp} eq '${this.filterDefinition[filterProp]}'`;
            });
            urlParts.push(filterParts);
        }
        return urlParts.length === 0 ? baseUrl : baseUrl + '?' + urlParts.join('&');
    }

    protected getBody(): any {
        return undefined;
    }

    protected buildHeaders(): Headers {
        return new Headers();
    }

    /**
     * @param boundary
     */
    protected buildBatchContent(boundary: string, changesetBoundary: string): string {
        const NL = '\n';
        let batchBody = `--${boundary}${NL}`;
        if (changesetBoundary) {
            batchBody += `Content-Type: multipart/mixed; boundary=${changesetBoundary}${NL}`;
            batchBody += NL;
            batchBody += `--${changesetBoundary}${NL}`;
        }
        batchBody += `Content-Type:application/http${NL}`;

        batchBody += `Content-Transfer-Encoding:binary${NL}`;
        batchBody += NL;
        batchBody += `GET ${this.buildUrl(true)}${NL}`;
        batchBody += `Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true${NL}`;
        batchBody += `Accept-Language:en${NL}`;
        batchBody += `Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true${NL}`;
        if (changesetBoundary) {
            batchBody += `--${changesetBoundary}--${NL}`;
        }
        batchBody += `--${boundary}--${NL}`;
        return batchBody;
    }

    /**
     * @param content
     */
    protected extractContent<T>(content: any): T {
        return content.value as T;
    }

    /**
     * @param content
     * @param boundary
     */
    protected extractBatchContent<T>(content: any, boundary: string): T {
        const batchResult = parseBatch(new BatchContent(content), boundary);
        if (isPartChangeSet(batchResult.parts[0])) {
            return (batchResult.parts[0].parts[0] as BatchPart).body.value as T;
        } else {
            return batchResult.parts[0].body.value as T;
        }
    }

    setInvalidBatch(isInvalid: boolean) {
        this.isInvalidBatch = isInvalid;
    }

    /**
     * @param filterDefinition
     */
    filter(filterDefinition: Record<string, string>) {
        this.filterDefinition = filterDefinition;
    }

    /**
     * @param selectProperties
     */
    select(selectProperties: string[]) {
        this.selectDefinition = selectProperties;
    }

    /**
     * @param expandDef
     */
    expand(expandDef: ExpandDefinitions) {
        this.expandDefinition = expandDef;
    }
}

/**
 *
 */
export class ODataV4ObjectRequest<T> extends ODataRequest<T> {
    protected technicalKeyDefinition: any[];
    private body: any;
    /**
     * @param odataRootUri
     * @param targetPath
     * @param objectKey
     */
    constructor(
        odataRootUri: string,
        targetPath: string,
        protected objectKey: ODataKey = {},
        protected method: string = 'GET',
        protected headers: Record<string, string> = {}
    ) {
        super(odataRootUri, targetPath);

        this.technicalKeyDefinition = [];
        objectKey &&
            Object.keys(objectKey).forEach((key) => {
                this.technicalKeyDefinition.push({
                    name: key,
                    type: ''
                });
            });
    }

    public setBody(bodyContent: any) {
        this.body = JSON.stringify(bodyContent);
        this.headers['Content-Type'] = 'application/json';
        return this;
    }
    protected getBody(): any {
        return this.body;
    }

    protected buildHeaders(): Headers {
        return new Headers(this.headers);
    }

    /**
     * @param relative
     */
    protected buildUrl(relative?: boolean): string {
        const keys: any[] = [];
        this.technicalKeyDefinition.forEach((keyDef) => {
            keys.push(`${keyDef.name}=${this.formatKeyValue(keyDef.type, this.objectKey[keyDef.name])}`);
        });
        let url;
        if (keys.length) {
            url = `${!relative ? this.odataRootUri + '/' : ''}${this.targetPath}(${keys.join(',')})`;
        } else {
            url = `${!relative ? this.odataRootUri + '/' : ''}${this.targetPath}`;
        }

        return url;
    }

    /**
     * @param boundary
     */
    protected buildBatchContent(boundary: string, changesetBoundary: string): string {
        const NL = '\n';
        let batchBody = `--${boundary}${NL}`;
        if (changesetBoundary) {
            batchBody += `Content-Type: multipart/mixed; boundary=${changesetBoundary}${NL}`;
            batchBody += NL;
            batchBody += `--${changesetBoundary}${NL}`;
        }

        batchBody += `Content-Type:application/http${NL}`;
        batchBody += `Content-Transfer-Encoding:binary${NL}`;
        batchBody += NL;
        batchBody += `${this.method} ${this.buildUrl(true)}${NL}`;
        batchBody += `Accept:application/json;odata.metadata=minimal;IEEE754Compatible=true${NL}`;
        batchBody += `Accept-Language:en${NL}`;
        batchBody += `Content-Type:application/json;charset=UTF-8;IEEE754Compatible=true${NL}`;
        batchBody += NL;
        if (this.body && this.body.length > 0) {
            batchBody += this.body;
            batchBody += NL;
        }
        if (changesetBoundary) {
            batchBody += `--${changesetBoundary}--${NL}`;
        }
        batchBody += `--${boundary}--${NL}`;
        return batchBody;
    }

    /**
     * @param content
     */
    protected extractContent<T>(content: any): T {
        return content as T;
    }

    /**
     * @param content
     * @param boundary
     */
    protected extractBatchContent<T>(content: any, boundary: string): T {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const batchResult = parseBatch(new BatchContent(content), boundary);
        return (batchResult.parts[0] as BatchPart).body as T;
    }

    /**
     * @param type
     * @param value
     */
    formatKeyValue(type: string, value: any): string {
        switch (type) {
            case 'Edm.String':
                return `'${value}'`;
            default:
                return value;
        }
    }

    /**
     * @param objectKey
     */
    keys(objectKey: ODataKey) {
        this.objectKey = objectKey;
    }
}
/**
 *
 */
export class ODataV4Requestor extends ODataRequestor {
    /**
     * @param sEntityPath
     */
    public getList<T>(sEntityPath: string): ODataV4ListRequest<T> {
        return new ODataV4ListRequest(this.odataRootUri, sEntityPath);
    }

    public getMetadata<T>(): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest(this.odataRootUri, '/$metadata');
    }
    public getRoot<T>(): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest(this.odataRootUri, '/');
    }
    public reloadData<T>(): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest(this.odataRootUri, '/$metadata/reload');
    }

    public reloadStickyHeader<T>(sEntityPath: string, sStickyHeader: string): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest(this.odataRootUri, sEntityPath, undefined, 'GET', {
            'sap-contextid': sStickyHeader
        });
    }

    /**
     * @param sEntityPath
     * @param keyDefinition
     */
    public getObject<T>(sEntityPath: string, keyDefinition: any): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest(this.odataRootUri, sEntityPath, keyDefinition);
    }

    public createData<T>(sEntityPath: string, objectData: any): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest<T>(this.odataRootUri, sEntityPath, {}, 'POST').setBody(objectData);
    }
    public updateData<T>(sEntityPath: string, objectData: any): ODataV4ObjectRequest<T> {
        return new ODataV4ObjectRequest<T>(this.odataRootUri, sEntityPath, {}, 'PATCH').setBody(objectData);
    }
}
