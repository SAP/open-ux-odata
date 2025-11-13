import type { Action, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import cloneDeep from 'lodash.clonedeep';
import type ODataRequest from '../../request/odataRequest';
import type { KeyDefinitions } from '../../request/odataRequest';
import type { IncomingMessageWithTenant } from '../../router/serviceRouter';
import type { DataAccessInterface } from '../common';
import { ExecutionError, generateId } from '../common';
import { MockDataEntitySet } from './entitySet';

class Session {
    private timeoutId: ReturnType<typeof setTimeout>;

    constructor(
        private readonly contextId: string,
        private data: any,
        private readonly sessionTimeout: number,
        private readonly discardSession: () => void
    ) {
        this.resetTimeout();
    }

    public resetTimeout() {
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
            this.discardSession();
        }, this.sessionTimeout * 1000);
    }

    public addSessionToken(odataRequest: ODataRequest) {
        odataRequest.addResponseHeader('sap-contextid', this.contextId, true);
        odataRequest.addResponseHeader('sap-http-session-timeout', this.sessionTimeout.toString(), true);
    }
    public setData(data: any) {
        this.data = data;
    }

    public getData(): any {
        return this.data;
    }

    public discard(odataRequest?: ODataRequest) {
        clearTimeout(this.timeoutId);
        this.discardSession();
        // Remove the response headers in case they've already been set
        odataRequest?.removeResponseHeader('sap-contextid', true);
        odataRequest?.removeResponseHeader('sap-http-session-timeout', true);
    }
}

/**
 *
 */
export class StickyMockEntitySet extends MockDataEntitySet {
    private readonly sessions: Record<string, Session> = {};
    private readonly discardAction: Action | undefined;

    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean,
        forceNullableValuesToNull: boolean
    ) {
        super(rootFolder, entitySetDefinition, dataAccess, generateMockData, forceNullableValuesToNull);

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

    createSession(data: any = {}, sessionTimeout: number = 120) {
        const contextId = `SID:ANON:${generateId(16)}`;
        this.sessions[contextId] = new Session(contextId, data, sessionTimeout, () => {
            delete this.sessions[contextId];
        });
        return this.sessions[contextId];
    }

    getSession(request: ODataRequest | IncomingMessageWithTenant) {
        const contextId = request.headers['sap-contextid'] as string | undefined;
        return contextId ? this.sessions[contextId] : undefined;
    }

    public async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        odataRequest: ODataRequest
    ): Promise<any> {
        keyValues = this.prepareKeys(keyValues);
        const data = await this.performGET(keyValues, false, tenantId, odataRequest);
        if (!data) {
            throw new ExecutionError('Not found', 404, undefined, false);
        }

        const currentMockData = this.getMockData(tenantId);
        const updatedData = Object.assign(data, patchData);
        await currentMockData.onBeforeUpdateEntry(keyValues, updatedData, odataRequest);
        if (updatedData.__transient) {
            this.getSession(odataRequest)?.setData(updatedData);
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
                const data = await this.performGET(keys, false, odataRequest.tenantId, odataRequest);
                const duplicate = Object.assign({}, data);

                this.createSession(duplicate).addSessionToken(odataRequest);
                duplicate.__transient = true;
                duplicate.__keys = keys;
                responseObject = duplicate;
                break;
            }

            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.NewAction}(${actionDefinition.sourceType})`: {
                // New
                let newObject = currentMockData.getEmptyObject(odataRequest, true) as any; // For new sticky objects, allow empty keys
                newObject = Object.assign(newObject, actionData);

                this.createSession(newObject).addSessionToken(odataRequest);
                newObject.__transient = true;
                odataRequest.setContext(`../$metadata#${this.entitySetDefinition?.name}()/$entity`);
                responseObject = newObject;
                break;
            }

            case this.discardAction?.fullyQualifiedName:
                // Discard
                this.getSession(odataRequest)?.discard(odataRequest);
                responseObject = null;
                break;

            case `${this.entitySetDefinition?.annotations?.Session?.StickySessionSupported?.SaveAction}(${actionDefinition.sourceType})`: {
                const session = this.getSession(odataRequest);
                if (!session) {
                    throw new ExecutionError('Session gone', 400, undefined, false);
                }
                const newData = session.getData();
                if (newData.__keys) {
                    // Key needs to be filled now
                    await currentMockData.updateEntry(newData.__keys, newData, newData, odataRequest);
                } else {
                    await this.performPOST({}, newData, odataRequest.tenantId, odataRequest);
                }

                session.discard(odataRequest);

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

    public async performGET(
        keyValues: KeyDefinitions,
        asArray: boolean,
        tenantId: string,
        odataRequest: ODataRequest,
        dontClone = false
    ): Promise<any> {
        const session = this.getSession(odataRequest);
        if (session && keyValues && Object.keys(keyValues).length) {
            if (
                (Object.prototype.hasOwnProperty.call(keyValues, '') && keyValues[''] === '') ||
                this.checkKeys(this.prepareKeys(keyValues), session.getData(), this.entityTypeDefinition.keys)
            ) {
                session.addSessionToken(odataRequest);
                return cloneDeep(session.getData());
            }
        }
        return super.performGET(keyValues, asArray, tenantId, odataRequest, dontClone);
    }

    public isDiscardAction(action: Action) {
        return action === this.discardAction;
    }
}
