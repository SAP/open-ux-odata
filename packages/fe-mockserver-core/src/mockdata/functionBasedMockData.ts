import type { KeyDefinitions } from './fileBasedMockData';
import { FileBasedMockData } from './fileBasedMockData';
import type { Action, EntityType, Property } from '@sap-ux/vocabularies-types';
import type { EntitySetInterface } from '../data/common';
import { ExecutionError } from '../data/common';

export type MockDataContributor = {
    getInitialDataSet?: (contextId: string) => object[];
    addEntry?: (mockEntry: object) => void;
    updateEntry?: (keyValues: KeyDefinitions, newData: object) => Promise<void>;
    removeEntry?: (keyValues: KeyDefinitions) => void;
    hasEntry?: (keyValues: KeyDefinitions) => boolean;
    hasEntries?: () => boolean;
    fetchEntries?: (keyValues: KeyDefinitions) => object[];
    getAllEntries?: (dontClone?: boolean) => object[];
    getEmptyObject?: () => object;
    getDefaultElement?: () => object;
    generateKey?: (property: Property) => any;
    onBeforeAction?(actionDefinition: Action, actionData: any, keys: Record<string, any>): Promise<object>;
    executeAction?(actionDefinition: Action, actionData: any, keys: Record<string, any>): Promise<object>;
    onAfterAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        responseData: any
    ): Promise<any>;
    onAfterUpdateEntry?(keyValues: KeyDefinitions, updatedData: object): Promise<void>;
    onBeforeUpdateEntry?(keyValues: KeyDefinitions, updatedData: object): Promise<void>;
    hasCustomAggregate?(customAggregateName: string): boolean;
    performCustomAggregate?(customAggregateName: string, dataToAggregate: any[]): any;
    throwError?(message: string, statusCode?: number, messageData?: object): any;
    base?: {
        generateMockData: () => void;
        generateKey: (property: Property, lineIndex?: number, mockData?: any) => any;
        addEntry: (mockEntry: object) => void;
        updateEntry: (keyValues: KeyDefinitions, newData: object) => void;
        removeEntry: (keyValues: KeyDefinitions) => void;
        hasEntry: (keyValues: KeyDefinitions) => boolean;
        fetchEntries: (keyValues: KeyDefinitions) => object[];
        hasEntries: () => boolean;
        getAllEntries: () => object[];
        getEmptyObject: () => object;
        getDefaultElement: () => object;
        getParentEntityInterface: () => Promise<FileBasedMockData | undefined>;
        getEntityInterface: (entityName: string) => Promise<FileBasedMockData | undefined>;
    };
};

/**
 *
 */
export class FunctionBasedMockData extends FileBasedMockData {
    private _mockDataFn: MockDataContributor;

    constructor(
        mockDataFn: MockDataContributor,
        entityType: EntityType,
        mockDataEntitySet: EntitySetInterface,
        contextId: string
    ) {
        const noMock: any = [];
        noMock.__generateMockData = true;
        super(
            (mockDataFn?.getInitialDataSet ? mockDataFn.getInitialDataSet(contextId) : noMock) || noMock,
            entityType,
            mockDataEntitySet,
            contextId
        );
        this._mockDataFn = mockDataFn;
        this._mockDataFn.base = {
            generateMockData: super.generateMockData.bind(this),
            generateKey: super.generateKey.bind(this),
            addEntry: super.addEntry.bind(this),
            updateEntry: (keyValues: KeyDefinitions, patchData: object) => {
                const data = this.fetchEntries(keyValues)[0];
                const updatedData = Object.assign(data, patchData);
                return super.updateEntry(keyValues, updatedData);
            },
            removeEntry: super.removeEntry.bind(this),
            fetchEntries: super.fetchEntries.bind(this),
            hasEntry: super.hasEntry.bind(this),
            hasEntries: super.hasEntries.bind(this),
            getAllEntries: super.getAllEntries.bind(this),
            getEmptyObject: super.getEmptyObject.bind(this),
            getDefaultElement: super.getDefaultElement.bind(this),
            getParentEntityInterface: super.getParentEntityInterface.bind(this),
            getEntityInterface: super.getEntityInterface.bind(this)
        };
        this._mockDataFn.throwError = function (
            message: string,
            statusCode = 500,
            messageData?: object,
            isSAPMessage = false,
            headers: Record<string, string> = {}
        ) {
            throw new ExecutionError(message, statusCode, messageData, isSAPMessage, headers);
        };
    }

