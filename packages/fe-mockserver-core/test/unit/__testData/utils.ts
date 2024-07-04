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
