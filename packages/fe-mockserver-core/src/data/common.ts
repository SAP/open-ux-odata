import type { Action, EntitySet, EntityType, Property } from '@sap-ux/vocabularies-types';
import type { ODataMetadata } from './metadata';
import type { FileBasedMockData, KeyDefinitions } from '../mockdata/fileBasedMockData';
import type { ILogger } from '@ui5/logger';
import type ODataRequest from '../request/odataRequest';
import type { IFileLoader } from '../index';

export interface EntitySetInterface {
    checkKeyValue(mockData: object, keyValues: object, keyName: string, keyProp?: Property): boolean;
    checkFilter(mockData: object, filterExpression: any, tenantId: string, odataRequest: ODataRequest): boolean;
    checkSearch(mockData: object, searchQueries: string[], odataRequest: ODataRequest): boolean;
    executeAction(
        actionDefinition: Action,
        actionData: object | undefined,
        odataRequest: ODataRequest,
        keys: Record<string, any>
    ): Promise<any>;
    performGET(
        keyValues: KeyDefinitions,
        asArray: boolean,
        tenantId: string,
        odataRequest: ODataRequest,
        dontClone?: boolean
    ): Promise<any>;
    performPOST(
        keyValues: KeyDefinitions,
        postData: any,
        tenantId: string,
        odataRequest: ODataRequest,
        _updateParent?: boolean
    ): Promise<any>;
    performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        odataRequest: ODataRequest,
        _updateParent?: boolean
    ): Promise<any>;
    performDELETE(
        keyValues: KeyDefinitions,
        tenantId: string,
        odataRequest: ODataRequest,
        _updateParent?: boolean
    ): Promise<void>;
    getParentEntityInterface(tenantId: string): Promise<FileBasedMockData | undefined>;
    getEntityInterface(entitySetName: string, tenantId: string): Promise<FileBasedMockData | undefined>;
    getMockData(tenantId: string): FileBasedMockData;
    isV4(): boolean;
}
export interface DataAccessInterface {
    isV4(): boolean;
    getNavigationPropertyKeys(
        data: any,
        navPropDetail: any,
        currentEntityType: EntityType,
        currentEntitySet: EntitySet | undefined,
        currentKeys: Record<string, string>,
        forCreate?: boolean
    ): Record<string, string>;
    getMockEntitySet(
        entityTypeName: string,
        generateMockData?: boolean,
        containedEntityType?: EntityType,
        containedData?: any
    ): Promise<EntitySetInterface>;
    getData(odataRequest: ODataRequest): Promise<any>;
    getDraftRoot(keyValues: KeyDefinitions, _tenantId: string, entitySetDefinition: EntitySet): any;
    getMetadata(): ODataMetadata;
    debug: boolean;
    fileLoader: IFileLoader;
    log: ILogger;
}

/**
 *
 */
export class ExecutionError extends Error {
    statusCode: number;
    messageData: object;
    isSAPMessage: boolean;
    isCustomError = true;
    headers: Record<string, string>;

    constructor(
        message: string,
        statusCode: number,
        messageData: any,
        isSAPMessage: boolean,
        headers: Record<string, string> = {}
    ) {
        super(message);
        this.statusCode = statusCode;
        this.messageData = messageData;
        this.isSAPMessage = isSAPMessage;
        this.headers = headers;
    }
}

export function _getDateTimeOffset(isV4: boolean) {
    const date = new Date();
    return isV4 ? date.toISOString() : '/Date(' + date.getTime() + '+0000)/';
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate an ID of a given length.
 *
 * @param length
 * @returns the generated ID
 */
export function generateId(length: number) {
    let result = '';
    while (length--) {
        result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
}

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
