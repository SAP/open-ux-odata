import type { RawMetadata } from '@sap-ux/vocabularies-types';
import { MergedRawMetadata } from './utils';

/**
 * Merges multiple metadata output from the parser together into one.
 *
 * @param parserOutputs the different output from the parser
 * @returns The merge metadata output
 */
export function merge(...parserOutputs: RawMetadata[]): RawMetadata {
    const outParserOutput = new MergedRawMetadata(parserOutputs[0]);

    parserOutputs.forEach((parserOutput: RawMetadata) => {
        outParserOutput.addParserOutput(parserOutput);
    });

    return outParserOutput;
}
