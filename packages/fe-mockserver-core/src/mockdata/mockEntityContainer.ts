import type { Action } from '@sap-ux/vocabularies-types';
import { join } from 'path';
import type { DataAccessInterface } from '../data/common';
import { ExecutionError } from '../data/common';
import type { IFileLoader } from '../index';
import type ODataRequest from '../request/odataRequest';
import type { MockEntityContainerContributorClass } from './baseContributor';
import type { FileBasedMockData } from './fileBasedMockData';
export type MockEntityContainerBase = {
    getEntityInterface: (entityName: string, aliasOrService?: string) => Promise<FileBasedMockData | undefined>;
};

export type MockEntityContainerContributor = {
    executeAction?(
        actionDefinition: Action,
        actionData: any,
        keys: Record<string, any>,
        odataRequest: ODataRequest
    ): Promise<unknown>;
    handleRequest?(odataRequest: ODataRequest): Promise<unknown>;
    throwError?(message: string, statusCode?: number, messageData?: object): any;
    base?: MockEntityContainerBase;
};

export class MockEntityContainer {
    public static async read(
        mockDataRootFolder: string,
        tenantId: string,
        fileLoader: IFileLoader,
        dataAccess: DataAccessInterface
    ): Promise<MockEntityContainerContributor> {
        const jsPath = join(mockDataRootFolder, 'EntityContainer') + '.js';
        const tsPath = join(mockDataRootFolder, 'EntityContainer') + '.ts';
        let outData: MockEntityContainerContributor = {} as any;
        const existJS = await fileLoader.exists(jsPath);
        const existTS = fileLoader.isTypescriptEnabled?.() === true && (await dataAccess.fileLoader.exists(tsPath));
        if (existJS || existTS) {
            try {
                //eslint-disable-next-line
                outData = await fileLoader.loadJS(existTS ? tsPath : jsPath);
            } catch (e) {
                outData = {} as any;
                console.error(e);
            }
        }
        if (typeof outData === 'function') {
            if (typeof outData === 'function') {
                const MockClass = outData as typeof MockEntityContainerContributorClass;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                outData = new MockClass();
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

        outData.base = {
            async getEntityInterface(entitySetName: string): Promise<FileBasedMockData | undefined> {
                try {
                    const mockEntitySet = await dataAccess.getMockEntitySet(entitySetName);
                    return mockEntitySet?.getMockData(tenantId);
                } catch (e) {
                    return undefined;
                }
            }
        };

        return outData;
    }
}
