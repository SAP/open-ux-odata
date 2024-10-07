import type { NextFunction, NextHandleFunction } from 'connect';
import type { ServerResponse } from 'http';
import * as http from 'http';
import type { ExecutionError } from '../data/common';
import type { DataAccess } from '../data/dataAccess';
import ODataRequest from '../request/odataRequest';
import type { Batch, BatchPart } from './batchParser';
import { BatchContent, getBoundary, parseBatch } from './batchParser';
import type { IncomingMessageWithTenant } from './serviceRouter';

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

type ErrorInfo = {
    header: string;
    error: ErrorResponse;
    contentId?: string;
};

/**
 * Returns the result whether isRequest part of changeset or not.
 * @param part
 * @returns {boolean}
 */
export function isPartChangeSet(part: BatchPart | Batch): part is Batch {
    return (part as Batch).isChangeSet;
}

const NL = '\r\n';

/**
 * Get the part request.
 * @param partDefinition
 * @param dataAccess
 * @param tenantId
 * @returns {ODataRequest}
 */
async function getPartRequest(
    partDefinition: BatchPart,
    dataAccess: DataAccess,
    tenantId: string
): Promise<ODataRequest> {
    const partRequest = new ODataRequest({ ...partDefinition, tenantId: tenantId }, dataAccess);
    await partRequest.handleRequest();
    return partRequest;
}

/**
 * Get the header of the part response.
 * @param partRequest
 * @param partDefinition
 * @param boundary
 * @param globalHeaders
 * @param isResponse412ChangeSet
 * @returns {string} Response string corresponding to the part request.
 */
