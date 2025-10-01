import type { Action, EntitySet, EntityType, NavigationProperty, Property } from '@sap-ux/vocabularies-types';
import type { FileBasedMockData } from '../../mockdata/fileBasedMockData';
import type ODataRequest from '../../request/odataRequest';
import type { KeyDefinitions } from '../../request/odataRequest';
import type { DataAccessInterface } from '../common';
import { uuidv4, _getDateTimeOffset } from '../common';
import { MockDataEntitySet } from './entitySet';

type DraftElement = {
    IsActiveEntity: boolean;
    HasDraftEntity: boolean;
    HasActiveEntity: boolean;
    DraftAdministrativeData: DraftAdministrativeData | null;
    Processed: boolean;
};

type DraftAdministrativeData = {
    DraftUUID: string;
    DraftEntityType: string;
    CreationDateTime: string;
    LastChangeDateTime: string;
    CreatedByUser: string;
    LastChangedByUser: string;
    DraftAccessType: string;
    InProcessByUser: string;
    DraftIsKeptByUser: boolean;
    DraftIsCreatedByMe: boolean;
    DraftIsLastChangedByMe: boolean;
    DraftIsProcessedByMe: boolean;
    CreatedByUserDescription: string;
    LastChangedByUserDescription: string;
    InProcessByUserDescription: string;
};

