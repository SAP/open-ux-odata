import type { MockDataContributor, ServiceConfig } from '@sap-ux/fe-mockserver-core';
import type ODataRequest from '@sap-ux/fe-mockserver-core/dist/request/odataRequest';
import path from 'node:path';

type ServiceDefinition = {
    url: string;
    alias?: string;
};
/**
 * Mock data contributor for services.
 */
const Services: MockDataContributor<ServiceDefinition> = {
    /**
     * Return all the service definitions.
     * @param __odataRequest
     * @returns A promise that resolves to an array of service definitions.
     */
    async getAllEntries(
        this: MockDataContributor<ServiceDefinition>,
        __odataRequest: ODataRequest
    ): Promise<ServiceDefinition[]> {
        const configs: ServiceConfig[] = this.base?.getServiceRegistry().getServices() ?? [];
        this.base?.getServiceRegistry().loadServices([
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
};
export default Services;
