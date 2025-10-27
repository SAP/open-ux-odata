import type { ServiceConfig } from '@sap-ux/fe-mockserver-core';
import { MockDataContributorClass } from '@sap-ux/fe-mockserver-core';
import type ODataRequest from '@sap-ux/fe-mockserver-core/dist/request/odataRequest';
import path from 'node:path';

type ServiceDefinition = {
    url: string;
    alias?: string;
};
/**
 * Mock data contributor for services.
 */
export default class Services extends MockDataContributorClass<ServiceDefinition> {
    /**
     * Return all the service definitions.
     * @param __odataRequest
     * @returns A promise that resolves to an array of service definitions.
     */
    async getAllEntries(__odataRequest: ODataRequest): Promise<ServiceDefinition[]> {
        this.doSomething();
        const configs: ServiceConfig[] = this.base.getServiceRegistry().getServices() ?? [];
        this.base.getServiceRegistry().loadServices([
            {
                alias: `AdminService${configs.length}`,
                urlPath: `/admin-${configs.length}`,
                metadataPath: path.join(__dirname, '../metadata.xml'),
                mockdataPath: path.join(__dirname),
                generateMockData: false
            }
        ]);
        return configs.map((config) => {
            return {
                url: config.urlPath,
                alias: config.alias
            };
        });
    }

    async doSomething(): Promise<void> {
        await this.base.getServiceRegistry().loadServices([]);
    }
}
