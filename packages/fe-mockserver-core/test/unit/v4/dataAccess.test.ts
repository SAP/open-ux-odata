import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ServiceConfig } from '../../../src';
import { DataAccess } from '../../../src/data/dataAccess';
import { ODataMetadata } from '../../../src/data/metadata';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import ODataRequest from '../../../src/request/odataRequest';

describe('Data Access', () => {
    let dataAccess!: DataAccess;
    let stickyDataAccess!: DataAccess;
    let metadata!: ODataMetadata;
    let stickyMetadata!: ODataMetadata;
    const baseUrl = 'http://localhost:8080/sap/fe/preview/Form';
    const fileLoader = new FileSystemLoader();
    const metadataProvider = new CDSMetadataProvider(fileLoader);
    beforeAll(async () => {
        const baseDir = join(__dirname, 'services', 'formSample');
        const baseStickyDir = join(__dirname, 'services', 'stickySample');

        const edmx = await metadataProvider.loadMetadata(join(baseDir, '/FormTemplate.cds'));
        const stickyEdmx = readFileSync(join(baseStickyDir, 'metadata.xml'), 'utf8');
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');

        stickyMetadata = await ODataMetadata.parse(stickyEdmx, baseUrl + '/$metadata');
        const serviceRegistry = {
            getService: jest.fn(),
            registerService: jest.fn(),
            getServicesWithAliases: jest.fn()
        } as any;
        dataAccess = new DataAccess(
            { mockdataPath: baseDir } as ServiceConfig,
            metadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
        stickyDataAccess = new DataAccess(
            { mockdataPath: baseStickyDir } as ServiceConfig,
            stickyMetadata,
            fileLoader,
            undefined,
            serviceRegistry
        );
    });
    test('v4metadata - it can GET data for an entity', async () => {
        let odataRequest = new ODataRequest(
            {
                url: `/Countries`,
                method: 'GET'
            },
            dataAccess
        );
        let countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(7);
        expect(odataRequest.dataCount).toEqual(7);
        odataRequest = new ODataRequest(
            {
                url: '/Countries?$skip=0&$top=3',
                method: 'GET'
            },
            dataAccess
        );
        countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(7);
        expect(countryData[0].Country_Code).toEqual('DE');
        expect(countryData[0].PeopleCount).toEqual(70);
        expect(countryData[0].SuperHeroCount).toEqual(7);
        countryData = await dataAccess.getData(
            new ODataRequest({ url: '/Countries?$skip=1&$top=3', method: 'GET' }, dataAccess)
        );
        expect(countryData.length).toEqual(3);
        expect(countryData[0].Country_Code).toEqual('FR');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$select=Country_Code' }, dataAccess)
        );
        expect(countryData[0].Country_Code).toEqual('DE');
        expect(countryData[0].Name).toBeUndefined();
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Country_Code eq 'FR'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('FR');
        expect(countryData[0].Name).toEqual('France');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries(Country_Code='FR')" }, dataAccess)
        );
        expect(countryData.Country_Code).toEqual('FR');
        expect(countryData.Name).toEqual('France');
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=tolower(Country_Code) eq tolower('DE')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');

        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=contains(tolower(Country_Code), tolower('DE'))" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Country_Code).toEqual('DE');

        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=contains(tolower(Country_Code), 'DE')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);

        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=contains(tolower(Country_Code), 'de')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Country_Code).toEqual('DE');

        countryData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/Countries?$filter=concat(tolower(Country_Code), toupper(MainLanguage)) eq 'deGERMAN'"
                },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');

        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=tolower(Country_Code) eq 'de'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Country_Code eq toupper('de')" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Country_Code eq 'de'" }, dataAccess)
        );
        expect(countryData.length).toEqual(0);
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=(tolower(Country_Code) eq 'de' or Country_Code eq 'Fr')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=toupper(Country_Code) eq toupper('dE')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Name eq 'U S A'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('U S A');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Name eq 'U s A'" }, dataAccess)
        );
        expect(countryData.length).toEqual(0);

        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCount,Country_Code' }, dataAccess)
        );
        expect(countryData.length).toEqual(7);
        expect(countryData[0].Country_Code).toEqual(null);
        expect(countryData[1].Country_Code).toEqual('LV');
        expect(countryData[2].Country_Code).toEqual('IR');
        expect(countryData[3].Country_Code).toEqual('FR');
        expect(countryData[4].Country_Code).toEqual('DE');
        expect(countryData[5].Country_Code).toEqual('US');
        expect(countryData[6].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCount,Country_Code desc' }, dataAccess)
        );
        expect(countryData.length).toEqual(7);
        expect(countryData[0].Country_Code).toEqual(null);
        expect(countryData[1].Country_Code).toEqual('LV');
        expect(countryData[2].Country_Code).toEqual('IR');
        expect(countryData[3].Country_Code).toEqual('FR');
        expect(countryData[4].Country_Code).toEqual('US');
        expect(countryData[5].Country_Code).toEqual('DE');
        expect(countryData[6].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCount desc,Country_Code' }, dataAccess)
        );
        expect(countryData.length).toEqual(7);
        expect(countryData[6].Country_Code).toEqual('LV');
        expect(countryData[5].Country_Code).toEqual(null);
        expect(countryData[4].Country_Code).toEqual('IR');
        expect(countryData[3].Country_Code).toEqual('FR');
        expect(countryData[2].Country_Code).toEqual('US');
        expect(countryData[1].Country_Code).toEqual('DE');
        expect(countryData[0].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCountStr desc,Country_Code' }, dataAccess)
        );
        expect(countryData.length).toEqual(7);
        expect(countryData[6].Country_Code).toEqual('LV');
        expect(countryData[5].Country_Code).toEqual(null);
        expect(countryData[4].Country_Code).toEqual('IR');
        expect(countryData[3].Country_Code).toEqual('FR');
        expect(countryData[2].Country_Code).toEqual('US');
        expect(countryData[1].Country_Code).toEqual('DE');
        expect(countryData[0].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$search=Fra' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('FR');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$search=%22Fra%22' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('FR');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$search="Fra"' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('FR');

        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$search="English"' }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Country_Code).toEqual('IR');
        expect(countryData[1].Country_Code).toEqual('US');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$search="English" "Ire"' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('IR');
    });
    test('v4metadata - it can GET data for a singleton', async () => {
        let odataRequest = new ODataRequest({ method: 'GET', url: '/MySingleton' }, dataAccess);
        let singletonData = await dataAccess.getData(odataRequest);
        expect(singletonData).toStrictEqual({ prop1: true, name: 'Me' });
        odataRequest = new ODataRequest({ method: 'GET', url: '/MySingleton/prop1' }, dataAccess);
        await odataRequest.handleRequest();
        singletonData = JSON.parse(odataRequest.getResponseData() || '');
        expect(singletonData.value).toEqual(true);
    });
    test('v4metadata - it can GET data for an entity with complex filter function', async () => {
        let countryData;
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=startswith(Name, 'I')" }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Name).toEqual('India');
        expect(countryData[1].Name).toEqual('Ireland');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=endswith(Name, 'dia')" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('India');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=contains(Name, 'ran')" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('France');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=contains(Name, 'Ran')" }, dataAccess)
        );
        expect(countryData.length).toEqual(0);
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=matchesPattern(Name,'%5E.*a$')" }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Name).toEqual('India');
        expect(countryData[1].Name).toEqual('Latvia');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=matchesPattern(Name,'%5EL.*a$')" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('Latvia');
    });
    test('v4metadata - it can GET data with an afterRead', async () => {
        const query = new ODataRequest(
            { method: 'GET', url: '/Countries?$filter=length(Name) eq 5&$yolo=true' },
            dataAccess
        );
        const countryData = await dataAccess.getData(query);
        expect(countryData.length).toEqual(3);
        expect(countryData[0].Name).toEqual('India');
        expect(countryData[1].Name).toEqual('U S A');
        expect(countryData[2].Name).toEqual('France');
        expect(query.dataCount).toBe(3);
    });
    test('v4metadata - it can GET data for an entity with complex filter function with comparison', async () => {
        let countryData;
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=length(Name) eq 5' }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        expect(countryData[0].Name).toEqual('India');
        expect(countryData[1].Name).toEqual('U S A');
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=concat(Country_Code, 'DE') eq 'DEDE'" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('Germany');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=indexof(Name, 'via') eq 3" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('Latvia');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=substring(Name, 2) eq 'tvia'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('Latvia');

        ///CountryCodes/any(ent:ent eq 'GBR')
    });
    test('v4metadata - GET with $filter involving a navigation property that is null for some elements', async () => {
        const formRootData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Part1?$expand=part2&$filter=part2/number eq 1' }, dataAccess)
        );
        expect(formRootData).toMatchSnapshot();
    });
    test('v4metadata - it can GET data for an entity with lambda operator', async () => {
        let countryData;
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=SpokenLanguages/any(ent:ent eq 'English')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(4);
        expect(countryData[0].Name).toEqual('Germany');
        expect(countryData[1].Name).toEqual('India');
        expect(countryData[2].Name).toEqual('Ireland');
        expect(countryData[3].Name).toEqual('U S A');
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=SpokenLanguages/all(ent:ent eq 'English')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Name).toEqual('U S A');
    });
    describe('additional $filter tests', () => {
        let dataAccess!: DataAccess;

        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', '$filter-tests');
            const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
            const metadata = await ODataMetadata.parse(edmx, '/FilterTest/$metadata');
            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;
            dataAccess = new DataAccess(
                { mockdataPath: baseDir } as ServiceConfig,
                metadata,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });

        const cases = [
            { url: '/Entities?$filter=navigationProperty2/value eq 0', expected: ['A'] },

            { url: '/Entities?$filter=collectionProperty1/any(d:d gt 0)', expected: ['A', 'B', 'C'] },
            { url: '/Entities?$filter=collectionProperty1/all(d:d gt 0)', expected: ['B', 'C'] },

            { url: '/Entities?$filter=collectionProperty2/any(d:d/value gt 0)', expected: ['A', 'B', 'C'] },
            { url: '/Entities?$filter=collectionProperty2/all(d:d/value gt 0)', expected: ['B', 'C'] },

            { url: '/Entities?$filter=navigationProperty1/any(d:d/value gt 0)', expected: ['A', 'B'] },
            { url: '/Entities?$filter=navigationProperty1/all(d:d/value gt 0)', expected: ['B', 'C'] },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/value gt 0 and d/navigationProperty2/value eq 1)',
                expected: ['A']
            },

            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/collectionProperty1/any(e:e gt 0))',
                expected: ['A', 'B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/collectionProperty1/all(e:e gt 1))',
                expected: ['B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/collectionProperty1/any(e:e gt 0))',
                expected: ['A', 'B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/collectionProperty1/all(e:e gt 0))',
                expected: ['B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/collectionProperty2/any(e:e/value gt 0))',
                expected: ['A', 'B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/collectionProperty2/all(e:e/value gt 1))',
                expected: ['B']
            },

            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/collectionProperty2/any(e:e/value gt 0))',
                expected: ['A', 'B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/collectionProperty2/all(e:e/value gt 0))',
                expected: ['B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/navigationProperty1/any(e:e/value gt 0))',
                expected: ['A', 'B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/navigationProperty1/all(e:e/value gt 1))',
                expected: ['B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/navigationProperty1/any(e:e/value gt 0))',
                expected: ['A', 'B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/all(d:d/navigationProperty1/all(e:e/value gt 0))',
                expected: ['B', 'C']
            },
            {
                url: '/Entities?$filter=collectionProperty2/all(d:d/value gt 0) and navigationProperty1/all(f:f/value eq 1)',
                expected: ['B', 'C']
            },
            {
                url: '/Entities?$filter=navigationProperty2/parent/navigationProperty1/all(d:d/value gt 0)',
                expected: ['C']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/parent/navigationProperty2/value gt 0)',
                expected: ['B']
            },
            {
                url: '/Entities?$filter=navigationProperty1/any(d:d/value gt 0)&$expand=navigationProperty1($select=ID),navigationProperty2',
                expected: ['A', 'B']
            }
        ];

        test.each(cases)('GET $url', async ({ url, expected }) => {
            const result = await dataAccess.getData(
                new ODataRequest({ method: 'GET', url: url + '&$select=ID' }, dataAccess)
            );
            expect(result).toMatchObject(expected.map((e) => ({ ID: e })));
            expect(result).toMatchSnapshot();
        });
    });

    test('v4metadata - it can POST data for an entity', async () => {
        let countryData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Countries' }, dataAccess));
        expect(countryData.length).toEqual(7);
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount gt 750' }, dataAccess)
        );
        expect(countryData.length).toEqual(0);
        countryData = await dataAccess.updateData(
            new ODataRequest({ method: 'GET', url: "/Countries(Country_Code='FR')" }, dataAccess),
            { PeopleCount: 800 }
        );
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount gt 750' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
    });
    test('v4metadata - supported filter expressions', async () => {
        // Text Filters
        let countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=Country_Code eq 'FR'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('FR');

        // Numeric Filters
        // GT
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount gt 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(4);
        // GE
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount ge 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(5);
        // LT
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount lt 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        // LE
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount le 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(3);
        // EQ
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount eq 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/Countries?$filter=PeopleCountStr eq '00003'" }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        // NE
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount ne 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(6);
        // Boolean
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=IsHot eq true' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        // AND Filters
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/Countries?$filter=PeopleCount gt 3 and IsHot eq true' },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
        // OR Filters
        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/Countries?$filter=PeopleCount lt 3 or PeopleCount eq 70' },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(4);
    });
    test('v4 metadata with draft, POST', async () => {
        // Create Empty Element
        const formElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess),
            {
                FirstName: 'Bob'
            }
        );
        expect(formElement).toBeDefined;
        expect(formElement.IsActiveEntity).toEqual(false);
        expect(formElement.HasActiveEntity).toEqual(false);
        expect(formElement.HasDraftEntity).toEqual(false);

        expect(formElement.ID).toEqual(1);

        let formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$expand=DraftAdministrativeData' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].DraftAdministrativeData).not.toBeNull();
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(1);
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=DraftAdministrativeData' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].DraftAdministrativeData).toBeDefined();
        // Activate it
        let actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/sap.fe.core.Form.draftActivate' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;
        expect(actionResult.DraftAdministrativeData).toBeNull();
        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(2);
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=DraftAdministrativeData' },
                dataAccess
            )
        );
        expect(formData[1].DraftAdministrativeData).toBeNull();
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Bob');
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(0);

        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;

        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(3);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Bob');
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false?&expand=DraftAdministrativeData' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].DraftAdministrativeData).not.toBeNull();

        let subElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/_Elements' }, dataAccess),
            {
                Name: '/Child'
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('/Child');
        // Discard the draft
        actionResult = await dataAccess.deleteData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)' }, dataAccess)
        );
        expect(actionResult).toBeDefined;

        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$expand=_Elements' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[0]._Elements.length).toEqual(0);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Bob');
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(0);

        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;

        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(3);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Bob');
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(1);

        await dataAccess.updateData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)' }, dataAccess),
            {
                FirstName: 'Mark'
            }
        );

        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Bob');

        subElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/_Elements' }, dataAccess),
            {
                Name: 'OtherChild'
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('OtherChild');

        subElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/_Elements' }, dataAccess),
            {
                ID: 777,
                Name: 'SecondChild',
                sibling_ID: 1
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('SecondChild');

        subElement = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/_Elements' }, dataAccess)
        );
        expect(subElement).toBeDefined;
        expect(subElement.length).toEqual(2);

        subElement = await dataAccess.updateData(
            new ODataRequest({ method: 'PATCH', url: '/SubElements(ID=1,IsActiveEntity=false)' }, dataAccess),
            {
                Name: 'OtherChild2',
                sibling_ID: 2
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('OtherChild2');

        subElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/SpecialOne' }, dataAccess),
            {
                Name: 'My Favorite'
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('My Favorite');

        // Activate the Draft
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                {
                    method: 'POST',
                    url: '/FormRoot(ID=1,IsActiveEntity=false)/sap.fe.core.Form.draftActivate?$select=LastName&$expand=SpecialOne'
                },
                dataAccess
            )
        );
        expect(actionResult).toMatchInlineSnapshot(`
            {
              "ID": 1,
              "IsActiveEntity": true,
              "LastName": "",
              "SpecialOne": {
                "DraftAdministrativeData": null,
                "HasActiveEntity": false,
                "HasDraftEntity": false,
                "ID": 0,
                "IsActiveEntity": true,
                "Name": "My Favorite",
                "Processed": true,
                "owner_ID": 0,
                "sibling_ID": 0,
              },
            }
        `);

        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(2);
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=_Elements,SpecialOne' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Mark');
        expect(formData[1]._Elements.length).toEqual(2);
        expect(formData[1]._Elements[0].Name).toEqual('OtherChild2');
        expect(formData[1]._Elements[1].Name).toEqual('SecondChild');
        expect(formData[1].SpecialOne.Name).toEqual('My Favorite');
        expect(formData[1].SpecialOne.IsActiveEntity).toEqual(true);
        expect(formData[1].SpecialOne.HasDraftEntity).toEqual(false);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(0);
        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements,SpecialOne' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        expect(formData[0]._Elements.length).toEqual(2);
        expect(formData[0]._Elements[0].Name).toEqual('OtherChild2');
        expect(formData[0]._Elements[1].Name).toEqual('SecondChild');
        expect(formData[0].SpecialOne.Name).toEqual('My Favorite');
        expect(formData[0].SpecialOne.IsActiveEntity).toEqual(false);
        expect(formData[0].SpecialOne.HasActiveEntity).toEqual(true);
        // Activate the Draft
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/sap.fe.core.Form.draftActivate' },
                dataAccess
            )
        );
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=_Elements' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Mark');
        expect(formData[1]._Elements.length).toEqual(2);
        expect(formData[1]._Elements[0].Name).toEqual('OtherChild2');
        expect(formData[1]._Elements[1].Name).toEqual('SecondChild');
        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );

        const preDeleteData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements,SpecialOne,DraftAdministrativeData'
                },
                dataAccess
            )
        );
        // Delete one child
        actionResult = await dataAccess.deleteData(
            new ODataRequest({ method: 'DELETE', url: '/SubElements(ID=777,IsActiveEntity=false)' }, dataAccess)
        );
        formData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements,SpecialOne,DraftAdministrativeData'
                },
                dataAccess
            )
        );
        expect(preDeleteData[0].DraftAdministrativeData.LastChangeDateTime).not.toEqual(
            formData[0].DraftAdministrativeData.LastChangeDateTime
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        expect(formData[0]._Elements.length).toEqual(1);
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=false)/sap.fe.core.Form.draftActivate' },
                dataAccess
            )
        );
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=_Elements' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(2);
        expect(formData[1].FirstName).toEqual('Mark');
        expect(formData[1]._Elements.length).toEqual(1);

        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=0,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;

        const preDeleteData2 = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements,SpecialOne,DraftAdministrativeData'
                },
                dataAccess
            )
        );
        // Add one child
        subElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot(ID=0,IsActiveEntity=false)/_Elements' }, dataAccess),
            {
                ID: 888,
                Name: 'SecondChild',
                sibling_ID: 1
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('SecondChild');
        subElement = await dataAccess.updateData(
            new ODataRequest({ method: 'GET', url: '/SubElements(ID=888,IsActiveEntity=false)' }, dataAccess),
            {
                Name: 'SecondChild2'
            }
        );

        formData = await dataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements,SpecialOne,DraftAdministrativeData'
                },
                dataAccess
            )
        );
        expect(preDeleteData2[0].DraftAdministrativeData.LastChangeDateTime).not.toEqual(
            formData[0].DraftAdministrativeData.LastChangeDateTime
        );

        expect(preDeleteData2[0].SpecialOne).toEqual(formData[0].SpecialOne);
        expect(preDeleteData2[0].SpecialOne.ID).toEqual(456);
    });

    test('v4 cross draft scenarios', async () => {
        // Create Empty Element
        const formElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/FormRoot', tenantId: 'other' }, dataAccess),
            {
                ID: 2,
                FirstName: 'Bob'
            }
        );
        expect(formElement).toBeDefined;
        expect(formElement.IsActiveEntity).toEqual(false);
        expect(formElement.HasActiveEntity).toEqual(false);
        expect(formElement.HasDraftEntity).toEqual(false);

        expect(formElement.ID).toEqual(2);
        let subElement = await dataAccess.createData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=2,IsActiveEntity=false)/_Elements', tenantId: 'other' },
                dataAccess
            ),
            {
                Name: 'Child'
            }
        );
        expect(subElement).toBeDefined;
        const otherElement = await dataAccess.createData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=2,IsActiveEntity=false)/_OtherChild', tenantId: 'other' },
                dataAccess
            ),
            {
                Name: 'OtherChild'
            }
        );
        subElement = await dataAccess.createData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot(ID=2,IsActiveEntity=false)/_OtherChild(ID=1,IsActiveEntity=false)/SpecialOne',
                    tenantId: 'other'
                },
                dataAccess
            ),
            {
                Name: 'My Favorite'
            }
        );
        // Activate it
        let actionResult = await dataAccess.performAction(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot(ID=2,IsActiveEntity=false)/sap.fe.core.Form.draftActivate',
                    tenantId: 'other'
                },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;
        expect(actionResult.DraftAdministrativeData).toBeNull();
        let formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot', tenantId: 'other' }, dataAccess)
        );
        expect(formData.length).toEqual(2);

        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$expand=_Elements,_OtherChild', tenantId: 'other' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(2);
        expect(formData[1]._Elements.length).toEqual(1);
        expect(formData[1]._OtherChild.length).toEqual(1);
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot(ID=2,IsActiveEntity=true)/sap.fe.core.Form.draftEdit',
                    tenantId: 'other'
                },
                dataAccess
            )
        );
        subElement = await dataAccess.updateData(
            new ODataRequest(
                { method: 'PATCH', url: '/SubElements(ID=1,IsActiveEntity=false)', tenantId: 'other' },
                dataAccess
            ),
            {
                Name: 'Child2'
            }
        );
        subElement = await dataAccess.updateData(
            new ODataRequest(
                { method: 'PATCH', url: '/OtherElements(ID=1,IsActiveEntity=false)', tenantId: 'other' },
                dataAccess
            ),
            {
                Name: 'OtherChild2'
            }
        );
        subElement = await dataAccess.updateData(
            new ODataRequest(
                { method: 'PATCH', url: '/OtherElements(ID=1,IsActiveEntity=false)/SpecialOne', tenantId: 'other' },
                dataAccess
            ),
            {
                Name: 'Not My Favorite anymore'
            }
        );

        actionResult = await dataAccess.performAction(
            new ODataRequest(
                {
                    method: 'GET',
                    url: '/FormRoot(ID=2,IsActiveEntity=false)/sap.fe.core.Form.draftActivate',
                    tenantId: 'other'
                },
                dataAccess
            )
        );
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$expand=_Elements,_OtherChild', tenantId: 'other' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(2);
        expect(formData[1]._Elements.length).toEqual(1);
        expect(formData[1]._OtherChild.length).toEqual(1);
    });

    test('v4metadata - generator', async () => {
        let part3Data = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Part3' }, dataAccess));
        expect(part3Data.length).toEqual(150);
        // Create Empty Element
        const formElement = await dataAccess.createData(
            new ODataRequest({ method: 'GET', url: '/Part3' }, dataAccess),
            {
                number: 4
            }
        );
        expect(formElement).toBeDefined;
        expect(formElement.number).toEqual(4);

        part3Data = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Part3' }, dataAccess));
        expect(part3Data.length).toEqual(151);
        // Activate it
        let actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/Part3(ID=151,IsActiveEntity=false)/sap.fe.core.Form.draftActivate' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;
        part3Data = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Part3' }, dataAccess));
        expect(part3Data.length).toEqual(151);

        const part3Update = await dataAccess.updateData(
            new ODataRequest({ method: 'GET', url: '/Part3(ID=151,IsActiveEntity=true)' }, dataAccess),
            {
                number: 7
            }
        );
        expect(part3Update.number).toEqual(700);
        // try {
        //     actionResult = await dataAccess.performAction(
        //         new ODataRequest({method:'GET', url: '/Part3(ID=1,IsActiveEntity=false)/sap.fe.core.Form.boundAction1'}, dataAccess)
        //     );
        //     expect(actionResult).toBeDefined;
        // } catch (e) {
        //     expect(e).toMatchSnapshot();
        // }

        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/Part3(ID=151,IsActiveEntity=true)/sap.fe.core.Form.boundAction1' },
                dataAccess
            )
        );
        expect(actionResult).toBeDefined;
    });

    test('v4, Update non-existing', async () => {
        expect.assertions(1);
        try {
            await dataAccess.updateData(
                new ODataRequest(
                    {
                        method: 'POST',
                        url: "/Countries('NA')",
                        body: { Name: 'Utopia' }
                    },
                    dataAccess
                ),

                { Name: 'Utopia' }
            );
        } catch (e) {
            expect(e).toMatchInlineSnapshot(`[Error: Not found]`);
        }
    });

    test('v4 metadata with sticky, POST', async () => {
        // Create Empty Element
        let request = new ODataRequest(
            { method: 'POST', url: '/SalesOrderManage', body: { SalesOrder: 'Bob' } },
            stickyDataAccess
        );
        const sdObject = await stickyDataAccess.createData(request, { SalesOrder: 'Bob' });
        expect(sdObject).toBeDefined;
        expect(sdObject.SalesOrder).toEqual('Bob');

        request = new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess);
        let result = await stickyDataAccess.getData(request);
        expect(result.length).toEqual(1);

        // Create It - Test with an alias, even though it's not the recommendation :)
        request = new ODataRequest(
            {
                method: 'POST',
                url: '/SalesOrderManage/SAP__self.CreateWithSalesOrderType'
            },
            stickyDataAccess
        );
        result = await stickyDataAccess.performAction(request, {
            SalesOrderType: 'OR'
        });
        expect(result.SalesOrderType).toEqual('OR');
        expect(request.globalResponseHeaders['sap-contextid']).toBeDefined();

        // On normal request new data should not be there
        result = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess)
        );
        expect(result.length).toEqual(1);

        request = new ODataRequest(
            {
                method: 'GET',
                url: "/SalesOrderManage('')",
                headers: { 'sap-contextid': request.globalResponseHeaders['sap-contextid'] }
            },
            dataAccess
        );
        result = await stickyDataAccess.getData(request);
        expect(result.SalesOrderType).toEqual('OR');
        expect(request.globalResponseHeaders['sap-contextid']).toBeDefined();

        // Discard it
        request = new ODataRequest(
            {
                method: 'GET',
                url: '/DiscardChanges',
                headers: { 'sap-contextid': request.globalResponseHeaders['sap-contextid'] }
            },
            dataAccess
        );
        result = await stickyDataAccess.performAction(request);
        expect(result).toBeUndefined(); // sticky "discard" returns nothing
        expect(request.globalResponseHeaders['sap-contextid']).toBeUndefined();

        result = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SalesOrderManage('')" }, dataAccess)
        );
        expect(result).toBe(null);

        // Create it again
        request = new ODataRequest(
            {
                url: '/SalesOrderManage/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.CreateWithSalesOrderType',
                method: 'POST'
            },
            stickyDataAccess
        );
        result = await stickyDataAccess.performAction(request, { SalesOrderType: 'OR' });
        expect(result.SalesOrder).toEqual('');
        expect(result.SalesOrderType).toEqual('OR');
        expect(request.globalResponseHeaders['sap-contextid']).toBeDefined();

        // update some property
        request = new ODataRequest(
            {
                url: "/SalesOrderManage('')",
                method: 'POST',
                headers: { 'sap-contextid': request.globalResponseHeaders['sap-contextid'] }
            },
            stickyDataAccess
        );
        result = await stickyDataAccess.updateData(request, { PurchaseOrderByCustomer: 'My Information' });
        expect(result.PurchaseOrderByCustomer).toEqual('My Information');
        expect(request.globalResponseHeaders['sap-contextid']).toBeDefined();

        // Activate it
        request = new ODataRequest(
            {
                url: "/SalesOrderManage('')/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.SaveChanges",
                method: 'POST',
                headers: { 'sap-contextid': request.globalResponseHeaders['sap-contextid'] }
            },
            stickyDataAccess
        );
        result = await stickyDataAccess.performAction(request);
        expect(request.globalResponseHeaders['sap-contextid']).toBeUndefined();

        // result = await stickyDataAccess.getData(
        //     new ODataRequest({ method: 'GET', url: "/SalesOrderManage('SalesOrde1')" }, dataAccess)
        // );
        // expect(result).toBe(null);

        result = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess)
        );
        expect(result.length).toEqual(2);

        // Edit it now
        const id = result[1].SalesOrder;
        request = new ODataRequest(
            {
                url: `/SalesOrderManage('${id}')/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.PrepareForEdit`,
                method: 'POST'
            },
            stickyDataAccess
        );
        result = await stickyDataAccess.performAction(request);

        result = await stickyDataAccess.getData(
            new ODataRequest(
                {
                    method: 'GET',
                    url: "/SalesOrderManage('')",
                    headers: { 'sap-contextid': request.globalResponseHeaders['sap-contextid'] }
                },
                dataAccess
            )
        );
        expect(result.SalesOrder).toBe(id);
    });

    test('Can be reloaded', async () => {
        let odataRequest = new ODataRequest({ method: 'GET', url: '/Countries?$skip=0&$top=3' }, dataAccess);
        let countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(7);
        expect(countryData[0].Country_Code).toEqual('DE');
        expect(countryData[0].PeopleCount).toEqual(70);

        const baseDir = join(__dirname, 'services', 'formSample');
        const cdsContent = readFileSync(join(baseDir, 'FormTemplate2.cds'), 'utf8');
        const edmx = await metadataProvider.loadMetadata(join(baseDir, 'FormTemplate2.cds'));
        metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
        dataAccess.reloadData(metadata);

        // JSON mockData
        odataRequest = new ODataRequest({ method: 'GET', url: '/Countries2?$skip=0&$top=3' }, dataAccess);
        countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(6);
        expect(countryData[0].Country_Code).toEqual('DE');
        expect(countryData[0].PeopleCount).toEqual(700);

        // MockData function based + no getInitialDataSet -> fallback to JSON
        odataRequest = new ODataRequest({ method: 'GET', url: '/Countries3?$skip=0&$top=3' }, dataAccess);
        countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(6);
        expect(countryData[0].Country_Code).toEqual('DE');
        expect(countryData[0].PeopleCount).toEqual(777);

        // MockData function based + no getInitialDataset + No JSON -> Generate Data
        odataRequest = new ODataRequest({ method: 'GET', url: '/Countries4?$skip=0&$top=3' }, dataAccess);
        countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(150);
    });
    describe('$expand depending on target key property name', () => {
        let dataAccess!: DataAccess;
        let metadata!: ODataMetadata;
        const baseUrl = '/TestService';
        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', 'referentialConstraint');

            const edmx = await metadataProvider.loadMetadata(join(baseDir, '/service.cds'));
            metadata = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');
            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;
            dataAccess = new DataAccess(
                { mockdataPath: baseDir } as ServiceConfig,
                metadata,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });
        test('1:1 - key property names are equal', async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('1')?$expand=_sameId` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });
        test('1:* - key property names are equal', async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('1')?$expand=_sameIdMany` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });
        test('1:1 - key property names are different', async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('1')?$expand=_differentId` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });
        test('1:* - key property names are different', async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('1')?$expand=_differentIdMany` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });
    });

    describe('$select handling with structured complex types', () => {
        let dataAccess!: DataAccess;
        let metadata!: ODataMetadata;

        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', 'complexType');
            const edmx = readFileSync(join(baseDir, 'metadata.xml'), 'utf8');

            metadata = await ODataMetadata.parse(edmx, `/TestService/$metadata`);
            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;
            dataAccess = new DataAccess(
                { mockdataPath: baseDir } as ServiceConfig,
                metadata,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });

        test(`can read /A`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A with order by on the complex type`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A?$orderby=complex/value1 desc` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('A1')` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A?$expand=b`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A?$expand=b` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')?$expand=b`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('A1')?$expand=b` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')/b`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('A1')/b` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A?$select=complex`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A?$select=complex` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A?$select=complex/value1`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A?$select=complex/value1` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')?$select=complex`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('A1')?$select=complex` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')?$select=complex/value1`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')?$select=complex/value1` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A?$expand=b($select=complex)`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A?$expand=b($select=complex)` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A?$expand=b($select=complex/value1)`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A?$expand=b($select=complex/value1)` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')?$expand=b($select=complex)`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')?$expand=b($select=complex)` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')?$expand=b($select=complex/value1)`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')?$expand=b($select=complex/value1)` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')/b?$select=complex`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A('A1')/b?$select=complex` }, dataAccess);
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')/b?$select=complex/value1`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')/b?$select=complex/value1` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')/b('B1')?$select=complex`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')/b('B1')?$select=complex` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });

        test(`can read /A('A1')/b('B1')?$select=complex/value1`, async () => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/A('A1')/b('B1')?$select=complex/value1` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toMatchSnapshot();
        });
    });

    describe('$search and $filter if an Edm.String property is not of type string in the mock data', () => {
        let dataAccess!: DataAccess;

        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', 'wrongDataType');

            const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
            const metadata = await ODataMetadata.parse(edmx, '/TestService/$metadata');
            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;
            dataAccess = new DataAccess(
                { mockdataPath: baseDir } as ServiceConfig,
                metadata,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });

        test('$search', async () => {
            let odataRequest = new ODataRequest({ method: 'GET', url: `/A?$search="2"` }, dataAccess);
            let data = await dataAccess.getData(odataRequest);
            expect(data).toMatchInlineSnapshot(`
                [
                  {
                    "ID": "correct type",
                    "stringProperty": "123",
                  },
                  {
                    "ID": "integer instead of string",
                    "stringProperty": 123,
                  },
                ]
            `);

            odataRequest = new ODataRequest({ method: 'GET', url: `/A?$search="tru"` }, dataAccess);
            data = await dataAccess.getData(odataRequest);
            expect(data).toMatchInlineSnapshot(`
                [
                  {
                    "ID": "boolean instead of string",
                    "stringProperty": true,
                  },
                ]
            `);
        });

        test('$filter', async () => {
            let odataRequest = new ODataRequest(
                { method: 'GET', url: `/A?$filter=stringProperty eq "123"` },
                dataAccess
            );
            let data = await dataAccess.getData(odataRequest);
            expect(data).toMatchInlineSnapshot(`
                [
                  {
                    "ID": "correct type",
                    "stringProperty": "123",
                  },
                  {
                    "ID": "integer instead of string",
                    "stringProperty": 123,
                  },
                ]
            `);

            odataRequest = new ODataRequest({ method: 'GET', url: `/A?$filter=stringProperty eq "true"` }, dataAccess);
            data = await dataAccess.getData(odataRequest);
            expect(data).toMatchInlineSnapshot(`
                [
                  {
                    "ID": "boolean instead of string",
                    "stringProperty": true,
                  },
                ]
            `);
        });
    });

    describe('navigation', () => {
        let dataAccess!: DataAccess;

        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', 'navigation');

            // The CDS compiler does not create proper referential constraints if a draft is involved. Therefore, load
            // the (manually adjusted) metadata.xml file here instead of compiling it from CDS sources on the fly.
            // const edmx = await metadataProvider.loadMetadata(join(baseDir, 'service.cds'));
            const edmx = readFileSync(join(baseDir, 'metadata.xml'), 'utf8');
            const metadata = await ODataMetadata.parse(edmx, '/TestService/$metadata');
            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;
            dataAccess = new DataAccess(
                { mockdataPath: baseDir } as ServiceConfig,
                metadata,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });

        const expectedDraftNode = {
            ID: 'DraftNode1',
            _up_ID: 'A1',
            IsActiveEntity: true,
            HasActiveEntity: false,
            HasDraftEntity: false
        };
        const expectedOtherEntity = {
            ID: 'OtherEntity1',
            _up_ID: 'A1'
        };

        const tests: { label: string; navProp: string; expected: any }[] = [
            {
                label: '1:1 draft root to draft node (with referential constraint)',
                navProp: '_toDraftNode',
                expected: expectedDraftNode
            },
            {
                label: '1:1 draft root to draft node (with incomplete referential constraint- IsActiveEntity missing)',
                navProp: '_toDraftNodeIncompleteConstraint',
                expected: expectedDraftNode
            },
            {
                label: '1:1 draft root to draft node (without referential constraint)',
                navProp: '_toDraftNodeNoConstraint',
                expected: expectedDraftNode
            },
            {
                label: '1:n draft root to draft node (with referential constraint)',
                navProp: '_toDraftNodes',
                expected: [expectedDraftNode]
            },
            {
                label: '1:n draft root to draft node (with incomplete referential constraint - IsActiveEntity missing)',
                navProp: '_toDraftNodesIncompleteConstraint',
                expected: [expectedDraftNode]
            },
            {
                label: '1:n draft root to draft node (without referential constraint)',
                navProp: '_toDraftNodesNoConstraint',
                expected: [expectedDraftNode]
            },
            {
                label: '1:1 entity to non-draft entity (with referential constraint)',
                navProp: '_toOther',
                expected: expectedOtherEntity
            },
            {
                label: '1:1 entity to non-draft entity (without referential constraint)',
                navProp: '_toOtherNoConstraint',
                expected: expectedOtherEntity
            },
            {
                label: '1:n entity to non-draft entity (with referential constraint)',
                navProp: '_toOthers',
                expected: [expectedOtherEntity]
            },
            {
                label: '1:n entity to non-draft entity (without referential constraint)',
                navProp: '_toOthersNoConstraint',
                expected: [expectedOtherEntity]
            }
        ];

        test.each(tests)('$label', async ({ label, navProp, expected }) => {
            const odataRequest = new ODataRequest(
                { method: 'GET', url: `/DraftRoot(ID='A1',IsActiveEntity=true)/${navProp}` },
                dataAccess
            );
            const data = await dataAccess.getData(odataRequest);
            expect(data).toEqual(expected);
        });
    });

    describe('allowInlineNull configuration', () => {
        let metadataWithNullNavProp!: ODataMetadata;
        let dataAccessWithAllowInlineNull!: DataAccess;
        let dataAccessWithoutAllowInlineNull!: DataAccess;
        const baseUrl = 'http://localhost:8080/sap/fe/preview/TestService';

        beforeAll(async () => {
            const baseDir = join(__dirname, 'services', 'formSample');
            const edmx = await metadataProvider.loadMetadata(join(baseDir, '/FormTemplate.cds'));
            metadataWithNullNavProp = await ODataMetadata.parse(edmx, baseUrl + '/$metadata');

            const serviceRegistry = {
                getService: jest.fn(),
                registerService: jest.fn(),
                getServicesWithAliases: jest.fn()
            } as any;

            // DataAccess with allowInlineNull enabled
            dataAccessWithAllowInlineNull = new DataAccess(
                { mockdataPath: baseDir, allowInlineNull: true } as ServiceConfig,
                metadataWithNullNavProp,
                fileLoader,
                undefined,
                serviceRegistry
            );

            // DataAccess with allowInlineNull disabled (default behavior)
            dataAccessWithoutAllowInlineNull = new DataAccess(
                { mockdataPath: baseDir, allowInlineNull: false } as ServiceConfig,
                metadataWithNullNavProp,
                fileLoader,
                undefined,
                serviceRegistry
            );
        });

        test('with allowInlineNull=true, null navigation properties are preserved and not expanded', async () => {
            // Create mock data with a null navigation property
            const mockEntitySet = await dataAccessWithAllowInlineNull.getMockEntitySet('FormRoot');
            const mockData = mockEntitySet.getMockData('tenant-default');
            const odataRequest = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=999,IsActiveEntity=true)?$expand=SpecialOne' },
                dataAccessWithAllowInlineNull
            );
            // Add test data with null navigation property
            await mockData.addEntry(
                {
                    ID: 999,
                    FirstName: 'Test',
                    LastName: 'User',
                    SpecialOne: null, // Explicitly set to null
                    IsActiveEntity: true
                },
                odataRequest
            );

            const data = await dataAccessWithAllowInlineNull.getData(odataRequest);

            // With allowInlineNull=true, null should be preserved
            expect(data.SpecialOne).toBe(null);
        });

        test('with allowInlineNull=false, null navigation properties are expanded', async () => {
            // Create mock data with a null navigation property
            const mockEntitySet = await dataAccessWithoutAllowInlineNull.getMockEntitySet('FormRoot');
            const mockData = mockEntitySet.getMockData('tenant-default');
            const odataRequest = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=998,IsActiveEntity=true)?$expand=SpecialOne' },
                dataAccessWithoutAllowInlineNull
            );
            // Add test data with null navigation property
            await mockData.addEntry(
                {
                    ID: 998,
                    FirstName: 'Test',
                    LastName: 'User2',
                    SpecialOne: null, // Explicitly set to null
                    IsActiveEntity: true
                },
                odataRequest
            );

            const data = await dataAccessWithoutAllowInlineNull.getData(odataRequest);

            // With allowInlineNull=false, null values should trigger expansion
            // The expanded value depends on the navigation property configuration
            expect(data.SpecialOne).toBeDefined();
        });

        test('with allowInlineNull=true, undefined navigation properties are still expanded', async () => {
            // Create mock data without the navigation property (undefined)
            const mockEntitySet = await dataAccessWithAllowInlineNull.getMockEntitySet('FormRoot');
            const mockData = mockEntitySet.getMockData('tenant-default');
            const odataRequest = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=997,IsActiveEntity=true)?$expand=SpecialOne' },
                dataAccessWithAllowInlineNull
            );
            // Add test data without navigation property (undefined)
            await mockData.addEntry(
                {
                    ID: 997,
                    FirstName: 'Test',
                    LastName: 'User3',
                    // SpecialOne is undefined (not set)
                    IsActiveEntity: true
                },
                odataRequest
            );

            const data = await dataAccessWithAllowInlineNull.getData(odataRequest);

            // With allowInlineNull=true, undefined values should still trigger expansion
            expect(data.SpecialOne).toBeDefined();
        });

        test('with allowInlineNull=true, collection navigation properties with null are preserved', async () => {
            const mockEntitySet = await dataAccessWithAllowInlineNull.getMockEntitySet('FormRoot');
            const mockData = mockEntitySet.getMockData('tenant-default');
            const odataRequest = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=996,IsActiveEntity=true)?$expand=_Elements' },
                dataAccessWithAllowInlineNull
            );
            // Add test data with null collection navigation property
            await mockData.addEntry(
                {
                    ID: 996,
                    FirstName: 'Test',
                    LastName: 'User4',
                    _Elements: null, // Explicitly set to null
                    IsActiveEntity: true
                },
                odataRequest
            );

            const data = await dataAccessWithAllowInlineNull.getData(odataRequest);

            // With allowInlineNull=true, null should be preserved for collections too
            expect(data._Elements).toBe(null);
        });

        test('with allowInlineNull=false, both null and undefined are treated the same', async () => {
            const mockEntitySet = await dataAccessWithoutAllowInlineNull.getMockEntitySet('FormRoot');
            const mockData = mockEntitySet.getMockData('tenant-default');
            const odataRequestNull = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=995,IsActiveEntity=true)?$expand=SpecialOne' },
                dataAccessWithoutAllowInlineNull
            );
            // Add test data with null navigation property
            await mockData.addEntry(
                {
                    ID: 995,
                    FirstName: 'Test',
                    LastName: 'User5',
                    SpecialOne: null,
                    IsActiveEntity: true
                },
                odataRequestNull
            );

            // Add test data without navigation property (undefined)
            await mockData.addEntry(
                {
                    ID: 994,
                    FirstName: 'Test',
                    LastName: 'User6',
                    IsActiveEntity: true
                },
                odataRequestNull
            );

            const dataNullValue = await dataAccessWithoutAllowInlineNull.getData(odataRequestNull);

            const odataRequestUndefined = new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=994,IsActiveEntity=true)?$expand=SpecialOne' },
                dataAccessWithoutAllowInlineNull
            );
            const dataUndefinedValue = await dataAccessWithoutAllowInlineNull.getData(odataRequestUndefined);

            // Both should be expanded
            expect(dataNullValue.SpecialOne).toBeDefined();
            expect(dataUndefinedValue.SpecialOne).toBeDefined();
        });
    });

    describe('DraftAdministrativeData inline handling', () => {
        test('DraftAdministrativeData should always be defined inline and never fetched from target entity set', async () => {
            // Create a new draft entity to test with
            const newDraft = await dataAccess.createData(
                new ODataRequest({ method: 'POST', url: '/FormRoot' }, dataAccess),
                {
                    FirstName: 'TestUser',
                    LastName: 'ForDraftAdminData'
                }
            );
            expect(newDraft).toBeDefined();
            expect(newDraft.IsActiveEntity).toEqual(false);
            const draftId = newDraft.ID;

            // Get the draft with DraftAdministrativeData expanded
            const formData = await dataAccess.getData(
                new ODataRequest(
                    {
                        method: 'GET',
                        url: `/FormRoot(ID=${draftId},IsActiveEntity=false)?$expand=DraftAdministrativeData`
                    },
                    dataAccess
                )
            );

            expect(formData).not.toBeNull();
            expect(formData.DraftAdministrativeData).toBeDefined();
            expect(formData.DraftAdministrativeData).not.toBeNull();

            // Verify that DraftAdministrativeData is an inline object (not a reference)
            expect(typeof formData.DraftAdministrativeData).toBe('object');
            expect(formData.DraftAdministrativeData.LastChangeDateTime).toBeDefined();
        });

        test('DraftAdministrativeData should be included with $select=* even without explicit $expand', async () => {
            // Find any existing draft entity
            const drafts = await dataAccess.getData(
                new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false&$top=1' }, dataAccess)
            );

            expect(drafts.length).toBeGreaterThan(0);
            const draftId = drafts[0].ID;

            // Get draft data with $select=*
            const formData = await dataAccess.getData(
                new ODataRequest(
                    { method: 'GET', url: `/FormRoot(ID=${draftId},IsActiveEntity=false)?$select=*` },
                    dataAccess
                )
            );

            expect(formData).not.toBeNull();
            // DraftAdministrativeData should be present even without explicit expand when using $select=*
            expect(formData.DraftAdministrativeData).toBeDefined();
        });

        test('DraftAdministrativeData for active entity should be null', async () => {
            // Find any active entity
            const activeEntities = await dataAccess.getData(
                new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$top=1' }, dataAccess)
            );

            expect(activeEntities.length).toBeGreaterThan(0);
            const activeId = activeEntities[0].ID;

            const formData = await dataAccess.getData(
                new ODataRequest(
                    {
                        method: 'GET',
                        url: `/FormRoot(ID=${activeId},IsActiveEntity=true)?$expand=DraftAdministrativeData`
                    },
                    dataAccess
                )
            );

            expect(formData).not.toBeNull();
            // Active entities should have null DraftAdministrativeData
            expect(formData.DraftAdministrativeData).toBeNull();
        });
    });
});
