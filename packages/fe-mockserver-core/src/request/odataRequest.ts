import balanced from 'balanced-match';
import type { IncomingHttpHeaders } from 'http';
import merge from 'lodash.merge';
import { parse } from 'query-string';
import type { URLSearchParams } from 'url';
import { URL } from 'url';
import { ExecutionError } from '../data/common';
import type { DataAccess } from '../data/dataAccess';
import type { TransformationDefinition } from './applyParser';
import { parseApply } from './applyParser';
import type { FilterExpression } from './filterParser';
import { parseFilter } from './filterParser';
import { parseSearch } from './searchParser';

export type ExpandDefinition = {
    expand: Record<string, ExpandDefinition>;
    properties: SelectDefinition;
    filter?: FilterExpression;
    orderBy?: OrderByDefinition[];
    removeFromResult?: boolean;
};

type ODataRequestContent = {
    body?: any;
    url: string;
    tenantId?: string;
    method: string;
    headers?: IncomingHttpHeaders;
    contentId?: string;
};

type OrderByDefinition = {
    name: string;
    direction: 'asc' | 'desc';
};

export type SelectDefinition = Record<string, boolean>;

export type KeyDefinitions = Record<string, number | boolean | string>;

export type QueryPath = {
    path: string;
    keys: KeyDefinitions;
};

function addPathToExpandParameters(
    path: string,
    expandParameter: Record<string, ExpandDefinition>,
    lambdaVariable?: string,
    skipLast?: boolean,
    removeFromResult?: boolean
): Record<string, ExpandDefinition> {
    const segments = path.split('/');
    if (segments[0] === lambdaVariable) {
        segments.shift();
    }

    if (skipLast) {
        segments.pop();
    }

    let target = expandParameter;
    for (const segment of segments) {
        target[segment] = target[segment] ?? {
            expand: {},
            properties: { '*': true },
            removeFromResult: removeFromResult
        };
        target = target[segment].expand;
    }
    return target;
}

export default class ODataRequest {
    private isMinimalRepresentation: boolean;
    public isStrictMode: boolean;
    public tenantId: string;
    public queryPath: QueryPath[];
    public searchQuery: string[];
    public orderBy: OrderByDefinition[];
    public startIndex: number;
    public skipLocation: string | null;
    public skipContext: number;
    public maxElements: number;
    public applyDefinition?: TransformationDefinition[];
    public filterDefinition?: FilterExpression;
    public selectedProperties: SelectDefinition;
    public expandProperties: Record<string, ExpandDefinition> = {};
    public responseHeaders: Record<string, string> = {};
    public globalResponseHeaders: Record<string, string> = {};
    public statusCode: number = 200;
    public dataCount: number;

    private responseAnnotations: Record<string, any> = {};
    public countRequested: boolean;
    public isCountQuery: boolean;
    public responseData: any;
    private allParams: URLSearchParams;
    private context: string;
    private messages: any[] = [];

    constructor(private requestContent: ODataRequestContent, private dataAccess: DataAccess) {
        const parsedUrl = new URL(`http://dummy${requestContent.url}`);
        this.tenantId = requestContent.tenantId || 'tenant-default';
        this.context = requestContent.url.split('?')[0].substring(1);
        this.dataAccess.log.info(`ODataRequest: ${requestContent.method} ${requestContent.url}`);
        if (this.tenantId) {
            this.addResponseHeader('sap-tenantid', this.tenantId);
        }
        this.isMinimalRepresentation = requestContent.headers?.['prefer'] === 'return=minimal';
        this.isStrictMode = requestContent.headers?.['prefer']?.includes('handling=strict') ?? false;
        this.queryPath = this.parsePath(parsedUrl.pathname.substring(1));
        this.parseParameters(parsedUrl.searchParams);
    }

