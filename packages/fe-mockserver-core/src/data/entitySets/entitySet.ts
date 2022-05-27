import { join } from 'path';

import type ODataRequest from '../../request/odataRequest';
import cloneDeep from 'lodash.clonedeep';
import type { KeyDefinitions } from '../../mockdata/fileBasedMockData';
import type { MockDataContributor } from '../../mockdata/functionBasedMockData';
import type { DataAccessInterface, EntitySetInterface } from '../common';
import type { Action, EntitySet, EntityType, Property } from '@sap-ux/vocabularies-types';
import { FunctionBasedMockData } from '../../mockdata/functionBasedMockData';
import { FileBasedMockData } from '../../mockdata/fileBasedMockData';

function getData(fullData: any, objectPath: string): any {
    if (fullData === undefined || objectPath.length === 0) {
        return fullData;
    }
    if (objectPath.indexOf('/') === -1) {
        return fullData?.[objectPath]; // fullData can be null
    } else {
        const subObjectPath = objectPath.split('/');
        return getData(fullData[subObjectPath[0]], subObjectPath.slice(1).join('/'));
    }
}

function transformationFn(type: string, check?: any) {
    switch (type) {
        case 'tolower':
            return (data: string) => data.toLowerCase();
        case 'toupper':
            return (data: string) => data.toUpperCase();
        case 'trim':
            return (data: string) => data.trim();
        case 'length':
            return (data: string) => {
                return data && data.length;
            };
        case 'round':
            return (data: string) => Math.round(parseFloat(data));
        case 'floor':
            return (data: string) => Math.floor(parseFloat(data));
        case 'ceiling':
            return (data: string) => Math.ceil(parseFloat(data));
        case 'cast':
            return (data: string) => {
                switch (check) {
                    case 'Edm.String':
                        return data.toString();
                    case 'Edm.Boolean':
                        return data === 'true';
                    case 'Edm.Byte':
                    case 'Edm.Int16':
                    case 'Edm.Int32':
                    case 'Edm.Int64': {
                        return parseInt(data, 10);
                    }
                    case 'Edm.Decimal': {
                        return parseFloat(data);
                    }
                    default:
                        return data;
                }
            };
        case 'startswith':
            return (data: string) => {
                return data.startsWith(check);
            };
        case 'endswith':
            return (data: string) => {
                return data.endsWith(check);
            };
        case 'contains':
            return (data: string) => {
                return data.indexOf(check) !== -1;
            };
        case 'concat':
            return (data: string) => {
                return data + check;
            };
        case 'indexof':
            return (data: string) => {
                return data.indexOf(check);
            };
        case 'substring':
            return (data: string) => {
                return data.substring(check);
            };
        case 'matchesPattern':
            const regExp = new RegExp(check);
            return (data: string) => {
                return regExp.test(data);
            };
        case 'noop':
        default:
            return (data: any) => data;
    }
}

function prepareLiteral(literal: string, property: Property) {
    if (!literal) {
        return literal;
    }
    switch (property.type) {
        case 'Edm.Boolean':
            return literal === 'true';
        case 'Edm.String':
        case 'Edm.Guid':
            if (literal && literal.startsWith("'")) {
                return literal.substring(1, literal.length - 1);
            } else {
                return literal;
            }
        case 'Edm.Byte':
        case 'Edm.Int16':
        case 'Edm.Int32':
        case 'Edm.Int64': {
            return parseInt(literal, 10);
        }
        case 'Edm.Decimal': {
            return parseFloat(literal);
        }
        default:
            return literal;
    }
}

/**
 *
 */
