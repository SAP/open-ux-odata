import { join } from 'path';
import type { Action } from '@sap-ux/vocabularies-types';
import { ExecutionError } from '../data/common';
import type { IFileLoader } from '../index';
import type ODataRequest from '../request/odataRequest';

export type MockEntityContainerContributer = {
    onBeforeAction?(actionDefinition: Action, actionData: any, keys: Record<string, any>): Promise<object>;
    executeAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<object>;
    onAfterAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        responseData: any
    ): Promise<any>;
    throwError?(message: string, statusCode?: number, messageData?: object): any;
};

export class MockEntityContainer {
    public static async read(
        mockDataRootFolder: string,
        fileLoader: IFileLoader
    ): Promise<MockEntityContainerContributer> {
        const jsPath = join(mockDataRootFolder, 'EntityContainer') + '.js';
        let outData: MockEntityContainerContributer = {};
        if (await fileLoader.exists(jsPath)) {
            try {
                //eslint-disable-next-line
                outData = await fileLoader.loadJS(jsPath);
            } catch (e) {
                outData = {};
                console.error(e);
            }
        }
        if (!outData.executeAction) {
            outData.executeAction = async function (actionDefinition, _actionData, _keys) {
                this.throwError!('Unsupported Action', 501, {
                    error: {
                        message: `FunctionImport or Action "${actionDefinition.name}" not mocked`
                    }
                });
                return [];
            };
        }

        outData.throwError = function (message: string, statusCode = 500, messageData?: object, isSAPMessage = false) {
            throw new ExecutionError(message, statusCode, messageData, isSAPMessage);
        };

        return outData;
    }
}
