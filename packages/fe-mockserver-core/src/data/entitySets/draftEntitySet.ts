import { MockDataEntitySet } from './entitySet';
import type ODataRequest from '../../request/odataRequest';
import type { FileBasedMockData, KeyDefinitions } from '../../mockdata/fileBasedMockData';
import { _getDateTimeOffset, uuidv4 } from '../common';
import type { DataAccessInterface } from '../common';
import type { Action, EntitySet, EntityType, NavigationProperty, Property } from '@sap-ux/vocabularies-types';

type DraftElement = {
    IsActiveEntity: boolean;
    HasDraftEntity: boolean;
    HasActiveEntity: boolean;
    DraftAdministrativeData: DraftAdministrativeData | null;
    Processed: boolean;
};

type DraftAdministrativeData = {
    DraftUUID: string;
    CreationDateTime: string;
    CreatedByUser: string;
    DraftIsCreatedByMe: boolean;
    LastChangeDateTime: string;
    LastChangedByUser: string;
    InProcessByUser: string;
    DraftIsProcessedByMe: boolean;
};

export class DraftMockEntitySet extends MockDataEntitySet {
    declare entitySetDefinition: EntitySet;
    constructor(
        rootFolder: string,
        entitySetDefinition: EntitySet | EntityType,
        dataAccess: DataAccessInterface,
        generateMockData: boolean
    ) {
        super(rootFolder, entitySetDefinition, dataAccess, generateMockData, true, true);
    }

    protected checkSpecificProperties(
        filterExpression: any,
        mockData: any,
        allData: FileBasedMockData
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
            return !allData.hasEntry(keys);
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

    private async createInactiveVersionForNavigations(data: any, tenantId: string) {
        for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
            if (
                (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)
                    ?.DraftNode &&
                navPropName !== 'SiblingEntity'
            ) {
                // For all the draft node data duplicate them
                const navPropDetail = this.entityTypeDefinition.navigationProperties.find(
                    (navProp: NavigationProperty) => navProp.name === navPropName
                ) as NavigationProperty;
                const subKeys = this.dataAccess.getNavigationPropertyKeys(
                    data,
                    navPropDetail,
                    this.entitySetDefinition.entityType,
                    this.entitySetDefinition,
                    {}
                );
                const navPropEntity = (await this.dataAccess.getMockEntitySet(
                    this.entitySetDefinition.navigationPropertyBinding[navPropName].name
                )) as any as DraftMockEntitySet;
                if (navPropEntity?.draftEdit) {
                    await navPropEntity.draftEdit(subKeys, tenantId);
                }
            }
        }
    }

    public async draftActivate(keyValues: KeyDefinitions, tenantId: string) {
        const currentMockData = this.getMockData(tenantId);
        const dataToDuplicate = this.performGET(keyValues, true, tenantId, true);
        const deleteKeyValues = Object.assign({}, keyValues);
        deleteKeyValues.IsActiveEntity = true;
        const dataToDelete = this.performGET(deleteKeyValues, true, tenantId, true);
        for (const draftData of dataToDelete) {
            if (draftData.IsActiveEntity && !draftData.HasDraftEntity && !draftData.Processed) {
                // Draft was deleted
                const activateKeyValues = this.getKeys(draftData);
                await currentMockData.removeEntry(activateKeyValues);
            }
        }
        const dataToClean: KeyDefinitions[] = [];
        let activeDraft: DraftElement | undefined;
        for (const draftData of dataToDuplicate) {
            if (!draftData.IsActiveEntity && draftData.HasDraftEntity) {
                draftData.HasDraftEntity = false;
                const activateKeyValues = this.getKeys(draftData);
                activateKeyValues.IsActiveEntity = true;
                activeDraft = Object.assign({}, draftData) as DraftElement;
                activeDraft.IsActiveEntity = true;
                activeDraft.HasDraftEntity = false;
                activeDraft.Processed = true;
                dataToClean.push(activateKeyValues);
                if (!currentMockData.hasEntry(activateKeyValues)) {
                    await currentMockData.addEntry(activeDraft);
                } else {
                    await currentMockData.updateEntry(activateKeyValues, activeDraft);
                }
                await this.activateInactiveVersionForNavigationProperties(draftData, tenantId);
            }
        }
        for (const draftKeys of dataToClean) {
            const myDataToClean = this.performGET(draftKeys, false, tenantId, true);

            delete myDataToClean.Processed;
            await currentMockData.updateEntry(draftKeys, myDataToClean);
        }
        await this.draftDiscard(keyValues, tenantId);
        return activeDraft;
    }

