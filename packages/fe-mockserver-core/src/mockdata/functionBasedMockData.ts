import type { Action, EntityType, NavigationProperty, Property } from '@sap-ux/vocabularies-types';
import type { EntitySetInterface, PartialReferentialConstraint } from '../data/common';
import { ExecutionError } from '../data/common';
import type { AncestorDescendantsParameters, TopLevelParameters } from '../request/applyParser';
import type ODataRequest from '../request/odataRequest';
import type { KeyDefinitions } from '../request/odataRequest';
import { FileBasedMockData } from './fileBasedMockData';

export type MockDataContributor<T extends object> = {
    getInitialDataSet?: (contextId: string) => T[];
    addEntry?: (mockEntry: T, odataRequest: ODataRequest) => void;
    updateEntry?: (keyValues: KeyDefinitions, newData: T, updatedData: T, odataRequest: ODataRequest) => Promise<void>;
    removeEntry?: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => void;
    hasEntry?: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => boolean;
    hasEntries?: (odataRequest: ODataRequest) => boolean;
    fetchEntries?: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => T[];
    getAllEntries?: (odataRequest: ODataRequest) => Promise<T[]>;
    getEmptyObject?: (odataRequest: ODataRequest) => T;
    getDefaultElement?: (odataRequest: ODataRequest) => T;

    getReferentialConstraints?: (_navigationProperty: NavigationProperty) => PartialReferentialConstraint[] | undefined;
    generateKey?: (property: Property, lineIndex: number, odataRequest: ODataRequest) => any;
    checkSearchQuery?: (mockData: any, searchQuery: string, odataRequest: ODataRequest) => boolean;
    checkFilterValue?: (
        comparisonType: string,
        mockValue: any,
        literal: any,
        operator: string,
        odataRequest: ODataRequest
    ) => boolean;

    getTopLevels?(object: any[], _parameters: TopLevelParameters, _odataRequest: ODataRequest): Promise<object[]>;
    getDescendants?(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        hierarchyData: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]>;
    getAncestors?(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        limitedHierarchy: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]>;

    onBeforeAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object>;
    executeAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object | undefined>;
    onAfterAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        responseData: any,
        odataRequest: ODataRequest
    ): Promise<any>;
    onAfterRead?(data: T | T[], odataRequest: ODataRequest): Promise<T | T[]>;
    onAfterUpdateEntry?(keyValues: KeyDefinitions, updatedData: T, odataRequest: ODataRequest): Promise<void>;
    onBeforeUpdateEntry?(keyValues: KeyDefinitions, updatedData: T, odataRequest: ODataRequest): Promise<void>;
    hasCustomAggregate?(customAggregateName: string, odataRequest: ODataRequest): boolean;
    performCustomAggregate?(customAggregateName: string, dataToAggregate: any[], odataRequest: ODataRequest): any;
    throwError?(
        message: string,
        statusCode?: number,
        messageData?: object,
        isSAPMessage?: boolean,
        headers?: Record<string, string>,
        isGlobalRequestError?: boolean
    ): any;
    base?: {
        generateMockData: () => void;
        generateKey: (property: Property, lineIndex?: number, mockData?: any) => any;
        addEntry: (mockEntry: T, odataRequest: ODataRequest) => Promise<void>;
        updateEntry: (keyValues: KeyDefinitions, newData: T, odataRequest: ODataRequest) => Promise<void>;
        removeEntry: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => Promise<void>;
        hasEntry: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => boolean;
        fetchEntries: (keyValues: KeyDefinitions, odataRequest: ODataRequest) => Promise<T[]>;
        hasEntries: (odataRequest: ODataRequest) => boolean;
        getAllEntries: (odataRequest: ODataRequest) => Promise<T[]>;
        getEmptyObject: (odataRequest: ODataRequest) => T;
        getDefaultElement: (odataRequest: ODataRequest) => T;
        getParentEntityInterface: () => Promise<FileBasedMockData | undefined>;
        getEntityInterface: (entityName: string) => Promise<FileBasedMockData | undefined>;
        checkSearchQuery: (mockData: any, searchQuery: string, odataRequest: ODataRequest) => boolean;
        checkFilterValue: (
            comparisonType: string,
            mockValue: any,
            literal: any,
            operator: string,
            odataRequest: ODataRequest
        ) => boolean;
    };
};

