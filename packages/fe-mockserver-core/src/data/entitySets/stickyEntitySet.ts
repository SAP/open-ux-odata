import type { Action, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import cloneDeep from 'lodash.clonedeep';
import type ODataRequest from '../../request/odataRequest';
import type { KeyDefinitions } from '../../request/odataRequest';
import type { DataAccessInterface } from '../common';
import { ExecutionError, generateId } from '../common';
import { MockDataEntitySet } from './entitySet';

/**
 *
 */
export class StickyMockEntitySet extends MockDataEntitySet {
    private _currentSessionObject: any = {};
    private currentUUID?: string;
    private sessionTimeoutRef: any;
    public sessionTimeoutTime = 120;
    private readonly discardAction: Action | undefined;

    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean
    ) {
        super(rootFolder, entitySetDefinition, dataAccess, generateMockData);

        const discardAction = (entitySetDefinition as EntitySet).annotations.Session?.StickySessionSupported
            ?.DiscardAction;

        if (discardAction) {
            // determine the (unbound) discard action.
            const metadata = dataAccess.getMetadata();
            const entityContainerPath = metadata.getEntityContainerPath();

            /*
             TODO: Most (all?) of the existing services incorrectly annotate the 'discard' action by its short action
                   name. This code prepends the entity container path if needed so that it can be resolved based on
                   the action import.
            */
            const actionImportFQN = !discardAction.startsWith(entityContainerPath)
                ? `${entityContainerPath}/${discardAction}`
                : `${discardAction}`;

            this.discardAction = metadata.getActionImportByFQN(actionImportFQN)?.action;
        }
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

    public hasSession(tenantId: string, contextId: string): boolean {
        return this._currentSessionObject[tenantId] !== null && this.currentUUID === contextId;
    }

    public async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        odataRequest: ODataRequest
    ): Promise<any> {
        keyValues = this.prepareKeys(keyValues);
        const data = this.performGET(keyValues, false, tenantId, odataRequest);
        if (!data) {
            throw new ExecutionError('Not found', 404, undefined, false);
        }

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
                let newObject = currentMockData.getEmptyObject(odataRequest) as any;
                newObject = Object.assign(newObject, actionData);

                this.setSessionObject(odataRequest.tenantId, newObject);
                newObject.__transient = true;
                odataRequest.setContext(`../$metadata#${this.entitySetDefinition?.name}()/$entity`);
                this.addSessionToken(odataRequest);
                this.resetSessionTimeout(odataRequest.tenantId);
                responseObject = newObject;
                break;
            }

            case this.discardAction?.fullyQualifiedName:
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
        this.currentUUID = `SID:ANON:${generateId(16)}`;
        odataRequest.addResponseHeader('sap-contextid', this.currentUUID, true);
        odataRequest.addResponseHeader('sap-http-session-timeout', this.sessionTimeoutTime.toString(), true);
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
                (Object.prototype.hasOwnProperty.call(keyValues, '') && keyValues[''] === '') ||
                this.checkKeys(this.prepareKeys(keyValues), currentSessionObject, this.entityTypeDefinition.keys)
            ) {
                if (odataRequest && this.currentUUID) {
                    odataRequest.addResponseHeader('sap-contextid', this.currentUUID);
                    odataRequest.addResponseHeader('sap-http-session-timeout', this.sessionTimeoutTime.toString());
                }
                this.resetSessionTimeout(tenantId);
                return cloneDeep(currentSessionObject);
            }
        }
        return super.performGET(keyValues, asArray, tenantId, odataRequest, dontClone);
    }

    public isDiscardAction(action: Action) {
        return action === this.discardAction;
    }
}
