import type { NextFunction, NextHandleFunction } from 'connect';
import type { ServerResponse } from 'http';
import * as http from 'http';
import type { DataAccess } from '../data/dataAccess';
import ODataRequest from '../request/odataRequest';
import type { Batch, BatchPart } from './batchParser';
import { BatchContent, getBoundary, parseBatch } from './batchParser';
import type { IncomingMessageWithTenant } from './serviceRouter';

type Error412 = Record<string, ErrorResponse>;

type ErrorResponse = {
    code: string;
    message: string;
    severity?: string;
    details: ErrorDetails[];
} & Record<string, unknown>;

type ErrorDetails = {
    code: string;
    message: string;
    severity?: string;
} & Record<string, unknown>;

/**
 * Returns the result whether isRequest part of changeset or not.
 * @param part
 * @returns {boolean}
 */
export function isPartChangeSet(part: BatchPart | Batch): part is Batch {
    return (part as Batch).isChangeSet;
}

let aggregate412BatchResponseInstance: {
    add412Response: (batchPartRes: string, header: string, resContent: Error412, contentId: string | undefined) => void;
    getUnifiedResponse: () => string | undefined;
};
const NL = '\r\n';

/**
 * Handles the part request.
 * @param partDefinition
 * @param dataAccess
 * @param boundary
 * @param tenantId
 * @param globalHeaders
 * @param isChangeSetPart
 * @returns {string | null}
 */
async function handlePart(
    partDefinition: BatchPart,
    dataAccess: DataAccess,
    boundary: string,
    tenantId: string,
    globalHeaders: Record<string, string>,
    isChangeSetPart?: boolean
): Promise<string | null> {
    const partRequest = new ODataRequest({ ...partDefinition, tenantId: tenantId }, dataAccess);
    await partRequest.handleRequest();
    const isResponse412ChangeSet = partRequest?.statusCode === 412 && !!isChangeSetPart;
    const { batchPartRes, header, resContent, contentId } = createBatchResponseObject(
        partRequest,
        partDefinition,
        boundary,
        globalHeaders,
        isResponse412ChangeSet
    );
    // All 412 batch responses should be transformed and returned as single response
    if (isResponse412ChangeSet) {
        aggregate412BatchResponseInstance.add412Response(batchPartRes, header, resContent, contentId);
        return null;
    }
    return batchPartRes;
}

/**
 * Creates a batch response object.
 * @param partRequest
 * @param partDefinition
 * @param boundary
 * @param globalHeaders
 * @param isResponse412ChangeSet
 * @returns a batch response object
 */
function createBatchResponseObject(
    partRequest: ODataRequest,
    partDefinition: BatchPart,
    boundary: string,
    globalHeaders: Record<string, string>,
    isResponse412ChangeSet: boolean
) {
    let batchResponse = '';
    batchResponse += `--${boundary}${NL}`;
    batchResponse += `Content-Type: application/http${NL}`;
    batchResponse += `Content-Transfer-Encoding: binary${NL}`;
    let contentId;
    if (partDefinition.contentId) {
        contentId = partDefinition.contentId;
        batchResponse += `Content-ID: ${contentId}${NL}`;
    }
    if (partRequest.getETag()) {
        batchResponse += `ETag: ${partRequest.getETag()}${NL}`;
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
    const header = batchResponse;
    if (responseData) {
        batchResponse += responseData;
        //batchResponse += NL; // End of body content
    }
    batchResponse += NL;
    const resContent = isResponse412ChangeSet ? JSON.parse(responseData as string) : null;
    return { batchPartRes: batchResponse, header, resContent, contentId };
}

/**
 * Creates instance of 412 responses aggregated from batch changeset request.
 * @returns void
 */
function aggregate412BatchResponse() {
    const batch412Response = {
        header: '',
        error: {
            code: '',
            message: '',
            severity: '',
            details: [] as ErrorDetails[]
        } as ErrorResponse
    };
    let firstPart = true;
    return {
        add412Response: function (
            batchPartRes: string,
            header: string,
            resContent: Error412,
            contentId: string | undefined
        ) {
            if (firstPart) {
                batch412Response.header = header;
                batch412Response.error = {
                    code: resContent.error.code,
                    message: resContent.error.message,
                    severity: resContent.error['@Common.Severity'] as string | undefined,
                    details: []
                };
                firstPart = false;
            }
            batch412Response.error.details.push(resContent.error.details[0]);
            batch412Response.error.details[batch412Response.error.details.length - 1]['Content-ID'] = contentId;
        },
        getUnifiedResponse: function (): string {
            let batchResponse = '';
            batchResponse += batch412Response.header;
            batchResponse += NL;
            const { error } = batch412Response;
            batchResponse += JSON.stringify({ error: error });
            batchResponse += NL;
            return batchResponse;
        }
    };
}

/**
 * Creates a router dedicated to batch request handling.
 * @param dataAccess the current DataAccess object
 * @returns a router function for batch handling
 */
export function batchRouter(dataAccess: DataAccess): NextHandleFunction {
    return async (req: IncomingMessageWithTenant, res: ServerResponse, next: NextFunction) => {
        try {
            dataAccess.checkSession(req);
            const boundary = getBoundary(req.headers['content-type'] as string);
            const body = (req as any).body;
            const batchData = parseBatch(new BatchContent(body), boundary);
            const globalHeaders: Record<string, string> = {};
            let batchResponse = '';
            //initialize the instance of aggregator of batch 412 responses
            aggregate412BatchResponseInstance = aggregate412BatchResponse();
            for (const part of batchData.parts) {
                if (isPartChangeSet(part)) {
                    batchResponse += `--${batchData.boundary}${NL}`;
                    batchResponse += `Content-Type: multipart/mixed; boundary=${part.boundary}${NL}`;
                    batchResponse += NL;
                    for (const changeSetPart of part.parts) {
                        const batchPartRes = await handlePart(
                            changeSetPart as BatchPart,
                            dataAccess,
                            part.boundary,
                            req.tenantId!,
                            globalHeaders,
                            true
                        );
                        if (batchPartRes !== null) {
                            batchResponse += batchPartRes;
                        }
                    }
                    // append the 412 batch response
                    batchResponse += aggregate412BatchResponseInstance.getUnifiedResponse();
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
