import { join } from 'path';

import type { Action, EntitySet, EntityType, Property } from '@sap-ux/vocabularies-types';
import cloneDeep from 'lodash.clonedeep';
import { FileBasedMockData } from '../../mockdata/fileBasedMockData';
import type { MockDataContributor } from '../../mockdata/functionBasedMockData';
import { FunctionBasedMockData } from '../../mockdata/functionBasedMockData';
import type { FilterMethodCall, LambdaExpression } from '../../request/filterParser';
import type { KeyDefinitions } from '../../request/odataRequest';
import ODataRequest from '../../request/odataRequest';
import type { DataAccessInterface, EntitySetInterface } from '../common';
import { getData } from '../common';
import type { DataAccess } from '../dataAccess';

type PreparedFunction = {
    fn: Function;
    type: string;
};
function makeTransformationFn(type: string, preparedArgs: PreparedFunction[]) {
    return function (mockData: any) {
        const resolvedArgs = preparedArgs.map((preparedArg) => preparedArg.fn(mockData));
        return transformationFn(type, resolvedArgs[1])(resolvedArgs[0]);
    };
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
                return data.startsWith(prepareLiteral(check, 'Edm.String') as string);
            };
        case 'endswith':
            return (data: string) => {
                return data.endsWith(prepareLiteral(check, 'Edm.String') as string);
            };
        case 'substringof':
            return (data: string) => {
                return check.indexOf(prepareLiteral(data, 'Edm.String') as string) !== -1;
            };
        case 'contains':
            return (data: string) => {
                return data.indexOf(prepareLiteral(check, 'Edm.String') as string) !== -1;
            };
        case 'concat':
            return (data: string) => {
                return data + prepareLiteral(check, 'Edm.String');
            };
        case 'indexof':
            return (data: string) => {
                return data.indexOf(prepareLiteral(check, 'Edm.String') as string);
            };
        case 'substring':
            return (data: string) => {
                return data.substring(check);
            };
        case 'matchesPattern':
            const regExp = new RegExp(prepareLiteral(check, 'Edm.String') as string);
            return (data: string) => {
                return regExp.test(data);
            };
        case 'getData':
            return (data: any) => {
                return getData(data, check);
            };
        case 'noop':
        default:
            return (data: any) => data;
    }
}