export class MockDataEntitySet implements EntitySetInterface {
    public static async read(
        mockDataRootFolder: string,
        entity: string,
        generateMockData: boolean,
        isDraft: boolean,
        dataAccess: DataAccessInterface
    ): Promise<object[]> {
        const path = join(mockDataRootFolder, entity) + '.json';
        const jsPath = join(mockDataRootFolder, entity) + '.js';
        let outData: any[] | object = [];
        let isInitial = true;
        if (dataAccess.debug) {
            dataAccess.log.info('Trying to find ' + jsPath + ' for mockdata');
        }
        if (await dataAccess.fileLoader.exists(jsPath)) {
            try {
                //eslint-disable-next-line
                outData = await dataAccess.fileLoader.loadJS(jsPath);
                isInitial = false;
                dataAccess.log.info('JS file found for ' + entity);
            } catch (e) {
                console.error(e);
                return Promise.resolve([]);
            }
        }
        if ((isInitial || !(outData as any).getInitialDataSet) && (await dataAccess.fileLoader.exists(path))) {
            if (dataAccess.debug) {
                dataAccess.log.info('Trying to find ' + path + ' for mockdata');
            }
            try {
                const fileContent = await dataAccess.fileLoader.loadFile(path);
                let outJsonData: any[];
                if (fileContent.length === 0) {
                    outJsonData = [];
                } else {
                    outJsonData = JSON.parse(fileContent);

                    outJsonData.forEach((jsonLine) => {
                        if (isDraft) {
                            const IsActiveEntityValue = jsonLine.IsActiveEntity;
                            if (IsActiveEntityValue === undefined) {
                                jsonLine.IsActiveEntity = true;
                                jsonLine.HasActiveEntity = true;
                                jsonLine.HasDraftEntity = false;
                            }
                        }
                        delete jsonLine['@odata.etag'];
                    });
                }
                dataAccess.log.info('JSON file found for ' + entity);
                if (isInitial) {
                    outData = outJsonData;
                    isInitial = false;
                } else {
                    (outData as any).getInitialDataSet = function () {
                        return outJsonData.concat();
                    };
                }
            } catch (e) {
                if (dataAccess.debug) {
                    dataAccess.log.info(e as string);
                }
            }
        }
        if (isInitial) {
            outData = [];
            if (generateMockData) {
                (outData as any).__generateMockData = generateMockData;
            }
        }
        return outData as any;
    }