    private parseParameters(searchParams: URLSearchParams) {
        this.allParams = searchParams;
        this.searchQuery = parseSearch(searchParams.get('$search'));
        if (this.dataAccess.getMetadata().getVersion() === '2.0' && this.searchQuery.length === 0) {
            // In v2, there is no official $search support but sometimes `search` without dollar is used
            this.searchQuery = parseSearch(searchParams.get('search'));
        }
        this.orderBy = this.parseOrderBy(searchParams.get('$orderby'));
        this.startIndex = parseInt(searchParams.get('$skip') || '', 10);
        this.skipLocation = searchParams.get('sap-skiplocation');
        this.skipContext = parseInt(searchParams.get('sap-skipcontext') || '', 10);
        if (isNaN(this.startIndex)) {
            this.startIndex = 0;
        }
        this.maxElements = parseInt(searchParams.get('$top') || Number.POSITIVE_INFINITY.toString(), 10);
        if (isNaN(this.maxElements)) {
            this.maxElements = Number.POSITIVE_INFINITY;
        }
        this.applyDefinition = parseApply(searchParams.get('$apply'));
        this.filterDefinition = parseFilter(searchParams.get('$filter'));
        this.countRequested = searchParams.has('$count');
        this.isCountQuery = this.context.endsWith('$count');
        this.selectedProperties = this.parseSelect(searchParams.get('$select'));

        const expandParameters = this.parseExpand(searchParams.get('$expand'));
        this.expandProperties = expandParameters.expand;

        // make sure to expand properties used in $filter and $orderby
        ODataRequest.addExpandForFilters(this.expandProperties, this.filterDefinition);
        ODataRequest.addExpandForOrderBy(this.expandProperties, this.orderBy);

        this.selectedProperties = Object.assign(this.selectedProperties, expandParameters.properties);

        if (this.applyDefinition) {
            const additionalSelectProperty: SelectDefinition = {};
            this.applyDefinition.forEach((apply) => {
                this._addSelectedPropertiesForApplyExpression(apply, additionalSelectProperty);
            });
            for (const additionalSelectKey of Object.keys(additionalSelectProperty)) {
                addPathToExpandParameters(additionalSelectKey, this.expandProperties, undefined, true);
            }

            this.selectedProperties = Object.assign(this.selectedProperties, additionalSelectProperty);
        }
    }

    public get headers(): IncomingHttpHeaders {
        return this.requestContent.headers ?? {};
    }

    private _addSelectedPropertiesForApplyExpression(
        applyTransformation: TransformationDefinition,
        additionalSelectProperty: SelectDefinition
    ) {
        switch (applyTransformation.type) {
            case 'groupBy':
                applyTransformation.groupBy.forEach((groupByProperty) => {
                    additionalSelectProperty[groupByProperty] = true;
                });
                applyTransformation.subTransformations.forEach((subTransformation) => {
                    this._addSelectedPropertiesForApplyExpression(subTransformation, additionalSelectProperty);
                });
                break;
            case 'filter':
                ODataRequest.addExpandForFilters(this.expandProperties, applyTransformation.filterExpr);
                break;
            case 'orderBy':
                applyTransformation.orderBy.forEach((orderByProperty) => {
                    additionalSelectProperty[orderByProperty.name] = true;
                });
                break;
            case 'aggregates':
                applyTransformation.aggregateDef.forEach((aggregateSourceProp) => {
                    additionalSelectProperty[aggregateSourceProp.sourceProperty] = true;
                });
                break;
            case 'concat':
                for (const concatExpressions of applyTransformation.concatExpr) {
                    for (const concatExpression of concatExpressions) {
                        this._addSelectedPropertiesForApplyExpression(concatExpression, additionalSelectProperty);
                    }
                }
                break;
            case 'ancestors':
            case 'descendants':
                applyTransformation.parameters.inputSetTransformations.forEach((subTransformation) => {
                    this._addSelectedPropertiesForApplyExpression(subTransformation, additionalSelectProperty);
                });
                break;
        }
    }

    /**
     * Split a list of properties that can contain sub-requests into an array.
     *
     * @param propertiesQuery OData properties request
     * @param delimiter Property delimiter
     * @returns an array of string with the properties
     */
    private splitProperties(propertiesQuery: string, delimiter = ','): string[] {
        const properties = [];
        let nestingDepth = 0,
            startIndex = 0,
            index = 0;

        for (; index < propertiesQuery.length; index++) {
            const char = propertiesQuery[index];
            if (char === delimiter && nestingDepth === 0) {
                // top-level delimiter — end of property
                if (index - startIndex > 0) {
                    properties.push(propertiesQuery.substring(startIndex, index));
                }
                startIndex = index + 1;
            } else if (char === '(') {
                nestingDepth++;
            } else if (char === ')') {
                nestingDepth--;
            }
        }

        if (index - startIndex > 0) {
            properties.push(propertiesQuery.substring(startIndex));
        }

        if (nestingDepth !== 0) {
            throw new ExecutionError(
                `Too many ${nestingDepth > 0 ? 'opening' : 'closing'} parentheses: ${propertiesQuery}`,
                400,
                undefined,
                false
            );
        }

        return properties;
    }

