/**
 * Exracts JSON response from multipart content in case of changeset batch
 *
 * @param batchResponse
 */

export function getJsonFromMultipartContent(batchResponse: string) {
    const changeSetBoundaryprefix = '--changeset';
    const partResponses: unknown[] = [];
    const responseLines = batchResponse.split(changeSetBoundaryprefix);
    responseLines.forEach(function (value) {
        const startJson = value.indexOf('{');
        const endJson = value.lastIndexOf('}');
        if (startJson < 0 || endJson < 0) {
            return;
        }
        let responseJson = value.slice(startJson, endJson + 1);
        responseJson = JSON.parse(responseJson);
        partResponses.push(responseJson);
    });
    return partResponses;
}

export function getStatusAndHeadersFromMultipartContent(batchResponse: string) {
    const changeSetBoundaryprefix = '--changeset';
    const partInfos: unknown[] = [];
    const responseLines = batchResponse.split(changeSetBoundaryprefix);
    responseLines.forEach(function (value) {
        const start = value.indexOf('\r\n\r\n');
        const end = start >= 0 ? value.indexOf('\r\n\r\n', start + 4) : -1;
        if (start < 0 || end < 0) {
            return;
        }
        const data = value
            .slice(start + 4, end)
            .replace(/\r\n/g, '|')
            .split('|');
        if (data.length === 0 || !data[0].startsWith('HTTP/1.1 ')) {
            return;
        }
        const status = parseInt(data[0].split(' ')[1], 10);
        const headers: Record<string, string> = {};
        data.slice(1).forEach(function (header) {
            const headerParts = header.split(': ');
            headers[headerParts[0]] = headerParts[1];
        });
        const info = { status, headers };
        partInfos.push(info);
    });
    return partInfos;
}