/**
 *
 */
export class FunctionBasedMockData extends FileBasedMockData {
    private _mockDataFn: MockDataContributor<object>;

    constructor(
        mockDataFn: MockDataContributor<object>,
        entityType: EntityType,
        mockDataEntitySet: EntitySetInterface,
        contextId: string
    ) {
        const noMock: any = [];
        noMock.__generateMockData = true;
        const targetMock: any = {};
        for (const targetMockKey in mockDataFn) {
            targetMock[targetMockKey] = mockDataFn[targetMockKey as keyof typeof mockDataFn];
        }
        super(
            (mockDataFn?.getInitialDataSet ? mockDataFn.getInitialDataSet(contextId) : noMock) || noMock,
            entityType,
            mockDataEntitySet,
            contextId
        );
        this._mockDataFn = targetMock;

        this._mockDataFn.base = {
            generateMockData: super.generateMockData.bind(this),
            generateKey: super.generateKey.bind(this),
            addEntry: (postData: any) => {
                this._entityType.keys.forEach((keyProp) => {
                    if (postData[keyProp.name] === undefined || postData[keyProp.name].length === 0) {
                        // Missing key
                        if (keyProp.name === 'IsActiveEntity') {
                            postData['IsActiveEntity'] = false;
                        } else {
                            postData[keyProp.name] = super.generateKey(keyProp);
                        }
                    }
                });
                let newObject = super.getEmptyObject({} as any);
                newObject = Object.assign(newObject, postData);
                return super.addEntry(newObject, {} as any);
            },
            updateEntry: async (keyValues: KeyDefinitions, patchData: object, odataRequest) => {
                const data = (await this.fetchEntries(keyValues, odataRequest))[0];
                const updatedData = Object.assign(data, patchData);
                return super.updateEntry(keyValues, updatedData, patchData, odataRequest);
            },
            removeEntry: super.removeEntry.bind(this),
            fetchEntries: super.fetchEntries.bind(this),
            hasEntry: super.hasEntry.bind(this),
            hasEntries: super.hasEntries.bind(this),
            getAllEntries: super.getAllEntries.bind(this) as any,
            getEmptyObject: super.getEmptyObject.bind(this),
            getDefaultElement: super.getDefaultElement.bind(this),
            getParentEntityInterface: super.getParentEntityInterface.bind(this),
            getEntityInterface: super.getEntityInterface.bind(this),
            checkFilterValue: super.checkFilterValue.bind(this),
            checkSearchQuery: super.checkSearchQuery.bind(this)
        };
        this._mockDataFn.throwError = function (
            message: string,
            statusCode = 500,
            messageData?: object,
            isSAPMessage = false,
            headers: Record<string, string> = {},
            isGlobalRequestError?: boolean
        ) {
            throw new ExecutionError(message, statusCode, messageData, isSAPMessage, headers, isGlobalRequestError);
        };
    }

    async addEntry(mockEntry: any, odataRequest: ODataRequest): Promise<void> {
        if (this._mockDataFn.addEntry) {
            return this._mockDataFn.addEntry(mockEntry, odataRequest);
        }
        return super.addEntry(mockEntry, odataRequest);
    }

    async updateEntry(
        keyValues: KeyDefinitions,
        updatedData: object,
        patchData: object,
        odataRequest: ODataRequest
    ): Promise<void> {
        if (this._mockDataFn.updateEntry) {
            return this._mockDataFn.updateEntry(keyValues, updatedData, patchData, odataRequest);
        }
        return super.updateEntry(keyValues, updatedData, patchData, odataRequest);
    }