    private parseExpand(expandParameters: string | null): ExpandDefinition {
        const props = this.splitProperties(expandParameters ?? '');
        return props.reduce(
            (reducer: ExpandDefinition, property) => {
                if (this.dataAccess.getMetadata().getVersion() === '4.0') {
                    const { pre: name, body: parameters } = balanced('(', ')', property) ?? { pre: property, body: '' };
                    const parameterSplit = this.splitProperties(parameters, ';');
                    const queryPart = parameterSplit.reduce((acc: {}, split) => Object.assign(acc, parse(split)), {});

                    const expandOptions = this.parseExpand(queryPart['$expand'] as string | null);

                    const options: ExpandDefinition = {
                        expand: expandOptions.expand,
                        properties: this.parseSelect(queryPart['$select'] as string | null)
                    };

                    for (const expandName of Object.keys(expandOptions.expand)) {
                        options.properties[expandName] = true;
                    }

                    // $filter
                    if (queryPart.$filter) {
                        options.filter = parseFilter(queryPart.$filter as string);
                        ODataRequest.addExpandForFilters(options.expand, options.filter);
                    }

                    // $orderby
                    if (queryPart.$orderby) {
                        options.orderBy = this.parseOrderBy(queryPart.$orderby as string);
                        ODataRequest.addExpandForOrderBy(options.expand, options.orderBy);
                    }

                    reducer.expand[name] = options;
                    reducer.properties[name] = true;
                    return reducer;
                } else {
                    const propertySplit = property.split('/');
                    const name = propertySplit[0];
                    const expand = propertySplit[1]
                        ? this.parseExpand(propertySplit.slice(1).join('/'))
                        : { expand: {}, properties: {} };
                    if (!reducer.expand[name]) {
                        reducer.expand[name] = {
                            expand: expand.expand,
                            properties: {
                                '*': true
                            }
                        };
                    } else {
                        reducer.expand[name].expand = merge({}, reducer.expand[name].expand, expand.expand);
                    }

                    reducer.properties[name] = true;
                    return reducer;
                }
            },
            { expand: {}, properties: {} }
        );
    }

    private parseOrderBy(orderByParameters: string | null): OrderByDefinition[] {
        if (!orderByParameters) {
            return [];
        }
        const orderByParams = orderByParameters.split(',');
        const orderByDefinition: OrderByDefinition[] = [];
        orderByParams.forEach((param) => {
            const [paramName, direction] = param.split(' ');
            const realDirection: 'asc' | 'desc' = ['asc', 'desc'].includes(direction)
                ? (direction as 'asc' | 'desc')
                : 'asc';
            orderByDefinition.push({ name: paramName, direction: realDirection });
        });
        return orderByDefinition;
    }

    private parseSelect(selectParameters: string | null): SelectDefinition {
        if (selectParameters) {
            return selectParameters.split(',').reduce((selectDefinition: SelectDefinition, property) => {
                if (property.length > 0) {
                    selectDefinition[property.split('/', 1)[0]] = true;
                }
                return selectDefinition;
            }, {});
        }

        return { '*': true };
    }

    private parsePath(path: string): QueryPath[] {
        const pathSplit = path.split('/');
        return pathSplit.reduce((pathArr: QueryPath[], pathPart) => {
            const keysStart = pathPart.indexOf('(');
            const keysEnd = pathPart.lastIndexOf(')');
            let entity!: string;
            let keys: KeyDefinitions = {};
            if (keysStart > -1) {
                entity = pathPart.substring(0, keysStart) + pathPart.substring(keysEnd + 1);
                const keysList = pathPart.substring(keysStart + 1, keysEnd).split(',');
                keys = {};
                keysList.forEach((keyValue) => {
                    const [key, value] = keyValue.split('=');

                    if (value) {
                        // .../Entity(ID='abc',IsActiveEntity=true) -> {ID: 'abc', IsActiveEntity: true}
                        keys[key] = ODataRequest.parseKeyValue(value);
                    } else {
                        // .../Entity('abc') -> {'': 'abc'}
                        keys[''] = ODataRequest.parseKeyValue(key);
                    }
                });
            } else {
                entity = pathPart;
            }
            pathArr.push({ path: entity, keys: keys });
            return pathArr;
        }, []);
    }