    private async activateInactiveVersionForNavigationProperties(draftData: any, tenantId: string) {
        for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
            if (
                (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)
                    ?.DraftNode &&
                navPropName !== 'SiblingEntity'
            ) {
                // For all the draft node data duplicate them
                const navPropDetail = this.entityTypeDefinition.navigationProperties.find(
                    (navProp: NavigationProperty) => navProp.name === navPropName
                ) as NavigationProperty;
                const subKeys = this.dataAccess.getNavigationPropertyKeys(
                    draftData,
                    navPropDetail,
                    this.entitySetDefinition.entityType,
                    this.entitySetDefinition,
                    {}
                );
                const navPropEntity = (await this.dataAccess.getMockEntitySet(
                    this.entitySetDefinition.navigationPropertyBinding[navPropName].name
                )) as unknown as DraftMockEntitySet;
                if (navPropEntity && navPropEntity.draftActivate) {
                    await navPropEntity.draftActivate(subKeys, tenantId);
                }
            }
        }
    }

    public async draftEdit(keyValues: Record<string, any>, tenantId: string) {
        const currentMockData = this.getMockData(tenantId);
        const dataToDuplicate = this.performGET(keyValues, true, tenantId, true);
        for (const data of dataToDuplicate) {
            if (!data.HasDraftEntity && data.IsActiveEntity) {
                data.HasDraftEntity = true;
                const duplicate: DraftElement = Object.assign({}, data) as DraftElement;
                duplicate.IsActiveEntity = false;
                duplicate.HasActiveEntity = true;
                const currentDate = _getDateTimeOffset(this.isV4());
                duplicate.DraftAdministrativeData = {
                    DraftUUID: uuidv4(),
                    CreationDateTime: currentDate,
                    CreatedByUser: 'nobody',
                    DraftIsCreatedByMe: true,
                    LastChangeDateTime: currentDate,
                    LastChangedByUser: 'nobody',
                    InProcessByUser: 'nobody',
                    DraftIsProcessedByMe: true
                };
                await currentMockData.addEntry(duplicate);
                await this.createInactiveVersionForNavigations(data, tenantId);
            }
        }
    }
    public async draftDiscard(keyValues: Record<string, any>, tenantId: string) {
        const dataToDiscard = this.performGET(keyValues, true, tenantId);
        for (const data of dataToDiscard) {
            const keys = this.getKeys(data);
            super.performDELETE(keys, tenantId);
            for (const navPropName in this.entitySetDefinition.navigationPropertyBinding) {
                if (
                    (this.entitySetDefinition.navigationPropertyBinding[navPropName].annotations?.Common as any)
                        ?.DraftNode &&
                    navPropName !== 'SiblingEntity'
                ) {
                    // For all the draft node data duplicate them
                    const navPropDetail = this.entityTypeDefinition.navigationProperties.find(
                        (navProp: NavigationProperty) => navProp.name === navPropName
                    ) as NavigationProperty;
                    const subKeys = this.dataAccess.getNavigationPropertyKeys(
                        data,
                        navPropDetail,
                        this.entitySetDefinition.entityType,
                        this.entitySetDefinition,
                        {}
                    );
                    const navPropEntity = (await this.dataAccess.getMockEntitySet(
                        this.entitySetDefinition.navigationPropertyBinding[navPropName].name
                    )) as unknown as DraftMockEntitySet;
                    if (navPropEntity && navPropEntity.draftDiscard) {
                        await navPropEntity.draftDiscard(subKeys, tenantId);
                    }
                }
            }
            const deleteKeyValues = Object.assign({}, keys);
            deleteKeyValues.IsActiveEntity = true;
            const newActiveData = this.performGET(deleteKeyValues, false, tenantId, true) as DraftElement;
            if (newActiveData) {
                newActiveData.HasDraftEntity = false;
            }
        }
        const activeVersionOfDeletedKeys: any = Object.assign({}, keyValues);
        activeVersionOfDeletedKeys.IsActiveEntity = true;
        const dataToAdjust = this.performGET(activeVersionOfDeletedKeys, true, tenantId, true);
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
        actionData = await currentMockData.onBeforeAction(actionDefinition, actionData, keys);
        let responseObject;
        switch (actionDefinition.fullyQualifiedName) {
            // Draft Edit Action
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.EditAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.EditAction}()`: {
                await this.draftEdit(keys, odataRequest.tenantId);
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
                responseObject = this.performGET(keys, false, odataRequest.tenantId);
                break;

            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.DiscardAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.DiscardAction}()`: {
                // Discard
                responseObject = await this.draftDiscard(keys, odataRequest.tenantId);
                break;
            }

            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.ActivationAction}(${this.entitySetDefinition.entityTypeName})`:
            case `${this.entitySetDefinition.annotations.Common?.DraftRoot?.ActivationAction}()`: {
                const activeDraft = this.draftActivate(keys, odataRequest.tenantId);

                responseObject = activeDraft;
                break;
            }
            default:
                responseObject = await currentMockData.executeAction(actionDefinition, actionData, keys);
                break;
        }
        responseObject = await currentMockData.onAfterAction(actionDefinition, actionData, keys, responseObject);
        return responseObject;
    }

    async performPATCH(
        keyValues: KeyDefinitions,
        patchData: object,
        tenantId: string,
        updateParent: boolean = false
    ): Promise<any> {
        const updatedData = await super.performPATCH(keyValues, patchData, tenantId);
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (
                parentEntity &&
                parentEntity.DraftAdministrativeData !== null &&
                parentEntity.DraftAdministrativeData !== undefined
            ) {
                parentEntity.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        if (this.entitySetDefinition?.annotations?.Common?.DraftRoot) {
            const myDataToUpdate = this.performGET(keyValues, false, tenantId, true);
            if (myDataToUpdate && myDataToUpdate.DraftAdministrativeData) {
                myDataToUpdate.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        return updatedData;
    }

    public async performPOST(
        keyValues: KeyDefinitions,
        postData: any,
        tenantId: string,
        updateParent: boolean = false
    ): Promise<any> {
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (
                parentEntity &&
                parentEntity.DraftAdministrativeData !== null &&
                parentEntity.DraftAdministrativeData !== undefined
            ) {
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
            postData.HasDraftEntity = !postData.IsActiveEntity;
        }
        return super.performPOST(keyValues, postData, tenantId);
    }

    public async performDELETE(
        keyValues: KeyDefinitions,
        tenantId: string,
        updateParent: boolean = false
    ): Promise<void> {
        const draftData = this.performGET(keyValues, false, tenantId);
        if (updateParent && this.entitySetDefinition?.annotations?.Common?.DraftNode) {
            const parentEntity = await this.dataAccess.getDraftRoot(keyValues, tenantId, this.entitySetDefinition);
            if (
                parentEntity &&
                parentEntity.DraftAdministrativeData !== null &&
                parentEntity.DraftAdministrativeData !== undefined
            ) {
                parentEntity.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
        }
        if (this.entitySetDefinition.annotations?.Common?.DraftRoot && draftData && !draftData.IsActiveEntity) {
            await this.draftDiscard(keyValues, tenantId);
        } else {
            if (this.entitySetDefinition.annotations?.Common?.DraftNode && draftData && !draftData.IsActiveEntity) {
                // Update the sibling
                const activeKeys = Object.assign({}, keyValues, { IsActiveEntity: true });
                const activeEquivalent = this.performGET(activeKeys, false, tenantId, true);
                if (activeEquivalent && activeEquivalent.HasDraftEntity) {
                    activeEquivalent.HasDraftEntity = false;
                }
            }
            return super.performDELETE(keyValues, tenantId);
        }
    }
}