    protected _rootMockData: object[] = [];
    private _rootMockDataFn: MockDataContributor;
    protected contextBasedMockData: Record<string, FileBasedMockData> = {};
    public readyPromise: Promise<EntitySetInterface>;
    protected entitySetDefinition: EntitySet | null;
    protected entityTypeDefinition: EntityType;
    protected dataAccess: DataAccessInterface;
    /**
     * @param rootFolder
     * @param entitySetDefinition
     * @param dataAccess
     * @param generateMockData
     * @param initializeMockData
     * @param isDraft
     */
    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean,
        initializeMockData = true,
        isDraft = false
    ) {
        if (entitySetDefinition._type === 'EntityType') {
            this.entitySetDefinition = null;
            this.entityTypeDefinition = entitySetDefinition as EntityType;
        } else {
            this.entitySetDefinition = entitySetDefinition as EntitySet;
            this.entityTypeDefinition = this.entitySetDefinition.entityType;
        }

        this.dataAccess = dataAccess;
        if (initializeMockData) {
            this.readyPromise = MockDataEntitySet.read(
                rootFolder,
                entitySetDefinition.name,
                generateMockData,
                isDraft,
                dataAccess
            ).then((mockData) => {
                if (typeof mockData === 'object' && !Array.isArray(mockData)) {
                    this._rootMockDataFn = mockData as MockDataContributor;
                } else {
                    this._rootMockData = mockData;
                }
                return this;
            });
        }
    }

    public getMockData(contextId: string): FileBasedMockData {
        if (!Object.prototype.hasOwnProperty.apply(this.contextBasedMockData, [contextId])) {
            this.contextBasedMockData[contextId] = this._rootMockDataFn
                ? new FunctionBasedMockData(this._rootMockDataFn, this.entityTypeDefinition, this, contextId)
                : new FileBasedMockData(this._rootMockData, this.entityTypeDefinition, this, contextId);
        }
        return this.contextBasedMockData[contextId];
    }

    protected checkKeys(keyValues: KeyDefinitions, dataLine: object, keyDefinition: Property[]): boolean {
        return Object.keys(keyValues).every((keyName) => {
            return this.checkKeyValue(
                dataLine,
                keyValues,
                keyName,
                keyDefinition.find((keyProp) => keyProp.name === keyName) as Property
            );
        });
    }

    protected checkSpecificProperties(_filterExpression: any, _mockData: any, _allData: any): boolean | null {
        return null;
    }

    public isV4(): boolean {
        return this.dataAccess.isV4();
    }

    public getProperty(identifier: string) {
        let resolvedPath;
        if (this.entitySetDefinition) {
            resolvedPath = this.dataAccess
                .getMetadata()
                .resolvePath('/' + this.entitySetDefinition.name + '/' + identifier);
        } else {
            resolvedPath = this.entityTypeDefinition.resolvePath(identifier, true);
        }

        return resolvedPath.target;
    }

    public checkFilter(mockData: object, filterExpression: any, tenantId: string): boolean {
        let isValid = true;
        if (filterExpression.hasOwnProperty('expressions')) {
            if (filterExpression.operator === 'AND') {
                isValid = filterExpression.expressions.every((filterValue: any) => {
                    return this.checkFilter(mockData, filterValue, tenantId);
                });
            } else {
                isValid = filterExpression.expressions.some((filterValue: any) => {
                    return this.checkFilter(mockData, filterValue, tenantId);
                });
            }
        } else {
            isValid = this.checkSimpleExpression(filterExpression, mockData, tenantId);
        }
        return isValid;
    }

    public checkSimpleExpression(filterExpression: any, mockData: any, tenantId: string) {
        let identifier = filterExpression.identifier;
        const operator = filterExpression.operator;
        let literal = filterExpression.literal;
        let identifierTransformation = transformationFn('noop');
        let comparisonType = null;
        if (identifier.type === 'lambda') {
            const lambdaOperator = identifier.operator;
            let hasAnyValid = false;
            let hasAllValid = true;
            const mockDataToCheckValue = identifierTransformation(getData(mockData, identifier.target));
            identifier.expression.identifier = identifier.expression.identifier.replace(identifier.key, '');
            mockDataToCheckValue.find((subMockData: any) => {
                const isEntryValid = this.checkSimpleExpression(identifier.expression, subMockData, tenantId);
                if (!isEntryValid) {
                    hasAllValid = false;
                } else {
                    hasAnyValid = true;
                }
            });
            if (lambdaOperator === 'ANY') {
                return hasAnyValid;
            } else {
                return hasAllValid;
            }
        } else if (identifier.method) {
            identifierTransformation = transformationFn(
                identifier.method,
                prepareLiteral(identifier.methodArgs[1], this.getProperty(identifier.methodArgs[0]))
            );
            if (identifier.method === 'length' || identifier.method === 'indexof') {
                comparisonType = 'Edm.Int16';
            } else {
                comparisonType = 'Edm.String';
            }
            identifier = identifier.methodArgs[0];
        }
        let literalTransformation = transformationFn('noop');
        if (literal && literal.method) {
            literalTransformation = transformationFn(literal.method);
            literal = literalTransformation(literal.methodArgs[0]);
        } else if (!literal) {
            literal = true;
        }

        const property = this.getProperty(identifier);
        if (!comparisonType) {
            comparisonType = property.type;
        }
        const currentMockData = this.getMockData(tenantId);
        const specificCheck = this.checkSpecificProperties(filterExpression, mockData, currentMockData);
        if (specificCheck !== null) {
            return specificCheck;
        }
        const mockValue = identifierTransformation(getData(mockData, identifier));
        if (literal === true) {
            return mockValue === literal;
        }
        let isValid = true;
        switch (comparisonType) {
            case 'Edm.Boolean':
                isValid = !!mockValue === (literal === 'true');
                break;

            case 'Edm.Byte':
            case 'Edm.Int16':
            case 'Edm.Int32':
            case 'Edm.Int64': {
                const testValue = parseInt(literal, 10);
                switch (operator) {
                    case 'gt':
                        isValid = mockValue > testValue;
                        break;
                    case 'ge':
                        isValid = mockValue >= testValue;
                        break;
                    case 'lt':
                        isValid = mockValue < testValue;
                        break;
                    case 'le':
                        isValid = mockValue <= testValue;
                        break;
                    case 'ne':
                        isValid = mockValue !== testValue;
                        break;
                    case 'eq':
                    default:
                        isValid = mockValue === testValue;
                        break;
                }
                break;
            }
            case 'Edm.Decimal': {
                const testValue = parseFloat(literal);
                switch (operator) {
                    case 'gt':
                        isValid = mockValue > testValue;
                        break;
                    case 'ge':
                        isValid = mockValue >= testValue;
                        break;
                    case 'lt':
                        isValid = mockValue < testValue;
                        break;
                    case 'le':
                        isValid = mockValue <= testValue;
                        break;
                    case 'ne':
                        isValid = mockValue !== testValue;
                        break;
                    case 'eq':
                    default:
                        isValid = mockValue === testValue;
                        break;
                }
                break;
            }
            case 'Edm.Date':
            case 'Edm.Time':
            case 'Edm.DateTime':
            case 'Edm.DateTimeOffset':
                const testValue = new Date(literal).getTime();
                const mockValueDate = new Date(mockValue).getTime();
                switch (operator) {
                    case 'gt':
                        isValid = mockValueDate > testValue;
                        break;
                    case 'ge':
                        isValid = mockValueDate >= testValue;
                        break;
                    case 'lt':
                        isValid = mockValueDate < testValue;
                        break;
                    case 'le':
                        isValid = mockValueDate <= testValue;
                        break;
                    case 'ne':
                        isValid = mockValueDate !== testValue;
                        break;
                    case 'eq':
                    default:
                        isValid = mockValueDate === testValue;
                        break;
                }
                break;
            case 'Edm.String':
            case 'Edm.Guid':
            default:
                if (literal && literal.startsWith("guid'")) {
                    isValid = mockValue === literal.substr(5, literal.length - 6);
                } else if (literal && literal.startsWith("'")) {
                    isValid = mockValue === literal.substr(1, literal.length - 2);
                } else {
                    isValid = mockValue === literal;
                }
                break;
        }
        return isValid;
    }

    public checkSearch(mockData: any, searchQueries: string[]): boolean {
        const searchableProperties = this.entityTypeDefinition.entityProperties.filter((property) => {
            switch (property.type) {
                case 'Edm.Boolean':
                case 'Edm.Int32':
                    return false;
                case 'Edm.String':
                    return true;
                default:
                    return false;
            }
        });
        return searchQueries.every((searchQuery) => {
            return searchableProperties.some((property) => {
                const mockValue = mockData[property.name];
                return mockValue && mockValue.indexOf(searchQuery) !== -1;
            });
        });
    }

    public checkKeyValue(mockData: any, keyValues: any, keyName: string, keyProp?: Property): boolean {
        if (keyProp) {
            switch (keyProp.type) {
                case 'Edm.Guid':
                    if (keyValues[keyName] && keyValues[keyName].startsWith("guid'")) {
                        return mockData[keyName] === keyValues[keyName].substr(5, keyValues[keyName].length - 6);
                    }
                    return mockData[keyName] === keyValues[keyName];
                case 'Edm.String':
                    if (keyValues[keyName] && keyValues[keyName].startsWith("'")) {
                        return mockData[keyName] === keyValues[keyName].substr(1, keyValues[keyName].length - 2);
                    }
                    return mockData[keyName] === keyValues[keyName];
                case 'Edm.Int32':
                case 'Edm.Int64':
                case 'Edm.Int16':
                    return mockData[keyName] === parseInt(keyValues[keyName], 10);
                default:
                    return mockData[keyName] === keyValues[keyName];
            }
        }
        return mockData[keyName] === keyValues[keyName];
    }

    public getKeys(dataLine: any): Record<string, string | number | boolean> {
        const keys = this.entityTypeDefinition.keys;
        const keyValues: Record<string, any> = {};
        keys.forEach((keyProp: Property) => {
            keyValues[keyProp.name] = dataLine[keyProp.name];
        });

        return keyValues;
    }

    protected prepareKeys(keyValues: KeyDefinitions): KeyDefinitions {
        let outKeys: Record<string, any> = {};
        if (keyValues === undefined) {
            return outKeys;
        }
        if (Object.keys(keyValues).length === 1 && Object.values(keyValues)[0] === undefined) {
            let keyValue;
            Object.keys(keyValues).forEach((keyName) => {
                keyValue = keyName;
                if (keyValue.startsWith("'")) {
                    keyValue = keyValue.substr(1, keyValue.length - 2);
                }
            });
            const keyName = this.entityTypeDefinition.keys[0].name;
            outKeys[keyName] = keyValue;
        } else {
            outKeys = {};
            Object.keys(keyValues).forEach((keyName) => {
                outKeys[keyName] = keyValues[keyName];
                if (outKeys[keyName]?.startsWith && outKeys[keyName].startsWith("'")) {
                    outKeys[keyName] = outKeys[keyName].substr(1, outKeys[keyName].length - 2);
                }
            });
        }
        // Remove non key items only if all keys are provided
        let realKeys = outKeys;
        if (this.entityTypeDefinition.keys.every((keyProp) => outKeys[keyProp.name] !== undefined)) {
            realKeys = {};
            Object.keys(outKeys).forEach((keyName) => {
                if (this.entityTypeDefinition.keys.find((keyProp) => keyProp.name === keyName)) {
                    realKeys[keyName] = outKeys[keyName];
                }
            });
        }

        return realKeys;
    }

    public performGET(
        keyValues: KeyDefinitions,
        asArray: boolean,
        tenantId: string,
        dontClone = false,
        _odataRequest?: ODataRequest
    ): any {
        const currentMockData = this.getMockData(tenantId);
        if (keyValues && Object.keys(keyValues).length) {
            keyValues = this.prepareKeys(keyValues);
            const data = currentMockData.fetchEntries(keyValues);
            if (!data || (Array.isArray(data) && data.length === 0 && !asArray)) {
                if (!currentMockData.hasEntries()) {
                    return currentMockData.getEmptyObject();
                } else {
                    return null;
                }
            }
            if (Array.isArray(data) && !asArray) {
                if (dontClone) {
                    return data[0];
                }
                return cloneDeep(data[0]);
            }
            if (dontClone) {
                return data;
            }
            return cloneDeep(data);
        }
        if (this.entitySetDefinition?.entityType?.annotations?.Common?.ResultContext?.valueOf()) {
            // Parametrized entityset, they cannot be requested directly
            throw new Error(JSON.stringify({ message: 'Parametrized entityset need to be queried with keys' }));
        }
        if ((this.entitySetDefinition as any)?._type === 'Singleton') {
            return currentMockData.getDefaultElement();
        }
        if (!asArray) {
            return cloneDeep(currentMockData.getDefaultElement());
        }
        return currentMockData.getAllEntries(dontClone);
    }

    public async performPOST(
        keyValues: KeyDefinitions,
        postData: any,
        tenantId: string,
        _updateParent: boolean = false
    ): Promise<any> {
        // Validate potentially missing keys
        keyValues = this.prepareKeys(keyValues);
        const currentMockData = this.getMockData(tenantId);
        Object.keys(keyValues).forEach((key) => {
            if (!postData[key]) {
                postData[key] = keyValues[key];
            }
        });
        this.entityTypeDefinition.keys.forEach((keyProp) => {
            if (postData[keyProp.name] === undefined || postData[keyProp.name].length === 0) {
                // Missing key
                if (keyProp.name === 'IsActiveEntity') {
                    postData['IsActiveEntity'] = false;
                } else {
                    postData[keyProp.name] = currentMockData.generateKey(keyProp as Property);
                }
            }
        });
        let newObject = currentMockData.getEmptyObject();
        newObject = Object.assign(newObject, postData);
        await currentMockData.addEntry(newObject);
        return newObject;
    }

    public async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        _updateParent: boolean = false
    ): Promise<any> {
        keyValues = this.prepareKeys(keyValues);
        const data = this.performGET(keyValues, false, tenantId);
        const currentMockData = this.getMockData(tenantId);
        const updatedData = Object.assign(data, patchData);
        await currentMockData.onBeforeUpdateEntry(keyValues, updatedData);
        await currentMockData.updateEntry(keyValues, updatedData);
        await currentMockData.onAfterUpdateEntry(keyValues, updatedData);
        return updatedData;
    }

    public async performDELETE(
        keyValues: KeyDefinitions,
        tenantId: string,
        _updateParent: boolean = false
    ): Promise<void> {
        const currentMockData = this.getMockData(tenantId);
        keyValues = this.prepareKeys(keyValues);
        await currentMockData.removeEntry(keyValues);
    }

    public async executeAction(
        actionDefinition: Action,
        actionData: object | undefined,
        odataRequest: ODataRequest,
        keys: Record<string, any>
    ): Promise<any> {
        const currentMockData = this.getMockData(odataRequest.tenantId);
        keys = this.prepareKeys(keys);
        actionData = await currentMockData.onBeforeAction(actionDefinition, actionData, keys);
        let responseObject = await currentMockData.executeAction(actionDefinition, actionData, keys);
        responseObject = await currentMockData.onAfterAction(actionDefinition, actionData, keys, responseObject);
        return responseObject;
    }

    public async getParentEntityInterface(tenantId: string) {
        const parentEntitySetName = this.dataAccess.getMetadata().getParentEntitySetName(this.entitySetDefinition!);
        return this.getEntityInterface(parentEntitySetName!, tenantId);
    }
    public async getEntityInterface(entitySet: string, tenantId: string) {
        const mockEntitySet = await this.dataAccess.getMockEntitySet(entitySet);
        return mockEntitySet?.getMockData(tenantId);
    }
}
