import { MockDataEntitySet } from './entitySet';
import type ODataRequest from '../../request/odataRequest';
import cloneDeep from 'lodash.clonedeep';
import { generateId } from '../common';
import type { KeyDefinitions } from '../../mockdata/fileBasedMockData';
import type { DataAccessInterface } from '../common';
import type { Action, EntitySet, EntityType, Property } from '@sap-ux/vocabularies-types';

/**
 *
 */
export class StickyMockEntitySet extends MockDataEntitySet {
    private _currentSessionObject: any = {};
    private currentUUID?: string;
    private sessionTimeoutRef: any;
    public sessionTimeoutTime = 120;

    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean
    ) {
        super(rootFolder, entitySetDefinition, dataAccess, generateMockData);
    }

    private getSessionObject(tenantId: string) {
        return this._currentSessionObject[tenantId];
    }

    private setSessionObject(tenantId: string, objectData: any) {
        this._currentSessionObject[tenantId] = objectData;
    }

    public resetSessionTimeout(tenantId: string): any {
        clearTimeout(this.sessionTimeoutRef);
        this.sessionTimeoutRef = setTimeout(() => {
            this.currentUUID = undefined;
            this.setSessionObject(tenantId, null);
        }, this.sessionTimeoutTime * 1000);
        return this.currentUUID;
    }

    public async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        odataRequest: ODataRequest
    ): Promise<any> {
        keyValues = this.prepareKeys(keyValues);
        const data = this.performGET(keyValues, false, tenantId, odataRequest);
        const currentMockData = this.getMockData(tenantId);
        const updatedData = Object.assign(data, patchData);
        await currentMockData.onBeforeUpdateEntry(keyValues, updatedData, odataRequest);
        if (updatedData.__transient) {
            this.setSessionObject(tenantId, updatedData);
        } else {
            await currentMockData.updateEntry(keyValues, updatedData, patchData, odataRequest);
        }

        await currentMockData.onAfterUpdateEntry(keyValues, updatedData, odataRequest);

        return updatedData;
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
        let responseObject;
        switch (actionDefinition.fullyQualifiedName) {
            // Draft Edit Action
            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.EditAction}(${actionDefinition.sourceType})`: {
                const data = this.performGET(keys, false, odataRequest.tenantId, odataRequest);
                const duplicate = Object.assign({}, data);
                this.setSessionObject(odataRequest.tenantId, duplicate);
                this.addSessionToken(odataRequest);
                duplicate.__transient = true;
                duplicate.__keys = keys;
                responseObject = duplicate;
                break;
            }

            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.NewAction}(${actionDefinition.sourceType})`: {
                // New
                const newObject: any = Object.assign({}, actionData);
                const nonNullableProperties = actionDefinition.returnEntityType?.entityProperties.filter(
                    (prop: Property) => prop.nullable === false
                );
                nonNullableProperties?.forEach((nonNullableProperty: Property) => {
                    if (newObject[nonNullableProperty.name] === undefined) {
                        switch (nonNullableProperty.type) {
                            case 'Edm.String':
                            case 'Edm.Guid':
                                newObject[nonNullableProperty.name] = nonNullableProperty?.defaultValue || '';
                                break;
                            default:
                                newObject[nonNullableProperty.name] = nonNullableProperty?.defaultValue;
                                break;
                        }
                    }
                });

                this.setSessionObject(odataRequest.tenantId, newObject);
                newObject.__transient = true;
                odataRequest.setContext(`../$metadata#${this.entitySetDefinition?.name}()/$entity`);
                this.addSessionToken(odataRequest);
                this.resetSessionTimeout(odataRequest.tenantId);
                responseObject = newObject;
                break;
            }

            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.DiscardAction}(${actionDefinition.sourceType})`:
                // Discard
                this.setSessionObject(odataRequest.tenantId, null);
                responseObject = null;
                break;

            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.SaveAction}(${actionDefinition.sourceType})`: {
                const newData = this.getSessionObject(odataRequest.tenantId);
                if (newData.__keys) {
                    // Key needs to be filled now
                    await currentMockData.updateEntry(newData.__keys, newData, newData, odataRequest);
                } else {
                    await this.performPOST({}, newData, odataRequest.tenantId, odataRequest);
                }

                this.setSessionObject(odataRequest.tenantId, null);

                responseObject = newData;
                break;
            }
            default:
                break;
        }
        responseObject = await currentMockData.onAfterAction(
            actionDefinition,
            actionData,
            keys,
            responseObject,
            odataRequest
        );
        return responseObject;
    }

    addSessionToken(odataRequest: ODataRequest) {
        const uuid = generateId(16);
        this.currentUUID = uuid;
        odataRequest.addResponseHeader('sap-contextid', 'SID:ANON:' + uuid);
        odataRequest.addResponseHeader('sap-http-session-timeout', this.sessionTimeoutTime.toString());
    }

    public performGET(
        keyValues: KeyDefinitions,
        asArray: boolean,
        tenantId: string,
        odataRequest: ODataRequest,
        dontClone = false
    ): any {
        const currentSessionObject = this.getSessionObject(tenantId);
        if (currentSessionObject && keyValues && Object.keys(keyValues).length) {
            if (
                (Object.prototype.hasOwnProperty.call(keyValues, "''") && keyValues["''"] === undefined) ||
                this.checkKeys(keyValues, currentSessionObject, this.entityTypeDefinition.keys)
            ) {
                if (odataRequest) {
                    odataRequest.addResponseHeader('sap-contextid', 'SID:ANON:' + this.currentUUID);
                    odataRequest.addResponseHeader('sap-http-session-timeout', this.sessionTimeoutTime.toString());
                }
                this.resetSessionTimeout(tenantId);
                return cloneDeep(currentSessionObject);
            }
        }
        return super.performGET(keyValues, asArray, tenantId, odataRequest, dontClone);
    }
}
