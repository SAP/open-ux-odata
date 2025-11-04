import type { Action, EntityType, NavigationProperty, Property } from '@sap-ux/vocabularies-types';
import type { PartialReferentialConstraint } from '../data/common';
import { ExecutionError } from '../data/common';
import type { AncestorDescendantsParameters, TopLevelParameters } from '../request/applyParser';
import type ODataRequest from '../request/odataRequest';
import type { KeyDefinitions } from '../request/odataRequest';
import type { MockDataContributorBase } from './functionBasedMockData';
import type { MockEntityContainerBase } from './mockEntityContainer';

export class MockDataContributorClass<T extends object> {
    constructor(public base: MockDataContributorBase<T>) {}
    getInitialDataSet?(contextId: string): T[];
    addEntry?(mockEntry: T, odataRequest: ODataRequest): void;
    updateEntry?(keyValues: KeyDefinitions, newData: T, updatedData: T, odataRequest: ODataRequest): Promise<void>;
    removeEntry?(keyValues: KeyDefinitions, odataRequest: ODataRequest): void;
    hasEntry?(keyValues: KeyDefinitions, odataRequest: ODataRequest): boolean;
    hasEntries?(odataRequest: ODataRequest): boolean;
    fetchEntries?(keyValues: KeyDefinitions, odataRequest: ODataRequest): T[];
    getAllEntries?(odataRequest: ODataRequest): Promise<T[]>;
    getEmptyObject?(odataRequest: ODataRequest): T;
    getDefaultElement?(odataRequest: ODataRequest): T;

    getReferentialConstraints?(_navigationProperty: NavigationProperty): PartialReferentialConstraint[] | undefined;
    generateKey?(property: Property, lineIndex: number, odataRequest: ODataRequest): any;
    checkSearchQuery?(mockData: any, searchQuery: string, odataRequest: ODataRequest): boolean;
    checkFilterValue?(
        comparisonType: string,
        mockValue: any,
        literal: any,
        operator: string,
        odataRequest: ODataRequest
    ): boolean;

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
    throwError(
        message: string,
        statusCode = 500,
        messageData?: object,
        isSAPMessage = false,
        headers: Record<string, string> = {},
        isGlobalRequestError?: boolean
    ) {
        throw new ExecutionError(message, statusCode, messageData, isSAPMessage, headers, isGlobalRequestError);
    }
}

export class MockEntityContainerContributorClass {
    constructor(public base: MockEntityContainerBase) {}
    executeAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<unknown>;
    handleRequest?(odataRequest: ODataRequest): Promise<unknown>;
    throwError(message: string, statusCode = 500, messageData?: object, isSAPMessage = false) {
        throw new ExecutionError(message, statusCode, messageData, isSAPMessage);
    }
}