function prepareLiteral(literal: string, propertyType: string) {
    if (!literal) {
        return literal;
    }
    switch (propertyType) {
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
        dataAccess.log.info(`Trying to find ${jsPath} for mockdata`);
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
            dataAccess.log.info(`Trying to find ${path} for mockdata`);
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
                dataAccess.log.info(`JSON file found for ${entity}`);
                if (isInitial) {
                    outData = outJsonData;
                    isInitial = false;
                } else {
                    (outData as any).getInitialDataSet = function () {
                        return outJsonData.concat();
                    };
                }
            } catch (e) {
                dataAccess.log.info(e as string);
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
    private _rootMockDataFn: MockDataContributor<object>;
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
            this.entityTypeDefinition = entitySetDefinition;
        } else {
            this.entitySetDefinition = entitySetDefinition;
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
                    this._rootMockDataFn = mockData as MockDataContributor<object>;
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

    protected checkSpecificProperties(
        _filterExpression: any,
        _mockData: any,
        _allData: any,
        _odataRequest: any
    ): boolean | null {
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

    public checkFilter(mockData: object, filterExpression: any, tenantId: string, odataRequest: ODataRequest): boolean {
        let isValid = true;
        if (filterExpression.hasOwnProperty('expressions')) {
            if (filterExpression.operator === 'AND') {
                isValid = filterExpression.expressions.every((filterValue: any) => {
                    return this.checkFilter(mockData, filterValue, tenantId, odataRequest);
                });
            } else {
                isValid = filterExpression.expressions.some((filterValue: any) => {
                    return this.checkFilter(mockData, filterValue, tenantId, odataRequest);
                });
            }
        } else {
            isValid = this.checkSimpleExpression(filterExpression, mockData, tenantId, odataRequest);
        }
        return isValid;
    }

    createTransformation(identifier: string | FilterMethodCall): PreparedFunction {
        if (typeof identifier === 'string') {
            const property = this.getProperty(identifier);
            if (property) {
                return { fn: transformationFn('getData', identifier), type: property.type };
            }
            return { fn: () => identifier, type: 'Edm.String' };
        } else {
            const methodArgTransformed = identifier.methodArgs.map((methodArg) => this.createTransformation(methodArg));
            const comparisonType =
                identifier.method === 'length' || identifier.method === 'indexof' ? 'Edm.Int16' : 'Edm.String';
            return { fn: makeTransformationFn(identifier.method, methodArgTransformed), type: comparisonType };
        }
    }

    public checkSimpleExpression(filterExpression: any, mockData: any, tenantId: string, odataRequest: ODataRequest) {
        const identifier = filterExpression.identifier;
        const operator = filterExpression.operator;
        const literal = filterExpression.literal;
        if (identifier.type === 'lambda') {
            return this.checkLambdaExpression(identifier, transformationFn('noop'), mockData, tenantId, odataRequest);
        }
        let identifierFn = this.createTransformation(identifier);

        let literalFn: PreparedFunction = {
            fn: makeTransformationFn('noop', [{ fn: () => true, type: 'Edm.Boolean' }]),
            type: 'Edm.Boolean'
        };
        if (literal) {
            literalFn = this.createTransformation(literal);
        }
        let property;
        if (filterExpression.propertyPath) {
            // We're possibly in a lambda operation so let's try to see if the first part is a real property
            property = this.getProperty(filterExpression.propertyPath);
            identifierFn = { fn: transformationFn('getData', identifier), type: property.type };
        }

        const currentMockData = this.getMockData(tenantId);
        const specificCheck = this.checkSpecificProperties(filterExpression, mockData, currentMockData, odataRequest);
        if (specificCheck !== null) {
            return specificCheck;
        }
        const mockValue = identifierFn.fn(mockData);
        const literalValue = literalFn.fn(mockData);
        const comparisonType = identifierFn.type;

        if (literal === undefined) {
            return mockValue === true;
        }
        return currentMockData.checkFilterValue(comparisonType, mockValue, literalValue, operator, odataRequest);
    }

    private checkLambdaExpression(
        expression: LambdaExpression,
        identifierTransformation: (data: any) => any,
        mockData: any,
        tenantId: string,
        odataRequest: ODataRequest
    ) {
        let mockDataToCheckValue = identifierTransformation(getData(mockData, expression.target));
        if (!Array.isArray(mockDataToCheckValue)) {
            mockDataToCheckValue = [mockDataToCheckValue];
        }
        if (expression.expression.expressions) {
            expression.expression.expressions.forEach((entry: any) => {
                const replaceValue = expression.propertyPath || expression.target;
                if (typeof entry.identifier === 'string') {
                    entry.propertyPath = entry.identifier.replace(expression.key, replaceValue);
                } else {
                    entry.identifier.propertyPath = entry.identifier.target.replace(expression.key, replaceValue);
                }
            });
        }

        const check = (subMockData: any) => {
            let mockDataToCheck = subMockData;
            if (expression.key && expression.key.length > 0) {
                mockDataToCheck = { [expression.key]: subMockData };
            }
            return this.checkFilter(mockDataToCheck, expression.expression, tenantId, odataRequest);
        };

        switch (expression.operator) {
            case 'ALL':
                return mockDataToCheckValue.every(check);
            case 'ANY':
                return mockDataToCheckValue.some(check);
        }
    }

    public checkSearch(mockData: any, searchQueries: string[], _odataRequest: ODataRequest): boolean {
        const currentMockData = this.getMockData(_odataRequest.tenantId);
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
                return currentMockData.checkSearchQuery(mockValue, searchQuery, _odataRequest);
            });
        });
    }

    public checkKeyValue(mockData: any, keyValues: any, keyName: string, keyProp?: Property): boolean {
        if (keyProp) {
            switch (keyProp.type) {
                case 'Edm.Guid':
                    if (keyValues[keyName] && keyValues[keyName].startsWith("guid'")) {
                        return mockData[keyName] === keyValues[keyName].substring(5, keyValues[keyName].length - 1);
                    }
                    return mockData[keyName] === keyValues[keyName];
                case 'Edm.String':
                case 'Edm.Boolean':
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
        if (Object.keys(keyValues).length === 1 && Object.keys(keyValues)[0] === '') {
            // "default" key - .../Entity('abc')
            const keyName = this.entityTypeDefinition.keys[0].name;
            return { [keyName]: keyValues[''] };
        } else {
            // named keys - .../Entity(ID='abc')
            return { ...keyValues };
        }
    }

    public performGET(
        keyValues: KeyDefinitions,
        asArray: boolean,
        tenantId: string,
        odataRequest: ODataRequest,
        dontClone = false
    ): any {
        const currentMockData = this.getMockData(tenantId);
        if (keyValues && Object.keys(keyValues).length) {
            keyValues = this.prepareKeys(keyValues);
            const data = currentMockData.fetchEntries(keyValues, odataRequest);
            if (!data || (Array.isArray(data) && data.length === 0 && !asArray)) {
                if (!currentMockData.hasEntries(odataRequest)) {
                    return currentMockData.getEmptyObject(odataRequest);
                } else {
                    return null;
                }
            }
            let outData: any = data;
            if (Array.isArray(outData) && !asArray) {
                outData = outData[0];
            }
            if (!dontClone) {
                outData = cloneDeep(outData);
            }
            return outData;
        }
        if (this.entitySetDefinition?.entityType?.annotations?.Common?.ResultContext?.valueOf()) {
            // Parametrized entityset, they cannot be requested directly
            throw new Error(JSON.stringify({ message: 'Parametrized entityset need to be queried with keys' }));
        }
        if ((this.entitySetDefinition as any)?._type === 'Singleton') {
            return currentMockData.getDefaultElement(odataRequest);
        }
        if (!asArray) {
            return cloneDeep(currentMockData.getDefaultElement(odataRequest));
        }
        return currentMockData.getAllEntries(odataRequest, dontClone);
    }

    public async performPOST(
        keyValues: KeyDefinitions,
        postData: any,
        tenantId: string,
        odataRequest: ODataRequest,
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
                    postData[keyProp.name] = currentMockData.generateKey(keyProp);
                }
            }
        });
        let newObject = currentMockData.getEmptyObject(odataRequest);
        for (const navigationProperty of this.entityTypeDefinition.navigationProperties) {
            const navigationPropertyBindgOperator = `${navigationProperty.name}@odata.bind`;
            if (postData.hasOwnProperty(navigationPropertyBindgOperator)) {
                const reference = postData[navigationPropertyBindgOperator];
                if (this.entitySetDefinition?.navigationPropertyBinding[navigationProperty.name]) {
                    const content = await this.dataAccess.getData(
                        new ODataRequest(
                            {
                                method: 'GET',
                                url: '/' + reference,
                                tenantId
                            },
                            this.dataAccess as DataAccess
                        )
                    );
                    for (const referentialConstraint of navigationProperty.referentialConstraint) {
                        postData[referentialConstraint.sourceProperty] = content[referentialConstraint.targetProperty];
                    }
                }

                delete postData[navigationPropertyBindgOperator];
            }
        }
        newObject = Object.assign(newObject, postData);
        await currentMockData.addEntry(newObject, odataRequest);
        return newObject;
    }

    public async performPATCH(
        keyValues: KeyDefinitions,
        patchData: any,
        tenantId: string,
        odataRequest: ODataRequest,
        _updateParent: boolean = false
    ): Promise<any> {
        keyValues = this.prepareKeys(keyValues);
        const data = this.performGET(keyValues, false, tenantId, odataRequest);
        const currentMockData = this.getMockData(tenantId);
        const updatedData = Object.assign(data, patchData);
        for (const navigationProperty of this.entityTypeDefinition.navigationProperties) {
            const navigationPropertyBindgOperator = `${navigationProperty.name}@odata.bind`;
            if (patchData.hasOwnProperty(navigationPropertyBindgOperator)) {
                const reference = patchData[navigationPropertyBindgOperator];
                if (reference === null) {
                    for (const referentialConstraint of navigationProperty.referentialConstraint) {
                        delete updatedData[referentialConstraint.sourceProperty];
                    }
                } else if (this.entitySetDefinition?.navigationPropertyBinding[navigationProperty.name]) {
                    const content = await this.dataAccess.getData(
                        new ODataRequest(
                            {
                                method: 'GET',
                                url: '/' + reference
                            },
                            this.dataAccess as DataAccess
                        )
                    );
                    for (const referentialConstraint of navigationProperty.referentialConstraint) {
                        updatedData[referentialConstraint.sourceProperty] =
                            content[referentialConstraint.targetProperty];
                    }
                }

                delete updatedData[navigationPropertyBindgOperator];
            }
        }

        await currentMockData.onBeforeUpdateEntry(keyValues, updatedData, odataRequest);
        await currentMockData.updateEntry(keyValues, updatedData, patchData, odataRequest);
        await currentMockData.onAfterUpdateEntry(keyValues, updatedData, odataRequest);
        return updatedData;
    }

    public async performDELETE(
        keyValues: KeyDefinitions,
        tenantId: string,
        odataRequest: ODataRequest,
        _updateParent: boolean = false
    ): Promise<void> {
        const currentMockData = this.getMockData(tenantId);
        keyValues = this.prepareKeys(keyValues);

        const entryToRemove = currentMockData.fetchEntries(keyValues, odataRequest);
        let additionalEntriesToRemove: any[] = [];
        for (const aggregationElementName in this.entityTypeDefinition.annotations.Aggregation) {
            if (aggregationElementName.startsWith('RecursiveHierarchy')) {
                const recursiveHierarchy =
                    this.entityTypeDefinition.annotations.Aggregation[
                        aggregationElementName as `RecursiveHierarchy#xxx`
                    ]!;
                const allData = currentMockData.getAllEntries(odataRequest, true);
                additionalEntriesToRemove = await currentMockData.getDescendants(
                    allData,
                    allData,
                    entryToRemove,
                    this.entityTypeDefinition,
                    {
                        hierarchyRoot: '',
                        inputSetTransformations: [],
                        qualifier: recursiveHierarchy.qualifier,
                        propertyPath: '',
                        maximumDistance: -1,
                        keepStart: false
                    },
                    odataRequest
                );
            }
        }

        await currentMockData.removeEntry(keyValues, odataRequest);
        if (additionalEntriesToRemove.length > 0) {
            for (const additionalEntriesToRemoveElement of additionalEntriesToRemove) {
                await this.performDELETE(this.getKeys(additionalEntriesToRemoveElement), tenantId, odataRequest, true);
            }
        }
    }

    public async executeAction(
        actionDefinition: Action,
        actionData: object | undefined,
        odataRequest: ODataRequest,
        keys: Record<string, any>
    ): Promise<any> {
        const currentMockData = this.getMockData(odataRequest.tenantId);
        keys = this.prepareKeys(keys);
        actionData = await currentMockData.onBeforeAction(actionDefinition, actionData, keys, odataRequest);
        let responseObject = await currentMockData.executeAction(actionDefinition, actionData, keys, odataRequest);
        responseObject = await currentMockData.onAfterAction(
            actionDefinition,
            actionData,
            keys,
            responseObject,
            odataRequest
        );
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
