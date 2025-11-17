import * as os from 'os';
import path from 'path';
import { resolveConfig } from '../src/configResolver';

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

    it('can also resolve resolveExternalServiceReferences', () => {
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
                    mockdataRootPath: 'mockData',
                    resolveExternalServiceReferences: true
                }
            },
            '/'
        );

        expect(myBaseResolvedConfig.services[0].resolveExternalServiceReferences).toBe(true);
    });

    it('can also apply overrides per service', () => {
        const myBaseResolvedConfig = resolveConfig(
            {
                metadataProcessor: {
                    name: 'myMetadataProcessor',
                    options: {
                        myOption: 'myValue'
                    }
                },
                annotations: {
                    localPath: 'myAnnotation.xml',
                    urlPath: '/my/Annotation.xml'
                },
                services: [
                    {
                        urlBasePath: '/my/service',
                        name: 'URL',
                        metadataCdsPath: 'metadata.cds'
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
                        generateMockData: false,
                        metadataProcessor: {
                            name: 'myOverriddenMetadataProcessor',
                            options: {
                                myOverriddenOption: 'myOverriddenValue'
                            }
                        }
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
        expect(myBaseResolvedConfig.services[0].mockdataPath).toBeDefined();
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
        expect(myBaseResolvedConfig.services[0].metadataProcessor).toBeUndefined(); // no override
        expect(myBaseResolvedConfig.services[1].metadataProcessor).toEqual({
            name: 'myOverriddenMetadataProcessor',
            options: {
                myOverriddenOption: 'myOverriddenValue'
            }
        });
    });

    it('can resolve service alias configuration', () => {
        const configWithAlias = resolveConfig(
            {
                services: [
                    {
                        urlBasePath: '/first/service',
                        alias: 'service1',
                        name: 'FirstService',
                        metadataXmlPath: 'first-metadata.xml',
                        mockdataRootPath: 'first-mockdata',
                        watch: false,
                        debug: false,
                        contextBasedIsolation: false
                    },
                    {
                        urlBasePath: '/second/service',
                        alias: 'service2',
                        name: 'SecondService',
                        metadataXmlPath: 'second-metadata.xml',
                        mockdataRootPath: 'second-mockdata',
                        watch: false,
                        debug: false,
                        contextBasedIsolation: false
                    },
                    {
                        urlBasePath: '/third/service',
                        // No alias for this service
                        name: 'ThirdService',
                        metadataXmlPath: 'third-metadata.xml',
                        mockdataRootPath: 'third-mockdata',
                        watch: false,
                        debug: false,
                        contextBasedIsolation: false
                    }
                ]
            },
            '/'
        );

        // First service should have alias
        expect(configWithAlias.services[0].alias).toBe('service1');
        expect(configWithAlias.services[0].urlPath).toBe('/first/service/FirstService');

        // Second service should have alias
        expect(configWithAlias.services[1].alias).toBe('service2');
        expect(configWithAlias.services[1].urlPath).toBe('/second/service/SecondService');

        // Third service should not have alias (undefined)
        expect(configWithAlias.services[2].alias).toBeUndefined();
        expect(configWithAlias.services[2].urlPath).toBe('/third/service/ThirdService');
    });
});
