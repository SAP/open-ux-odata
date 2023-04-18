import balanced from 'balanced-match';
import type { IncomingHttpHeaders } from 'http';
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
    properties: Record<string, boolean>;
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

export type QueryPath = {
    path: string;
    keys: Record<string, any>;
};

export default class ODataRequest {
    private isMinimalRepresentation: boolean;
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
    public selectedProperties: Record<string, boolean>;
    public expandProperties: Record<string, ExpandDefinition> = {};
    public responseHeaders: Record<string, string> = {};
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
        if (this.tenantId) {
            this.addResponseHeader('sap-tenantid', this.tenantId);
        }
        this.isMinimalRepresentation = requestContent.headers?.['prefer'] === 'return=minimal';
        this.queryPath = this.parsePath(parsedUrl.pathname.substring(1));
        this.parseParameters(parsedUrl.searchParams);
    }

    private parseParameters(searchParams: URLSearchParams) {
        this.allParams = searchParams;
        this.searchQuery = parseSearch(searchParams.get('$search'));
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
        const selectParams = searchParams.get('$select');
        if (selectParams) {
            this.selectedProperties = {};
            const props = selectParams.split(',');
            props.forEach((property: string) => {
                if (property.length > 0) {
                    this.selectedProperties[property.split('/')[0]] = true;
                }
            });
        } else {
            this.selectedProperties = { '*': true };
        }

        const expandParams = searchParams.get('$expand');
        if (expandParams) {
            const expandParameters = this.parseExpand(expandParams);
            this.expandProperties = expandParameters.expand;
            this.selectedProperties = Object.assign(this.selectedProperties, expandParameters.properties || {});
        }

        if (this.filterDefinition) {
            this.addExpandForFilters(this.filterDefinition); // implicitly expand the properties used in filters
        }

        if (this.applyDefinition) {
            const additionalSelectProperty: Record<string, boolean> = {};
            this.applyDefinition.forEach((apply) => {
                this._addSelectedPropertiesForApplyExpression(apply, additionalSelectProperty);
            });

            this.selectedProperties = Object.assign(this.selectedProperties, additionalSelectProperty);
        }
    }

    private _addSelectedPropertiesForApplyExpression(
        applyTransformation: TransformationDefinition,
        additionalSelectProperty: Record<string, boolean>
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
                this.addExpandForFilters(applyTransformation.filterExpr);
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

    private parseExpand(expandParameters: string): ExpandDefinition {
        const props = this.splitProperties(expandParameters);
        return props.reduce(
            (reducer: ExpandDefinition, property) => {
                if (this.dataAccess.getMetadata().getVersion() === '4.0') {
                    const { pre: name, body: parameters } = balanced('(', ')', property) ?? { pre: property, body: '' };
                    const parameterSplit = this.splitProperties(parameters, ';');
                    const queryPart = parameterSplit.reduce((acc: {}, split) => Object.assign(acc, parse(split)), {});
                    const expand = queryPart['$expand']
                        ? this.parseExpand(queryPart['$expand'] as string)
                        : { expand: {}, properties: {} };

                    const selectProperties: any = {};
                    if (queryPart['$select']) {
                        // explicit $select
                        (queryPart['$select'] as string)
                            .split(',')
                            .forEach((propertyName) => (selectProperties[propertyName] = true));
                    } else {
                        selectProperties['*'] = true;
                    }

                    Object.keys(expand.properties).forEach((expandName) => {
                        selectProperties[expandName] = true;
                    });

                    reducer.expand[name] = {
                        expand: expand.expand,
                        properties: selectProperties
                    };
                    reducer.properties[name] = true;
                    return reducer;
                } else {
                    const propertySplit = property.split('/');
                    const name = propertySplit[0];
                    const expand = propertySplit[1]
                        ? this.parseExpand(propertySplit[1])
                        : { expand: {}, properties: {} };
                    reducer.expand[name] = {
                        expand: expand.expand,
                        properties: {
                            '*': true
                        }
                    };
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

    private parsePath(path: string): QueryPath[] {
        const pathSplit = path.split('/');
        return pathSplit.reduce((pathArr: QueryPath[], pathPart) => {
            const keysStart = pathPart.indexOf('(');
            const keysEnd = pathPart.indexOf(')');
            let entity!: string;
            let keys: Record<string, any> = {};
            if (keysStart > -1) {
                entity = pathPart.substring(0, keysStart) + pathPart.substring(keysEnd + 1);
                const keysList = pathPart.substring(keysStart + 1, keysEnd).split(',');
                keys = {};
                keysList.forEach((keyValue) => {
                    const [key, value] = keyValue.split('=');
                    if (value) {
                        keys[key] = decodeURIComponent(value.replace(/^(?:')$/g, ''));
                    } else {
                        keys[key] = undefined;
                    }
                });
            } else {
                entity = pathPart;
            }
            pathArr.push({ path: entity, keys: keys });
            return pathArr;
        }, []);
    }
    //
    // private parseApply(applyParameters: string | null): AggregateDefinition | undefined {
    //     if (!applyParameters) {
    //         return undefined;
    //     }
    //     const filterRegEx = /^filter\(([^)]+)\)\/(.*)$/;
    //     const filterMatches = applyParameters.match(filterRegEx);
    //     let groupByText = applyParameters;
    //     let filterParams;
    //     if (filterMatches) {
    //         const filterExpr = filterMatches[1];
    //         filterParams = parseFilter(filterExpr);
    //         groupByText = filterMatches[2];
    //     }
    //     const groupByRegEx = /^groupby\(\(([^)]+)\),([^)]+\))\)$/;
    //     const groupByMatches = groupByText.match(groupByRegEx);
    //     if (groupByMatches) {
    //         return {
    //             filter: filterParams,
    //             groupBy: groupByMatches[1].split(','),
    //             aggregates: this.parseAggregateDefinition(groupByMatches[2])
    //         };
    //     }
    // }

    // private parseAggregateDefinition(aggregationDefinition: string): AggregateProperty[] {
    //     const aggregateRegEx = /^aggregate\(([^)]+)\)$/;
    //     const aggregateMatches = aggregationDefinition.match(aggregateRegEx);
    //     if (aggregateMatches) {
    //         return aggregateMatches[1].split(',').map((aggregateMatch) => {
    //             const aggregateSplit = aggregateMatch.split(' ');
    //             const property = aggregateSplit[0];
    //             const operator = aggregateSplit[2];
    //             const targetName = aggregateSplit[4];
    //             return {
    //                 name: targetName || property,
    //                 operator,
    //                 sourceProperty: property
    //             };
    //         });
    //     } else {
    //         return [];
    //     }
    // }

    public async handleRequest() {
        const contextId = this.requestContent.headers?.['sap-contextid'];
        if (contextId) {
            this.dataAccess.resetStickySessionTimeout(this, this.tenantId);
        }
        try {
            switch (this.requestContent.method) {
                case 'PATCH':
                case 'MERGE':
                case 'PUT': {
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

    public addResponseHeader(headerName: string, headerValue: string) {
        this.responseHeaders[headerName] = headerValue;
    }

    public addResponseAnnotation(annotationName: string, annotationValue: any) {
        this.responseAnnotations[annotationName] = annotationValue;
    }

    public setDataCount(dataCount: number) {
        this.dataCount = dataCount;
    }

    private addExpandForFilters(filterDefinition: FilterExpression) {
        function expandPath(
            path: string,
            expands: Record<string, ExpandDefinition>,
            lambdaVariable?: string,
            skipLast?: boolean
        ) {
            const segments = path.split('/');
            if (segments[0] === lambdaVariable) {
                segments.shift();
            }

            if (skipLast) {
                segments.pop();
            }

            let target = expands;
            for (const segment of segments) {
                target[segment] = target[segment] ?? {
                    expand: {},
                    properties: { '*': true },
                    removeFromResult: true
                };
                target = target[segment].expand;
            }
            return target;
        }

        function expand(
            expression: FilterExpression,
            expandDefinitions: Record<string, ExpandDefinition>,
            lambdaVariable?: string
        ) {
            if (typeof expression.identifier === 'string') {
                expandPath(expression.identifier, expandDefinitions, lambdaVariable, true);
            } else if (expression.identifier?.type === 'lambda') {
                const target = expandPath(expression.identifier.target, expandDefinitions, lambdaVariable);

                for (const subExpression of expression.identifier.expression.expressions) {
                    expand(subExpression, target, expression.identifier.key);
                }
            }
        }

        filterDefinition.expressions.forEach((expression) => expand(expression, this.expandProperties));
    }
}
