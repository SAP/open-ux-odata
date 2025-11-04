import type { Action, ODataRequest } from '@sap-ux/ui5-middleware-fe-mockserver';
import { MockDataContributorClass } from '@sap-ux/ui5-middleware-fe-mockserver';

export type RootEntityNavPropTypes = {
    SiblingEntity: RootEntityType;
};
export type RootEntityNavPropNames = 'SiblingEntity';
export type RootEntityType = {
    ID: number;
    IsActiveEntity: boolean;
    name?: string;
    description?: string;
    HasActiveEntity: boolean;
    HasDraftEntity: boolean;
};

export type RootEntityKeys = {
    ID: number;
    IsActiveEntity: boolean;
};
export type RootEntityActionData = {
    _type: 'myCustomAction';
    in?: RootEntityType;
};

export default class RootEntity extends MockDataContributorClass<RootEntityType> {
    async executeAction(
        actionDefinition: Action,
        actionData: RootEntityActionData,
        _keys: RootEntityKeys,
        _odataRequest: ODataRequest
    ): Promise<object | undefined> {
        switch (actionData._type) {
            case 'myCustomAction':
                // TODO: Implement myCustomAction action
                console.log('Executing action: myCustomAction');
                return {};
            default:
                console.warn(`Unhandled action: ${actionDefinition.name}`);
                return undefined;
        }
    }
}
