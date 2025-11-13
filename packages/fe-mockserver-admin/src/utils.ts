import compiler from '@sap/cds-compiler';
import fs from 'fs';

export function cds2edmx(cds: string, service = 'sap.fe.test.JestService', options: compiler.ODataOptions = {}) {
    const sources: Record<string, string> = { 'source.cds': cds };

    // allow to include stuff from @sap/cds/common
    if (cds.includes("'@sap/cds/common'")) {
        sources['common.cds'] = fs.readFileSync(require.resolve('@sap/cds/common.cds'), 'utf-8');
    }

    const csn = compiler.compileSources(sources, {});

    const edmxOptions: compiler.ODataOptions = {
        odataForeignKeys: true,
        odataFormat: 'structured',
        odataContainment: true,
        ...options,
        service: service
    };

    const edmx = compiler.to.edmx(csn, edmxOptions);
    if (!edmx) {
        throw new Error(`Compilation failed. Hint: Make sure that the CDS model defines service ${service}.`);
    }
    return edmx;
}

export const compileCDS = function (cdsUrl: string, options: compiler.ODataOptions = {}) {
    const cdsString = fs.readFileSync(cdsUrl, 'utf-8');
    return cds2edmx(cdsString, 'sap.fe.test.JestService', options);
};
