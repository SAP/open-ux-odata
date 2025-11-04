import type { ODataRequest } from '@sap-ux/fe-mockserver-core';
import { MockEntityContainerContributorClass } from '@sap-ux/fe-mockserver-core';

export default class MockEntityContainer extends MockEntityContainerContributorClass {
    async handleRequest(odataRequest: ODataRequest): Promise<unknown> {
        this.myMethod();
        // Example of handling a request and returning a custom response
        odataRequest.addResponseHeader('content-type', 'text/html ;charset=utf-8');
        return `<html><body><h1>Hello</h1></body></html>`;
    }
    myMethod(): void {
        this.base.getEntityInterface('eoeoe');
    }
}