    async addEntry(mockEntry: any): Promise<void> {
        if (this._mockDataFn.addEntry) {
            return this._mockDataFn.addEntry(mockEntry);
        }
        return super.addEntry(mockEntry);
    }

    async updateEntry(keyValues: KeyDefinitions, updatedData: object): Promise<void> {
        if (this._mockDataFn.updateEntry) {
            return this._mockDataFn.updateEntry(keyValues, updatedData);
        }
        return super.updateEntry(keyValues, updatedData);
    }

    async removeEntry(keyValues: KeyDefinitions): Promise<void> {
        if (this._mockDataFn.removeEntry) {
            return this._mockDataFn.removeEntry(keyValues);
        }
        return super.removeEntry(keyValues);
    }

    fetchEntries(keyValues: KeyDefinitions): object[] {
        if (this._mockDataFn?.fetchEntries) {
            return this._mockDataFn.fetchEntries(keyValues);
        } else {
            return super.fetchEntries(keyValues);
        }
    }

    hasEntry(keyValues: KeyDefinitions): boolean {
        if (this._mockDataFn.hasEntry) {
            return this._mockDataFn.hasEntry(keyValues);
        }
        return super.hasEntry(keyValues);
    }

    hasEntries(): boolean {
        if (this._mockDataFn.hasEntries) {
            return this._mockDataFn.hasEntries();
        }
        return super.hasEntries();
    }

    getEmptyObject(): object {
        if (this._mockDataFn?.getEmptyObject) {
            return this._mockDataFn.getEmptyObject();
        } else {
            return super.getEmptyObject();
        }
    }

    getDefaultElement(): object {
        if (this._mockDataFn?.getDefaultElement) {
            return this._mockDataFn.getDefaultElement();
        } else {
            return super.getDefaultElement();
        }
    }

    generateKey(property: Property, lineIndex: number) {
        if (this._mockDataFn?.generateKey) {
            return this._mockDataFn.generateKey(property);
        } else {
            return super.generateKey(property, lineIndex);
        }
    }

    getAllEntries(dontClone: boolean = false): object[] {
        if (this._mockDataFn?.getAllEntries) {
            return this._mockDataFn.getAllEntries(dontClone);
        } else {
            return super.getAllEntries(dontClone);
        }
    }

    async onBeforeAction(actionDefinition: Action, actionData: any, keys: Record<string, any>): Promise<object> {
        if (this._mockDataFn?.onBeforeAction) {
            return this._mockDataFn.onBeforeAction(actionDefinition, actionData, keys);
        } else {
            return super.onBeforeAction(actionDefinition, actionData, keys);
        }
    }

    async executeAction(actionDefinition: Action, actionData: any, keys: Record<string, any>): Promise<object> {
        if (this._mockDataFn?.executeAction) {
            return this._mockDataFn.executeAction(actionDefinition, actionData, keys);
        } else {
            return super.executeAction(actionDefinition, actionData, keys);
        }
    }

    async onAfterAction(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        responseData: any
    ): Promise<any> {
        if (this._mockDataFn?.onAfterAction) {
            return this._mockDataFn.onAfterAction(actionDefinition, actionData, keys, responseData);
        } else {
            return super.onAfterAction(actionDefinition, actionData, keys, responseData);
        }
    }

    async onAfterUpdateEntry(keyValues: KeyDefinitions, updatedData: object): Promise<void> {
        if (this._mockDataFn?.onAfterUpdateEntry) {
            return this._mockDataFn.onAfterUpdateEntry(keyValues, updatedData);
        } else {
            return super.onAfterUpdateEntry(keyValues, updatedData);
        }
    }

    async onBeforeUpdateEntry(keyValues: KeyDefinitions, updatedData: object): Promise<void> {
        if (this._mockDataFn?.onBeforeUpdateEntry) {
            return this._mockDataFn.onBeforeUpdateEntry(keyValues, updatedData);
        } else {
            return super.onBeforeUpdateEntry(keyValues, updatedData);
        }
    }
    hasCustomAggregate(customAggregateName: string): boolean {
        if (this._mockDataFn?.hasCustomAggregate) {
            return this._mockDataFn.hasCustomAggregate(customAggregateName);
        } else {
            return super.hasCustomAggregate(customAggregateName);
        }
    }

    performCustomAggregate(customAggregateName: string, dataToAggregate: any[]): any {
        if (this._mockDataFn?.performCustomAggregate) {
            return this._mockDataFn.performCustomAggregate(customAggregateName, dataToAggregate);
        } else {
            return super.performCustomAggregate(customAggregateName, dataToAggregate);
        }
    }
}