    async removeEntry(keyValues: KeyDefinitions, odataRequest: ODataRequest): Promise<void> {
        if (this._mockDataFn.removeEntry) {
            return this._mockDataFn.removeEntry(keyValues, odataRequest);
        }
        return super.removeEntry(keyValues, odataRequest);
    }

    async fetchEntries(keyValues: KeyDefinitions, odataRequest: ODataRequest): Promise<object[]> {
        if (this._mockDataFn?.fetchEntries) {
            return this._mockDataFn.fetchEntries(keyValues, odataRequest);
        } else {
            return super.fetchEntries(keyValues, odataRequest);
        }
    }

    hasEntry(keyValues: KeyDefinitions, odataRequest: ODataRequest): boolean {
        if (this._mockDataFn.hasEntry) {
            return this._mockDataFn.hasEntry(keyValues, odataRequest);
        }
        return super.hasEntry(keyValues, odataRequest);
    }

    hasEntries(odataRequest: ODataRequest): boolean {
        if (this._mockDataFn.hasEntries) {
            return this._mockDataFn.hasEntries(odataRequest);
        }
        return super.hasEntries(odataRequest);
    }

    getEmptyObject(odataRequest: ODataRequest): object {
        if (this._mockDataFn?.getEmptyObject) {
            return this._mockDataFn.getEmptyObject(odataRequest);
        } else {
            return super.getEmptyObject(odataRequest);
        }
    }

    getDefaultElement(odataRequest: ODataRequest): object {
        if (this._mockDataFn?.getDefaultElement) {
            return this._mockDataFn.getDefaultElement(odataRequest);
        } else {
            return super.getDefaultElement(odataRequest);
        }
    }

    generateKey(property: Property, lineIndex: number, odataRequest: ODataRequest) {
        if (this._mockDataFn?.generateKey) {
            return this._mockDataFn.generateKey(property, lineIndex, odataRequest);
        } else {
            return super.generateKey(property, lineIndex, odataRequest);
        }
    }

    async getAllEntries(odataRequest: ODataRequest, dontClone: boolean = false): Promise<object[]> {
        if (this._mockDataFn?.getAllEntries) {
            return this._mockDataFn.getAllEntries(odataRequest);
        } else {
            return super.getAllEntries(odataRequest, dontClone);
        }
    }

    async onBeforeAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object> {
        if (this._mockDataFn?.onBeforeAction) {
            return this._mockDataFn.onBeforeAction(actionDefinition, actionData, keys, odataRequest);
        } else {
            return super.onBeforeAction(actionDefinition, actionData, keys, odataRequest);
        }
    }

    async onAfterRead(data: object | object[], odataRequest: ODataRequest): Promise<object | object[]> {
        if (this._mockDataFn?.onAfterRead) {
            return this._mockDataFn.onAfterRead(data, odataRequest);
        } else {
            return super.onAfterRead(data, odataRequest);
        }
    }

    async executeAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object | undefined> {
        if (this._mockDataFn?.executeAction) {
            return this._mockDataFn.executeAction(actionDefinition, actionData, keys, odataRequest);
        } else {
            return super.executeAction(actionDefinition, actionData, keys, odataRequest);
        }
    }

