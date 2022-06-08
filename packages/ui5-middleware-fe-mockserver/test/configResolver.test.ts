import { resolveConfig } from '../src/configResolver';
import path from 'path';
import * as os from 'os';

describe('The config resolver', () => {
    it('can resolve the configuration', () => {
        const myBaseResolvedConfig = resolveConfig(
            {
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                service: {
                    urlBasePath: '/my/service',
                    name: 'URL',
                    metadataXmlPath: 'metadata.xml',
                    mockdataRootPath: 'mockData',
                    watch: false,
                    debug: false,
                    contextBasedIsolation: false
                },
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true
            },
            '/'
        );
        let myResolvedConfig = resolveConfig(
            {
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                services: [
                    {
                        urlBasePath: '/my/service',
                        name: 'URL',
                        metadataXmlPath: 'metadata.xml',
                        mockdataRootPath: 'mockData',
                        watch: false,
                        debug: false,
                        contextBasedIsolation: false
                    }
                ],
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true
            },
            '/'
        );
        expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
        myResolvedConfig = resolveConfig(
            {
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                services: [
                    {
                        urlPath: '/my/service/URL',
                        metadataXmlPath: 'metadata.xml',
                        mockdataRootPath: 'mockData',
                        watch: false,
                        debug: false,
                        contextBasedIsolation: false
                    }
                ],
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true
            },
            '/'
        );
        expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
        myResolvedConfig = resolveConfig(
            {
                mockFolder: __dirname,
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true
            },
            '/'
        );
        if (os.type() !== 'Windows_NT') {
            myResolvedConfig = JSON.parse(JSON.stringify(myResolvedConfig).replace(new RegExp(__dirname, 'g'), ''));
            expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
        }
        myResolvedConfig = resolveConfig(
            {
                mockFolder: path.resolve(__dirname, 'jsConfig'),
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true
            },
            '/'
        );
        if (os.type() !== 'Windows_NT') {
            myResolvedConfig = JSON.parse(JSON.stringify(myResolvedConfig).replace(new RegExp(__dirname, 'g'), ''));

            expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
        }
    });

    it('can also resolve cds path or empty services', () => {
        const myBaseResolvedConfig = resolveConfig(
            {
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                service: {
                    urlBasePath: '/my/service',
                    name: 'URL',
                    metadataCdsPath: 'metadata.cds',
                    mockdataRootPath: 'mockData'
                }
            },
            '/'
        );
        expect(myBaseResolvedConfig.services[0].metadataPath).toBeDefined();
        const myBaseResolvedConfig2 = resolveConfig({}, '/');
        expect(myBaseResolvedConfig2.services).toBeDefined();
        expect(myBaseResolvedConfig2.services.length).toBe(0);
    });

    it('can also apply overrides per service', () => {
        const myBaseResolvedConfig = resolveConfig(
            {
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                services: [
                    {
                        urlBasePath: '/my/service',
                        name: 'URL',
                        metadataCdsPath: 'metadata.cds',
                        mockdataRootPath: 'mockData'
                    },
                    {
                        urlBasePath: '/my/other/service',
                        name: 'URL',
                        metadataCdsPath: 'metadata.cds',
                        mockdataRootPath: 'mockData',
                        watch: false,
                        debug: false,
                        strictKeyMode: false,
                        contextBasedIsolation: false,
                        noETag: false,
                        generateMockData: false
                    }
                ],
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true,
                noETag: true,
                generateMockData: true
            },
            '/'
        );
        expect(myBaseResolvedConfig.services[0].watch).toBe(true);
        expect(myBaseResolvedConfig.services[1].watch).toBe(false);
        expect(myBaseResolvedConfig.services[0].debug).toBe(true);
        expect(myBaseResolvedConfig.services[1].debug).toBe(false);
        expect(myBaseResolvedConfig.services[0].strictKeyMode).toBe(true);
        expect(myBaseResolvedConfig.services[1].strictKeyMode).toBe(false);
        expect(myBaseResolvedConfig.services[0].contextBasedIsolation).toBe(true);
        expect(myBaseResolvedConfig.services[1].contextBasedIsolation).toBe(false);
        expect(myBaseResolvedConfig.services[0].noETag).toBe(true);
        expect(myBaseResolvedConfig.services[1].noETag).toBe(false);
        expect(myBaseResolvedConfig.services[0].generateMockData).toBe(true);
        expect(myBaseResolvedConfig.services[1].generateMockData).toBe(false);
    });
});