function getPartResponseHeader(
    partRequest: ODataRequest,
    partDefinition: BatchPart,
    boundary: string,
    globalHeaders: Record<string, string>,
    isResponse412ChangeSet: boolean
) {
    let batchResponse = '';
    if (!isResponse412ChangeSet) {
        batchResponse += `--${boundary}${NL}`;
    }
    batchResponse += `Content-Type: application/http${NL}`;
    batchResponse += `Content-Transfer-Encoding: binary${NL}`;
    const contentId = partDefinition.contentId;
    if (partDefinition.contentId && !isResponse412ChangeSet) {
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
    return batchResponse;
}

/**
 * Get the part response.
 * @param partRequest
 * @param partDefinition
 * @param boundary
 * @param globalHeaders
 * @param isResponse412ChangeSet
 * @returns {string} Response string corresponding to the part request.
 */
function getPartResponse(
    partRequest: ODataRequest,
    partDefinition: BatchPart,
    boundary: string,
    globalHeaders: Record<string, string>,
    isResponse412ChangeSet: boolean
) {
    let batchResponse = getPartResponseHeader(
        partRequest,
        partDefinition,
        boundary,
        globalHeaders,
        isResponse412ChangeSet
    );

    const responseData = partRequest.getResponseData();
    if (responseData) {
        batchResponse += responseData;
        //batchResponse += NL; // End of body content
    }
    batchResponse += NL;

    return batchResponse;
}

/**
 * Get the single error containing all 412 responses.
 * @param errors412
 * @returns {string} Response string containing single error holding all 412 responses.
 */
function getCombined412ErrorResponse(errors412: ErrorInfo[]) {
    const errorInfo = {
        header: '',
        error: {
            code: '',
            message: '',
            severity: '',
            details: [] as ErrorDetails[]
        } as ErrorResponse
    } as ErrorInfo;

    // Create single error combining all the 412 responses.
    const overall412ErrorInfo = errors412.reduce((accumErrorInfo: ErrorInfo, { header, error, contentId }, idx) => {
        if (idx === 0) {
            // Add header of only the first 412 error.
            accumErrorInfo.header += header;
            // Setting the first 412 error at the top.
            accumErrorInfo.error = {
                code: error.code,
                message: error.message,
                severity: error['@Common.Severity'] as string | undefined,
                details: []
            };
        }

        // Accumulate all remaining errors in error details.
        const details = [...error.details].map((errDetail) => {
            errDetail['@Core.ContentID'] = contentId;
            return errDetail;
        });
        accumErrorInfo.error.details = accumErrorInfo.error.details.concat(details);

        return accumErrorInfo;
    }, errorInfo);

    // Convert the single error into response string.
    let response = '';
    response += overall412ErrorInfo.header;
    response += NL;
    const { error } = overall412ErrorInfo;
    response += JSON.stringify({ error: error });
    response += NL;

    return response;
}

/**
 * Get 412 error information from the request's response.
 * @param errors412
 * @returns 412 Error information containing header, error object and content-Id.
 */
function get412ErrorInfo(
    partResponseIs412: boolean,
    partRequest: ODataRequest,
    changeSetPart: BatchPart,
    boundary: string,
    globalHeaders: Record<string, string>
) {
    if (partResponseIs412) {
        const error412Object = partRequest.getResponseData();
        if (typeof error412Object === 'string') {
            return {
                header: getPartResponseHeader(partRequest, changeSetPart, boundary, globalHeaders, true),
                error: JSON.parse(error412Object).error as ErrorResponse,
                contentId: changeSetPart.contentId
            };
        }
    }
}

/**
 * Get the change set response.
 * @param changeSet
 * @param dataAccess
 * @param tenantId
 * @param globalHeaders
 * @returns Response string corresponding to the change set request.
 */
async function getChangeSetResponse(
    changeSet: Batch,
    dataAccess: DataAccess,
    tenantId: string,
    globalHeaders: Record<string, string>
) {
    const errors412 = [];
    let changeSetFailed = false;

    let batchResponse = `Content-Type: multipart/mixed; boundary=${changeSet.boundary}${NL}`;
    batchResponse += NL;

    for (const changeSetPart of changeSet.parts) {
        const partRequest = await getPartRequest(changeSetPart as BatchPart, dataAccess, tenantId);
        const statusCode = (partRequest?.statusCode ?? '').toString();

        const partResponseIs412 = statusCode === '412';
        const overallErrorStateIs412 = errors412.length > 0 || partResponseIs412;
        if (overallErrorStateIs412) {
            // 412 encountered.
            const errorInfo412 = get412ErrorInfo(
                partResponseIs412,
                partRequest,
                changeSetPart as BatchPart,
                changeSet.boundary,
                globalHeaders
            );
            if (errorInfo412) {
                errors412.push(errorInfo412);
            }
            // NOTE: If earlier part had a 412 response, so we only accumulate 412 responses from remaining parts.
        } else {
            const batchPartRes = getPartResponse(
                partRequest,
                changeSetPart as BatchPart,
                changeSet.boundary,
                globalHeaders,
                false
            );
            if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
                // Other error responses of 4XX and 5XX (ChangeSet failed).
                // We presently override the response and exit in these scenarios.
                // NOTE: This might change on implementation of continue-on-error.
                batchResponse = batchPartRes;
                changeSetFailed = true;
                break;
            } else if (batchPartRes !== null) {
                // No error
                batchResponse += batchPartRes;
            }
        }
    }

    if (errors412.length > 0) {
        // Reset response with combine of 412 errors.
        batchResponse = getCombined412ErrorResponse(errors412);
    } else if (!changeSetFailed) {
        // No error, we close the changeset boundary
        batchResponse += `--${changeSet.boundary}--${NL}`;
    }

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
            dataAccess.checkSession(req);
            const boundary = getBoundary(req.headers['content-type'] as string);
            const body = (req as any).body;
            const batchData = parseBatch(new BatchContent(body), boundary);
            const globalHeaders: Record<string, string> = {};
            let batchResponse = '';

            for (const part of batchData.parts) {
                if (isPartChangeSet(part)) {
                    batchResponse += `--${batchData.boundary}${NL}`;
                    batchResponse += await getChangeSetResponse(part, dataAccess, req.tenantId!, globalHeaders);
                } else {
                    const partRequest = await getPartRequest(part, dataAccess, req.tenantId!);
                    batchResponse += getPartResponse(partRequest, part, boundary, globalHeaders, false);
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
            // Check if the error makes the whole request fail
            const customError = e as ExecutionError;
            if (customError.isGlobalRequestError) {
                res.statusCode = customError.statusCode;
                for (const headerName in customError.headers) {
                    res.setHeader(headerName, customError.headers[headerName]);
                }
                res.end();
                return;
            }
            next(e);
        }
    };
}