    async onAfterAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        responseData: any,
        odataRequest: ODataRequest
    ): Promise<any> {
        if (this._mockDataFn?.onAfterAction) {
            return this._mockDataFn.onAfterAction(actionDefinition, actionData, keys, responseData, odataRequest);
        } else {
            return super.onAfterAction(actionDefinition, actionData, keys, responseData, odataRequest);
        }
    }

    async onAfterUpdateEntry(
        keyValues: KeyDefinitions,
        updatedData: object,
        odataRequest: ODataRequest
    ): Promise<void> {
        if (this._mockDataFn?.onAfterUpdateEntry) {
            return this._mockDataFn.onAfterUpdateEntry(keyValues, updatedData, odataRequest);
        } else {
            return super.onAfterUpdateEntry(keyValues, updatedData, odataRequest);
        }
    }

    async onBeforeUpdateEntry(
        keyValues: KeyDefinitions,
        updatedData: object,
        odataRequest: ODataRequest
    ): Promise<void> {
        if (this._mockDataFn?.onBeforeUpdateEntry) {
            return this._mockDataFn.onBeforeUpdateEntry(keyValues, updatedData, odataRequest);
        } else {
            return super.onBeforeUpdateEntry(keyValues, updatedData, odataRequest);
        }
    }
    hasCustomAggregate(customAggregateName: string, odataRequest: ODataRequest): boolean {
        if (this._mockDataFn?.hasCustomAggregate) {
            return this._mockDataFn.hasCustomAggregate(customAggregateName, odataRequest);
        } else {
            return super.hasCustomAggregate(customAggregateName, odataRequest);
        }
    }

    performCustomAggregate(customAggregateName: string, dataToAggregate: any[], odataRequest: ODataRequest): any {
        if (this._mockDataFn?.performCustomAggregate) {
            return this._mockDataFn.performCustomAggregate(customAggregateName, dataToAggregate, odataRequest);
        } else {
            return super.performCustomAggregate(customAggregateName, dataToAggregate, odataRequest);
        }
    }
    checkSearchQuery(mockValue: any, searchQuery: string, odataRequest: ODataRequest) {
        if (this._mockDataFn?.checkSearchQuery) {
            return this._mockDataFn.checkSearchQuery(mockValue, searchQuery, odataRequest);
        } else {
            return super.checkSearchQuery(mockValue, searchQuery, odataRequest);
        }
    }
    checkFilterValue(
        comparisonType: string,
        mockValue: any,
        literal: any,
        operator: string,
        odataRequest: ODataRequest
    ) {
        if (this._mockDataFn?.checkFilterValue) {
            return this._mockDataFn.checkFilterValue(comparisonType, mockValue, literal, operator, odataRequest);
        } else {
            return super.checkFilterValue(comparisonType, mockValue, literal, operator, odataRequest);
        }
    }

    getReferentialConstraints(_navigationProperty: NavigationProperty): PartialReferentialConstraint[] | undefined {
        if (this._mockDataFn?.getReferentialConstraints) {
            return this._mockDataFn.getReferentialConstraints(_navigationProperty);
        } else {
            return super.getReferentialConstraints(_navigationProperty);
        }
    }

    async getTopLevels(object: any[], _parameters: TopLevelParameters, _odataRequest: ODataRequest): Promise<object[]> {
        if (this._mockDataFn?.getTopLevels) {
            return this._mockDataFn.getTopLevels(object, _parameters, _odataRequest);
        } else {
            return super.getTopLevels(object, _parameters, _odataRequest);
        }
    }
    async getDescendants(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        hierarchyData: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]> {
        if (this._mockDataFn?.getDescendants) {
            return this._mockDataFn.getDescendants(
                inputSet,
                lastFilterTransformationResult,
                hierarchyData,
                entityType,
                _parameters,
                _odataRequest
            );
        } else {
            return super.getDescendants(
                inputSet,
                lastFilterTransformationResult,
                hierarchyData,
                entityType,
                _parameters,
                _odataRequest
            );
        }
    }
    getAncestors(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        limitedHierarchy: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]> {
        if (this._mockDataFn?.getAncestors) {
            return this._mockDataFn.getAncestors(
                inputSet,
                lastFilterTransformationResult,
                limitedHierarchy,
                entityType,
                _parameters,
                _odataRequest
            );
        } else {
            return super.getAncestors(
                inputSet,
                lastFilterTransformationResult,
                limitedHierarchy,
                entityType,
                _parameters,
                _odataRequest
            );
        }
    }
}