export class DraftMockEntitySet extends MockDataEntitySet {
    declare entitySetDefinition: EntitySet;
    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean,
        forceNullableValuesToNull: boolean
    ) {
        super(rootFolder, entitySetDefinition, dataAccess, generateMockData, forceNullableValuesToNull, true, true);
    }

    protected checkSpecificProperties(
        filterExpression: any,
        mockData: any,
        allData: FileBasedMockData,
        odataRequest: ODataRequest
    ): boolean | null {
        if (filterExpression.identifier === 'DraftAdministrativeData/InProcessByUser') {
            return false;
        } else if (
            filterExpression.identifier === 'SiblingEntity/IsActiveEntity' &&
            filterExpression.literal === 'null'
        ) {
            // Ensure that there is not sibling entity which is inactive
            const keys: Record<string, any> = {};
            this.entityTypeDefinition.keys.forEach((keyDef: Property) => {
                if (keyDef.name !== 'IsActiveEntity') {
                    keys[keyDef.name] = mockData[keyDef.name];
                } else {
                    keys[keyDef.name] = false;
                }
            });
            return !allData.hasEntry(keys, odataRequest);
        } else {
            return null;
        }
    }

    public checkKeyValue(mockData: any, keyValues: any, keyName: string, property?: Property): boolean {
        if (keyName === 'IsActiveEntity') {
            // Make sure we check a boolean value
            let booleanKeyValue = keyValues[keyName];
            if (typeof booleanKeyValue === 'string') {
                booleanKeyValue = booleanKeyValue === 'true';
            }
            return mockData[keyName] === booleanKeyValue;
        }
        return super.checkKeyValue(mockData, keyValues, keyName, property);
    }

    private async getNavigationPropertyDetails(navPropName: string, data: any, tenantId: string) {
        // For all the draft node data duplicate them
        const navPropDetail = this.entityTypeDefinition.navigationProperties.find(
            (navProp: NavigationProperty) => navProp.name === navPropName
        ) as NavigationProperty;
        const subKeys = await this.dataAccess.getNavigationPropertyKeys(
            data,
            navPropDetail,
            this.entitySetDefinition.entityType,
            this.entitySetDefinition,
            {},
            tenantId
        );
        const navPropEntity = (await this.dataAccess.getMockEntitySet(
            this.entitySetDefinition.navigationPropertyBinding[navPropName].name
        )) as any as DraftMockEntitySet;
        return { navPropEntity, subKeys };
    }

    private async createInactiveVersionForNavigations(data: any, tenantId: string, odataRequest: ODataRequest) {
        for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
            if (
                !navPropName.endsWith('SiblingEntity') &&
                (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)?.DraftNode
            ) {
                // For all the draft node data duplicate them
                const { navPropEntity, subKeys } = await this.getNavigationPropertyDetails(navPropName, data, tenantId);
                if (navPropEntity?.draftEdit) {
                    await navPropEntity.draftEdit(subKeys, tenantId, odataRequest);
                }
            }
        }
    }

    public async draftActivate(keyValues: KeyDefinitions, tenantId: string, odataRequest: ODataRequest) {
        const currentMockData = this.getMockData(tenantId);
        const dataToDuplicate = await this.performGET(keyValues, true, tenantId, odataRequest, true);
        const deleteKeyValues = Object.assign({}, keyValues);
        deleteKeyValues.IsActiveEntity = true;
        const dataToDelete = await this.performGET(deleteKeyValues, true, tenantId, odataRequest, true);
        for (const draftData of dataToDelete) {
            if (draftData.IsActiveEntity && !draftData.HasDraftEntity && !draftData.Processed) {
                // Draft was deleted
                const activateKeyValues = this.getKeys(draftData);
                await currentMockData.removeEntry(activateKeyValues, odataRequest);
            }
        }
        const dataToClean: KeyDefinitions[] = [];
        let activeDraft: DraftElement | undefined;
        for (const draftData of dataToDuplicate) {
            if (!draftData.IsActiveEntity && !draftData.Processed) {
                draftData.HasDraftEntity = false;
                draftData.Processed = true;
                const activateKeyValues = this.getKeys(draftData);
                dataToClean.push(this.getKeys(draftData));
                activateKeyValues.IsActiveEntity = true;
                activeDraft = Object.assign({}, draftData) as DraftElement;
                activeDraft.IsActiveEntity = true;
                activeDraft.HasDraftEntity = false;
                activeDraft.HasActiveEntity = false;
                activeDraft.Processed = true;
                activeDraft.DraftAdministrativeData = null;

                if (!currentMockData.hasEntry(activateKeyValues, odataRequest)) {
                    await currentMockData.addEntry(activeDraft, odataRequest);
                } else {
                    await currentMockData.updateEntry(activateKeyValues, activeDraft, activeDraft, odataRequest);
                }
                await this.activateInactiveVersionForNavigationProperties(draftData, tenantId, odataRequest);
            }
        }
        for (const draftKeys of dataToClean) {
            const myDataToClean = await this.performGET(draftKeys, false, tenantId, odataRequest, true);
            if (myDataToClean) {
                delete myDataToClean.Processed;
                await currentMockData.updateEntry(draftKeys, myDataToClean, myDataToClean, odataRequest);
            }
        }
        await this.draftDiscard(keyValues, tenantId, odataRequest, false);
        return activeDraft;
    }

    private async activateInactiveVersionForNavigationProperties(
        draftData: any,
        tenantId: string,
        odataRequest: ODataRequest
    ) {
        for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
            if (
                !navPropName.endsWith('SiblingEntity') &&
                (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)?.DraftNode
            ) {
                // For all the draft node data duplicate them
                const { navPropEntity, subKeys } = await this.getNavigationPropertyDetails(
                    navPropName,
                    draftData,
                    tenantId
                );
                if (navPropEntity?.draftActivate) {
                    await navPropEntity.draftActivate(subKeys, tenantId, odataRequest);
                }
            }
        }
    }

    public async draftEdit(keyValues: Record<string, any>, tenantId: string, odataRequest: ODataRequest) {
        const currentMockData = this.getMockData(tenantId);
        const dataToDuplicate = await this.performGET(keyValues, true, tenantId, odataRequest, true);
        for (const data of dataToDuplicate) {
            if (!data.HasDraftEntity && data.IsActiveEntity) {
                data.HasDraftEntity = true;
                data.Processed = false;
                const duplicate: DraftElement = Object.assign({}, data) as DraftElement;
                duplicate.IsActiveEntity = false;
                duplicate.HasActiveEntity = true;
                duplicate.Processed = false;
                duplicate.HasDraftEntity = false;
                const currentDate = _getDateTimeOffset(this.isV4());
                duplicate.DraftAdministrativeData = {
                    DraftUUID: uuidv4(),
                    DraftEntityType: this.entityTypeDefinition.fullyQualifiedName,
                    CreationDateTime: currentDate,
                    CreatedByUser: 'nobody',
                    LastChangeDateTime: currentDate,
                    LastChangedByUser: 'nobody',
                    DraftAccessType: '',
                    InProcessByUser: 'nobody',
                    DraftIsKeptByUser: false,
                    DraftIsCreatedByMe: true,
                    DraftIsLastChangedByMe: true,
                    DraftIsProcessedByMe: true,
                    CreatedByUserDescription: 'nobody',
                    LastChangedByUserDescription: 'nobody',
                    InProcessByUserDescription: 'nobody'
                };
                await currentMockData.addEntry(duplicate, odataRequest);
                await this.createInactiveVersionForNavigations(data, tenantId, odataRequest);
            }
        }
    }
    public async draftDiscard(
        keyValues: Record<string, any>,
        tenantId: string,
        odataRequest: ODataRequest,
        cascadeDiscard: boolean = true
    ) {
        const dataToDiscard = await this.performGET(keyValues, true, tenantId, odataRequest);
        for (const data of dataToDiscard) {
            const keys = this.getKeys(data);
            await super.performDELETE(keys, tenantId, odataRequest);
            if (cascadeDiscard) {
                for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
                    if (
                        !navPropName.endsWith('SiblingEntity') &&
                        (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)
                            ?.DraftNode
                    ) {
                        // For all the draft node data duplicate them
                        const { navPropEntity, subKeys } = await this.getNavigationPropertyDetails(
                            navPropName,
                            data,
                            tenantId
                        );
                        if (navPropEntity?.draftDiscard) {
                            await navPropEntity.draftDiscard(subKeys, tenantId, odataRequest);
                        }
                    }
                }
            }

            const deleteKeyValues = Object.assign({}, keys);
            deleteKeyValues.IsActiveEntity = true;
            const newActiveData = (await this.performGET(
                deleteKeyValues,
                false,
                tenantId,
                odataRequest,
                true
            )) as DraftElement;
            if (newActiveData) {
                newActiveData.HasDraftEntity = false;
            }
        }
        const activeVersionOfDeletedKeys: any = Object.assign({}, keyValues);
        activeVersionOfDeletedKeys.IsActiveEntity = true;
        const dataToAdjust = await this.performGET(activeVersionOfDeletedKeys, true, tenantId, odataRequest, true);
        let activeData;
        for (const data of dataToAdjust) {
            data.HasDraftEntity = false;
            activeData = data;
        }
        return activeData;
    }

    public async executeAction(
        actionDefinition: Action,
        actionData: object,
        odataRequest: ODataRequest,
        keys: Record<string, any>
    ): Promise<any> {
        const currentMockData = this.getMockData(odataRequest.tenantId);
        actionData = await currentMockData.onBeforeAction(actionDefinition, actionData, keys, odataRequest);
        let responseObject;
        switch (actionDefinition.fullyQualifiedName) {
            // Draft Edit Action
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.EditAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.EditAction}()`: {
                await this.draftEdit(keys, odataRequest.tenantId, odataRequest);
                odataRequest.queryPath.pop();
                odataRequest.queryPath[odataRequest.queryPath.length - 1].keys = Object.assign({}, keys, {
                    IsActiveEntity: false
                });
                responseObject = this.dataAccess.getData(odataRequest);
                break;
            }
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.PreparationAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.PreparationAction}()`:
                // Prepare
                responseObject = await this.performGET(keys, false, odataRequest.tenantId, odataRequest);
                break;

            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.DiscardAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.DiscardAction}()`: {
                // Discard
                responseObject = await this.draftDiscard(keys, odataRequest.tenantId, odataRequest);
                break;
            }

            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.ActivationAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.ActivationAction}()`: {
                await this.draftActivate(keys, odataRequest.tenantId, odataRequest);
                odataRequest.queryPath.pop();
                odataRequest.queryPath[odataRequest.queryPath.length - 1].keys = Object.assign({}, keys, {
                    IsActiveEntity: true
                });
                responseObject = await this.dataAccess.getData(odataRequest);
                delete responseObject.Processed;
                break;
            }
            default:
                responseObject = await currentMockData.executeAction(actionDefinition, actionData, keys, odataRequest);
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

    async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        odataRequest: ODataRequest,
        updateParent: boolean = false
    ): Promise<any> {
        const updatedData = await super.performPATCH(keyValues, patchData, tenantId, odataRequest);
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (parentEntity?.DraftAdministrativeData !== null && parentEntity?.DraftAdministrativeData !== undefined) {
                parentEntity.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        if (this.entitySetDefinition?.annotations?.Common?.DraftRoot) {
            const myDataToUpdate = await this.performGET(keyValues, false, tenantId, odataRequest, true);
            if (myDataToUpdate?.DraftAdministrativeData) {
                myDataToUpdate.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        return updatedData;
    }

    public async performPOST(
        keyValues: KeyDefinitions,
        postData: any,
        tenantId: string,
        odataRequest: ODataRequest,
        updateParent: boolean = false
    ): Promise<any> {
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (parentEntity?.DraftAdministrativeData !== null && parentEntity?.DraftAdministrativeData !== undefined) {
                parentEntity.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        // Validate potentially missing keys
        if (!Object.hasOwnProperty.call(postData, 'IsActiveEntity')) {
            postData.IsActiveEntity = false;
        }
        if (!Object.hasOwnProperty.call(postData, 'HasActiveEntity')) {
            postData.HasActiveEntity = false;
        }
        if (!Object.hasOwnProperty.call(postData, 'HasDraftEntity')) {
            postData.HasDraftEntity = false; // HasDraftEntity should be false during the create phase
        }
        const currentDate = _getDateTimeOffset(this.isV4());
        postData.DraftAdministrativeData = {
            DraftUUID: postData.DraftUUID ?? uuidv4(),
            DraftEntityType: this.entityTypeDefinition.fullyQualifiedName,
            CreationDateTime: currentDate,
            CreatedByUser: 'nobody',
            LastChangeDateTime: currentDate,
            LastChangedByUser: 'nobody',
            DraftAccessType: '',
            InProcessByUser: 'nobody',
            DraftIsKeptByUser: false,
            DraftIsCreatedByMe: true,
            DraftIsLastChangedByMe: true,
            DraftIsProcessedByMe: true,
            CreatedByUserDescription: 'nobody',
            LastChangedByUserDescription: 'nobody',
            InProcessByUserDescription: 'nobody'
        };
        return super.performPOST(keyValues, postData, tenantId, odataRequest);
    }

    public async performDELETE(
        keyValues: KeyDefinitions,
        tenantId: string,
        odataRequest: ODataRequest,
        updateParent: boolean = false
    ): Promise<void> {
        const draftData = await this.performGET(keyValues, false, tenantId, odataRequest);
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (parentEntity?.DraftAdministrativeData !== null && parentEntity?.DraftAdministrativeData !== undefined) {
                parentEntity.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        if (this.entitySetDefinition.annotations?.Common?.DraftRoot && draftData && !draftData.IsActiveEntity) {
            await this.draftDiscard(keyValues, tenantId, odataRequest);
        } else {
            if (this.entitySetDefinition.annotations?.Common?.DraftNode && draftData && !draftData.IsActiveEntity) {
                // Update the sibling
                const activeKeys = Object.assign({}, keyValues, { IsActiveEntity: true });
                const activeEquivalent = await this.performGET(activeKeys, false, tenantId, odataRequest, true);
                if (activeEquivalent?.HasDraftEntity) {
                    activeEquivalent.HasDraftEntity = false;
                }
            }
            return super.performDELETE(keyValues, tenantId, odataRequest);
        }
    }
}