    /**
     * Parse an OData key value.
     *
     * @param value The key value. Strings are expected to be surrounded by single quotes.
     * @returns The parsed value
     */
    private static parseKeyValue(value: string): string | number | boolean {
        value = decodeURIComponent(value);

        // string, e.g. "/Entity(key='abc')?
        if (value.startsWith("'") && value.endsWith("'")) {
            return decodeURIComponent(value.substring(1, value.length - 1));
        }

        // boolean, e.g. "/Entity(key=true)"?
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }

        // number, e.g. "/Entity(key=123)"?
        const number = Number(value);
        if (!isNaN(number)) {
            return number;
        }

        // some other type, e.g. a UUID or a date - leave as string
        return value;
    }

    public async handleRequest() {
        try {
            switch (this.requestContent.method) {
                case 'PATCH':
                case 'MERGE':
                case 'PUT': {
                    this.dataAccess.checkSession(this);
                    const updatedData = await this.dataAccess.updateData(this, this.requestContent.body);
                    this.setResponseData(updatedData);

                    break;
                }
                case 'DELETE':
                    await this.dataAccess.deleteData(this);
                    this.statusCode = 204;
                    break;
                case 'POST': {
                    const actionResponse = await this.dataAccess.performAction(this, this.requestContent.body);
                    if (actionResponse === null) {
                        this.setResponseData(await this.dataAccess.createData(this, this.requestContent.body));
                        this.statusCode = 201;
                    } else if (actionResponse === undefined) {
                        this.setResponseData(actionResponse);
                        this.statusCode = 204;
                    } else {
                        this.setResponseData(actionResponse);
                    }
                    break;
                }
                case 'HEAD':
                    break; // do nothing
                case 'GET':
                default: {
                    const actionResponse = await this.dataAccess.performAction(this);
                    if (actionResponse === null) {
                        const retrievedData = await this.dataAccess.getData(this);
                        if (retrievedData === undefined || retrievedData === null) {
                            this.statusCode = 404;
                            this.setResponseData('');
                        } else {
                            this.setResponseData(retrievedData);
                        }
                    } else {
                        this.setResponseData(actionResponse);
                    }
                    break;
                }
            }
        } catch (errorInfo: any) {
            const errorInformation: ExecutionError = errorInfo as ExecutionError;
            if (errorInformation.isCustomError) {
                if (errorInformation.messageData) {
                    if (errorInformation.isSAPMessage) {
                        this.addResponseHeader('sap-messages', JSON.stringify(errorInformation.messageData));
                    } else {
                        this.addResponseHeader(
                            'content-type',
                            'application/json;odata.metadata=minimal;IEEE754Compatible=true'
                        );
                        this.setResponseData(JSON.stringify(errorInformation.messageData));
                    }
                } else {
                    this.addResponseHeader('content-type', 'text/plain');
                    this.setResponseData(errorInformation.message);
                }
                if (Object.keys(errorInformation.headers).length > 0) {
                    Object.keys(errorInformation.headers).forEach((headerName) => {
                        this.addResponseHeader(headerName, errorInformation.headers[headerName]);
                    });
                }
                this.statusCode = errorInformation.statusCode;
            } else {
                this.statusCode = 500;
                this.addResponseHeader('content-type', 'text/plain');
                this.setResponseData(errorInformation.message);
            }
        }
        this.dataAccess.resetStickySessionTimeout(this);
    }

    public setResponseData(data: any) {
        this.responseData = data;
    }

    public setContext(context: string) {
        this.context = context;
    }

    public getResponseData() {
        if (this.messages.length) {
            this.addResponseHeader('sap-messages', JSON.stringify(this.messages));
        }

        if (this.dataAccess.getMetadata().getVersion() === '4.0') {
            this.addResponseHeader('odata-version', '4.0');
        } else {
            this.addResponseHeader('dataserviceversion', '2.0');
            this.addResponseHeader('cache-control', 'no-store, no-cache');
        }
        if (typeof this.responseData === 'string') {
            return this.responseData;
        }
        if (typeof this.responseData === 'number' && this.isCountQuery) {
            this.addResponseHeader('content-type', 'text/plain');
            return this.responseData.toString();
        }
        if (this.dataAccess.getMetadata().getVersion() === '4.0') {
            if (this.statusCode === 204) {
                return;
            }
            if (this.isMinimalRepresentation) {
                this.statusCode = 204;
                this.addResponseHeader('preference-applied', 'return=minimal');
                return null;
            } else {
                this.addResponseHeader(
                    'content-type',
                    'application/json;odata.metadata=minimal;IEEE754Compatible=true'
                );
                let outContext = this.context || '';
                if (outContext.indexOf('$metadata') === -1) {
                    outContext = `$metadata#${this.context}`;
                }
                let resultObject: any = {
                    '@odata.context': outContext
                };
                const metadataETags = this.dataAccess.getMetadata().getETag();
                if (metadataETags) {
                    resultObject['@odata.metadataEtag'] = metadataETags;
                }
                if (Object.keys(this.responseAnnotations).length) {
                    resultObject = { ...resultObject, ...this.responseAnnotations };
                }
                if (Array.isArray(this.responseData)) {
                    resultObject['@odata.count'] = this.dataCount;
                    resultObject.value = this.responseData;
                } else {
                    resultObject = { ...resultObject, ...this.responseData };
                }

                return JSON.stringify(resultObject);
            }
        } else {
            if (this.statusCode === 204) {
                return;
            }
            this.addResponseHeader('content-type', 'application/json');
            // V2
            const resultObject: any = { d: {} };
            if (Array.isArray(this.responseData)) {
                resultObject.d.__count = this.dataCount;
                resultObject.d.results = this.responseData;
            } else {
                resultObject.d = this.responseData;
            }
            return JSON.stringify(resultObject);
        }
    }

    public addMessage(code: number, message: string, severity: number, target: string) {
        this.addCustomMessage({ code, message, numericSeverity: severity, target });
    }

    public addCustomMessage(messageData: any) {
        this.messages.push(messageData);
    }

    public addResponseHeader(headerName: string, headerValue: string, globalHeader: boolean = false) {
        if (globalHeader) {
            this.globalResponseHeaders[headerName] = headerValue;
        } else {
            this.responseHeaders[headerName] = headerValue;
        }
    }

    public addResponseAnnotation(annotationName: string, annotationValue: any) {
        this.responseAnnotations[annotationName] = annotationValue;
    }

    public setDataCount(dataCount: number) {
        this.dataCount = dataCount;
    }

    private static addExpandForFilters(
        expandOptions: Record<string, ExpandDefinition>,
        filterDefinition: FilterExpression | undefined
    ) {
        function expand(
            expression: FilterExpression,
            expandDefinitions: Record<string, ExpandDefinition>,
            lambdaVariable?: string
        ) {
            if (typeof expression.identifier === 'string') {
                addPathToExpandParameters(expression.identifier, expandDefinitions, lambdaVariable, true, true);
            } else if (expression.identifier?.type === 'lambda') {
                const target = addPathToExpandParameters(
                    expression.identifier.target,
                    expandDefinitions,
                    lambdaVariable,
                    false,
                    true
                );

                if (expression.identifier.expression) {
                    for (const subExpression of expression.identifier.expression.expressions) {
                        expand(subExpression, target, expression.identifier.key);
                    }
                }
            }
        }

        if (filterDefinition) {
            for (const expression of filterDefinition.expressions) {
                expand(expression, expandOptions);
            }
        }
    }

    private static addExpandForOrderBy(
        expandOptions: Record<string, ExpandDefinition>,
        orderByDefinition: OrderByDefinition[]
    ) {
        for (const definition of orderByDefinition) {
            addPathToExpandParameters(definition.name, expandOptions, undefined, true, true);
        }
    }
}
