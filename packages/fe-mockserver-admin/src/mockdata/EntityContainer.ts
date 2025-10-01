import type { MockEntityContainerContributor, ODataRequest } from '@sap-ux/fe-mockserver-core';

const MockEntityContainer: MockEntityContainerContributor = {
    async handleRequest(odataRequest: ODataRequest): Promise<unknown> {
        odataRequest.addResponseHeader('content-type', 'text/html ;charset=utf-8');
        return `<html><body><h1>Hello</h1></body></html>`;
    }
};

export default MockEntityContainer;
