import type { NextFunction, NextHandleFunction } from 'connect';
import type { ServerResponse } from 'http';
import * as http from 'http';
import type { DataAccess } from '../data/dataAccess';
import ODataRequest from '../request/odataRequest';
import type { Batch, BatchPart } from './batchParser';
import { BatchContent, getBoundary, parseBatch } from './batchParser';
import type { IncomingMessageWithTenant } from './serviceRouter';

export function isPartChangeSet(part: BatchPart | Batch): part is Batch {
    return (part as Batch).isChangeSet;
}
const NL = '\r\n';

async function handlePart(
    partDefinition: BatchPart,
    dataAccess: DataAccess,
    boundary: string,
    tenantId: string,
    globalHeaders: Record<string, string>
): Promise<string> {
    const partRequest = new ODataRequest({ ...partDefinition, tenantId: tenantId }, dataAccess);
    await partRequest.handleRequest();
    let batchResponse = '';
    batchResponse += `--${boundary}${NL}`;
    batchResponse += `Content-Type: application/http${NL}`;
    batchResponse += `Content-Transfer-Encoding: binary${NL}`;
    if (partDefinition.contentId) {
        batchResponse += `Content-ID: ${partDefinition.contentId}${NL}`;
    }
    batchResponse += NL;
    const responseData = partRequest.getResponseData();
    batchResponse += `HTTP/1.1 ${partRequest.statusCode} ${http.STATUS_CODES[partRequest.statusCode]}${NL}`;
    for (const headerName in partRequest.responseHeaders) {
        batchResponse += `${headerName}: ${partRequest.responseHeaders[headerName]}${NL}`;
    }
    for (const headerName in partRequest.globalResponseHeaders) {
        globalHeaders[headerName] = partRequest.globalResponseHeaders[headerName];
    }
    batchResponse += NL; // End of part header
    if (responseData) {
        batchResponse += responseData;
        batchResponse += NL; // End of body content
    }
    batchResponse += NL;
    return batchResponse;
}

/**
 * Creates a router dedicated to batch request handling.
 * @param dataAccess the current DataAccess object
 * @returns a router function for batch handling
 */
export function batchRouter(dataAccess: DataAccess): NextHandleFunction {
    return async (req: IncomingMessageWithTenant, res: ServerResponse, next: NextFunction) => {
        try {
            const boundary = getBoundary(req.headers['content-type'] as string);
            const body = (req as any).body;
            const batchData = parseBatch(new BatchContent(body), boundary);
            const globalHeaders: Record<string, string> = {};
            let batchResponse = '';

            for (const part of batchData.parts) {
                if (isPartChangeSet(part)) {
                    batchResponse += `--${batchData.boundary}${NL}`;
                    batchResponse += `Content-Type: multipart/mixed; boundary=${part.boundary}${NL}`;
                    batchResponse += NL;
                    for (const changeSetPart of part.parts) {
                        batchResponse += await handlePart(
                            changeSetPart as BatchPart,
                            dataAccess,
                            part.boundary,
                            req.tenantId!,
                            globalHeaders
                        );
                    }
                    batchResponse += `--${part.boundary}--${NL}`;
                } else {
                    batchResponse += await handlePart(
                        part,
                        dataAccess,
                        batchData.boundary,
                        req.tenantId!,
                        globalHeaders
                    );
                }
            }
            batchResponse += `--${batchData.boundary}--${NL}`;
            res.statusCode = 200;
            for (const globalHeaderName in globalHeaders) {
                if (globalHeaders[globalHeaderName]) {
                    res.setHeader(globalHeaderName, globalHeaders[globalHeaderName]);
                }
            }
            res.setHeader('Content-Type', `multipart/mixed; boundary=${batchData.boundary}`);
            res.setHeader('odata-version', dataAccess.getMetadata().getVersion());
            res.write(batchResponse);
            res.end();
        } catch (e) {
            next(e);
        }
    };
}
