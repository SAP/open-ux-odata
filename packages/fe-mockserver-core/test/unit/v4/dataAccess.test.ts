import { readFileSync } from 'fs';
import { join } from 'path';
import { ODataMetadata } from '../../../src/data/metadata';
import { DataAccess } from '../../../src/data/dataAccess';
import ODataRequest from '../../../src/request/odataRequest';
import CDSMetadataProvider from '@sap-ux/fe-mockserver-plugin-cds';
import FileSystemLoader from '../../../src/plugins/fileSystemLoader';
import type { ServiceConfig } from '../../../src';

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
        dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        stickyDataAccess = new DataAccess({ mockdataPath: baseStickyDir } as ServiceConfig, stickyMetadata, fileLoader);
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
        expect(countryData.length).toEqual(6);
        expect(odataRequest.dataCount).toEqual(6);
        odataRequest = new ODataRequest(
            {
                url: '/Countries?$skip=0&$top=3',
                method: 'GET'
            },
            dataAccess
        );
        countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(6);
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
        expect(countryData.length).toEqual(1);
        expect(countryData[0].Country_Code).toEqual('DE');

        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=contains(tolower(Country_Code), 'DE')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(0);

        countryData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: "/Countries?$filter=contains(tolower(Country_Code), 'de')" },
                dataAccess
            )
        );
        expect(countryData.length).toEqual(1);
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
                { method: 'GET', url: "/Countries?$filter=tolower(Country_Code) eq tolower('dE')" },
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
        expect(countryData.length).toEqual(6);
        expect(countryData[0].Country_Code).toEqual('LV');
        expect(countryData[1].Country_Code).toEqual('IR');
        expect(countryData[2].Country_Code).toEqual('FR');
        expect(countryData[3].Country_Code).toEqual('DE');
        expect(countryData[4].Country_Code).toEqual('US');
        expect(countryData[5].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCount,Country_Code desc' }, dataAccess)
        );
        expect(countryData.length).toEqual(6);
        expect(countryData[0].Country_Code).toEqual('LV');
        expect(countryData[1].Country_Code).toEqual('IR');
        expect(countryData[2].Country_Code).toEqual('FR');
        expect(countryData[3].Country_Code).toEqual('US');
        expect(countryData[4].Country_Code).toEqual('DE');
        expect(countryData[5].Country_Code).toEqual('IN');
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$orderby=PeopleCount desc,Country_Code' }, dataAccess)
        );
        expect(countryData.length).toEqual(6);
        expect(countryData[5].Country_Code).toEqual('LV');
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
    test('v4metadata - it can POST data for an entity', async () => {
        let countryData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/Countries' }, dataAccess));
        expect(countryData.length).toEqual(6);
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
        expect(countryData.length).toEqual(1);
        // LE
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount le 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(2);
        // EQ
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount eq 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(1);
        // NE
        countryData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/Countries?$filter=PeopleCount ne 3' }, dataAccess)
        );
        expect(countryData.length).toEqual(5);
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
        expect(countryData.length).toEqual(3);
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
        expect(formElement.ID).toEqual(1);

        let formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(1);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(0);
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
        //expect(actionResult.DraftAdministrativeData).toBeNull();
        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(1);
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=DraftAdministrativeData' },
                dataAccess
            )
        );
        expect(formData[0].DraftAdministrativeData).toBeNull();
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Bob');
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
        expect(formData.length).toEqual(2);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Bob');
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false' }, dataAccess)
        );
        expect(formData.length).toEqual(1);

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
        expect(formData.length).toEqual(1);
        expect(formData[0]._Elements.length).toEqual(0);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Bob');
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
        expect(formData.length).toEqual(2);
        formData = await dataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true' }, dataAccess)
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Bob');
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
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Bob');

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
                Name: 'SecondChild',
                sibling_ID: 1
            }
        );
        expect(subElement).toBeDefined;
        expect(subElement.IsActiveEntity).toEqual(false);
        expect(subElement.HasActiveEntity).toEqual(false);
        expect(subElement.Name).toEqual('SecondChild');

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
                "owner_ID": 0,
                "sibling_ID": 0,
              },
            }
        `);

        formData = await dataAccess.getData(new ODataRequest({ method: 'GET', url: '/FormRoot' }, dataAccess));
        expect(formData.length).toEqual(1);
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq true&$expand=_Elements,SpecialOne' },
                dataAccess
            )
        );
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        expect(formData[0]._Elements.length).toEqual(2);
        expect(formData[0]._Elements[0].Name).toEqual('OtherChild2');
        expect(formData[0]._Elements[1].Name).toEqual('SecondChild');
        expect(formData[0].SpecialOne.Name).toEqual('My Favorite');
        expect(formData[0].SpecialOne.IsActiveEntity).toEqual(true);
        expect(formData[0].SpecialOne.HasDraftEntity).toEqual(false);
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
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        expect(formData[0]._Elements.length).toEqual(2);
        expect(formData[0]._Elements[0].Name).toEqual('OtherChild2');
        expect(formData[0]._Elements[1].Name).toEqual('SecondChild');
        // Edit it
        actionResult = await dataAccess.performAction(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot(ID=1,IsActiveEntity=true)/sap.fe.core.Form.draftEdit' },
                dataAccess
            )
        );
        // Delete one child
        actionResult = await dataAccess.deleteData(
            new ODataRequest({ method: 'DELETE', url: '/SubElements(ID=2,IsActiveEntity=false)' }, dataAccess)
        );
        formData = await dataAccess.getData(
            new ODataRequest(
                { method: 'GET', url: '/FormRoot?$filter=IsActiveEntity eq false&$expand=_Elements' },
                dataAccess
            )
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
        expect(formData.length).toEqual(1);
        expect(formData[0].FirstName).toEqual('Mark');
        expect(formData[0]._Elements.length).toEqual(1);
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
    test('v4 metadata with sticky, POST', async () => {
        // Create Empty Element
        const sdObject = await stickyDataAccess.createData(
            new ODataRequest(
                { method: '/POST', url: '/SalesOrderManage', body: { SalesOrder: 'Bob' } },
                stickyDataAccess
            ),
            { SalesOrder: 'Bob' }
        );
        expect(sdObject).toBeDefined;
        expect(sdObject.SalesOrder).toEqual('Bob');

        let sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess)
        );
        expect(sdData.length).toEqual(1);
        // Create It
        const request = new ODataRequest(
            {
                method: '/POST',
                url: '/SalesOrderManage/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.CreateWithSalesOrderType'
            },
            stickyDataAccess
        );
        let actionResult = await stickyDataAccess.performAction(request, {
            SalesOrderType: 'OR'
        });
        expect(actionResult.SalesOrderType).toEqual('OR');
        expect(request.responseHeaders['sap-contextid']).toBeDefined();
        //const contextID = request.headers['/Sap-contextid'];
        // On normal request new data should not be there
        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess)
        );
        expect(sdData.length).toEqual(1);

        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SalesOrderManage('')" }, dataAccess)
        );
        expect(sdData.SalesOrderType).toEqual('OR');

        // Discard it

        actionResult = await stickyDataAccess.performAction(
            new ODataRequest({ method: 'GET', url: '/DiscardChanges' }, dataAccess)
        );
        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SalesOrderManage('')" }, dataAccess)
        );
        expect(sdData).toBe(null);

        // Create it again
        actionResult = await stickyDataAccess.performAction(
            new ODataRequest(
                {
                    url: '/SalesOrderManage/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.CreateWithSalesOrderType',
                    method: '/POST'
                },
                stickyDataAccess
            ),
            {
                SalesOrderType: 'OR'
            }
        );
        expect(actionResult.SalesOrderType).toEqual('OR');
        expect(request.responseHeaders['sap-contextid']).toBeDefined();
        // Activate it
        actionResult = await stickyDataAccess.performAction(
            new ODataRequest(
                {
                    url: '/SalesOrderManage/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.SaveChanges',
                    method: '/POST'
                },
                stickyDataAccess
            )
        );
        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SalesOrderManage('')" }, dataAccess)
        );
        expect(sdData).toBe(null);
        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: '/SalesOrderManage' }, dataAccess)
        );
        expect(sdData.length).toEqual(2);
        // Edit it now
        const id = sdData[1].SalesOrder;
        actionResult = await stickyDataAccess.performAction(
            new ODataRequest(
                {
                    url: `/SalesOrderManage('${id}')/com.sap.gateway.srvd.c_salesordermanage_sd.v0001.PrepareForEdit`,
                    method: '/POST'
                },
                stickyDataAccess
            )
        );
        sdData = await stickyDataAccess.getData(
            new ODataRequest({ method: 'GET', url: "/SalesOrderManage('')" }, dataAccess)
        );
        expect(sdData.SalesOrder).toBe(id);
    });
    test('Can be reloaded', async () => {
        let odataRequest = new ODataRequest({ method: 'GET', url: '/Countries?$skip=0&$top=3' }, dataAccess);
        let countryData = await dataAccess.getData(odataRequest);
        expect(countryData.length).toEqual(3);
        expect(odataRequest.dataCount).toEqual(6);
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
            dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
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
            dataAccess = new DataAccess({ mockdataPath: baseDir } as ServiceConfig, metadata, fileLoader);
        });

        test(`can read /A`, async () => {
            const odataRequest = new ODataRequest({ method: 'GET', url: `/A` }, dataAccess);
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
});
