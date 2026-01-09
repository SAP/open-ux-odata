import finalHandler from 'finalhandler';
import type { Server } from 'http';
import * as http from 'http';
import { afterEach } from 'node:test';
import * as path from 'path';
import FEMockserver from '../../src';

describe('logRequests', () => {
    let server: Server;
    let server2: Server;
    let stdoutWriteSpy: jest.SpyInstance;

    beforeAll(async () => {
        stdoutWriteSpy = jest.spyOn(process.stdout, 'write'); //.mockImplementation(() => true);

        const mockServer = new FEMockserver({
            logRequests: true,
            logResponses: true,
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/log'
                }
            ],
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds',
                options: {}
            }
        });
        await mockServer.isReady;
        server = http.createServer((req, res) => {
            mockServer.getRouter()(req, res, finalHandler(req, res));
        });
        server.listen(33332);

        const mockServer2 = new FEMockserver({
            logRequests: false,
            logResponses: false,
            services: [
                {
                    metadataPath: path.join(__dirname, '__testData', 'service.cds'),
                    mockdataPath: path.join(__dirname, '__testData'),
                    urlPath: '/sap/fe/core/mock/log'
                }
            ],
            metadataProcessor: {
                name: '@sap-ux/fe-mockserver-plugin-cds',
                options: {}
            }
        });
        await mockServer2.isReady;
        server2 = http.createServer((req, res) => {
            mockServer2.getRouter()(req, res, finalHandler(req, res));
        });
        server2.listen(33334);
    });

    afterAll((done) => {
        stdoutWriteSpy.mockRestore();
        server.close(() => {
            server2.close(done);
        });
    });

    afterEach(() => {
        stdoutWriteSpy.mockReset();
    });

    it('logs GET requests when logRequests is true', async () => {
        const response = await fetch('http://localhost:33332/sap/fe/core/mock/log/RootElement');
        expect(response.status).toBe(200);

        const calls = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls.some((msg) => msg.includes('Handling GET request for: /RootElement'))).toBe(true);
        expect(calls.some((msg) => msg.includes('Response Data:'))).toBe(true);

        const response2 = await fetch('http://localhost:33332/sap/fe/core/mock/log/RootElement?$filter=ID eq 2');
        expect(response2.status).toBe(200);

        const calls2 = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls2.some((msg) => msg.includes('Handling GET request for: /RootElement'))).toBe(true);
        expect(calls2.some((msg) => msg.includes('Response Data:'))).toBe(true);
    });

    it('logs deep GET requests when logRequests is true', async () => {
        const response = await fetch('http://localhost:33332/sap/fe/core/mock/log/RootElement(1)/_Elements');
        expect(response.status).toBe(200);

        const calls = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls.some((msg) => msg.includes('Handling GET request for: /RootElement(1)/_Elements'))).toBe(true);
        expect(calls.some((msg) => msg.includes('Response Data:'))).toBe(true);
        expect(calls.some((msg) => msg.includes('Lookup on navigation property:'))).toBe(true);
    });

    it('logs POST requests when logRequests is true', async () => {
        const response = await fetch('http://localhost:33332/sap/fe/core/mock/log/RootElement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ID: 99, IsActiveEntity: true })
        });
        expect(response.status).toBe(201);

        const calls = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls.some((msg) => msg.includes('Handling POST request for: /RootElement'))).toBe(true);
        expect(calls.some((msg) => msg.includes('POST data:'))).toBe(true);
        expect(calls.some((msg) => msg.includes('Response Data:'))).toBe(true);
    });

    it('logs GET requests when logRequests is false but ?logs=true', async () => {
        const response = await fetch('http://localhost:33334/sap/fe/core/mock/log/RootElement?logs=true');
        expect(response.status).toBe(200);

        const calls = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls.some((msg) => msg.includes('Handling GET request for: /RootElement'))).toBe(true);
        expect(calls.some((msg) => msg.includes('Response Data:'))).toBe(true);

        const response2 = await fetch(
            'http://localhost:33334/sap/fe/core/mock/log/RootElement?logs=true&$filter=ID eq 2'
        );
        expect(response2.status).toBe(200);

        const calls2 = stdoutWriteSpy.mock.calls.map((call) => call[0]);
        expect(calls2.some((msg) => msg.includes('Handling GET request for: /RootElement'))).toBe(true);
        expect(calls2.some((msg) => msg.includes('Response Data:'))).toBe(true);
    });
});
