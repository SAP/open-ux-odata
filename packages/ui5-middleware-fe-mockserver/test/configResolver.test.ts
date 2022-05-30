import { resolveConfig } from '../src/configResolver';
import path from 'path';

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
        expect(myBaseResolvedConfig).toMatchSnapshot();
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
        myResolvedConfig = JSON.parse(JSON.stringify(myResolvedConfig).replace(new RegExp(__dirname, 'g'), ''));
        expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
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
        myResolvedConfig = JSON.parse(JSON.stringify(myResolvedConfig).replace(new RegExp(__dirname, 'g'), ''));
        expect(myResolvedConfig).toEqual(myBaseResolvedConfig);
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
        expect(myBaseResolvedConfig).toMatchSnapshot();

        const myBaseResolvedConfig2 = resolveConfig({}, '/');
        expect(myBaseResolvedConfig2).toMatchSnapshot();
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
                        noETag: false
                    }
                ],
                watch: true,
                debug: true,
                strictKeyMode: true,
                contextBasedIsolation: true,
                noETag: true
            },
            '/'
        );
        expect(myBaseResolvedConfig).toMatchSnapshot();
    });
});
