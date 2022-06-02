import { parseFilter } from '../../../src/request/filterParser';

describe('Filter Parser', () => {
    test('can parse basic filtering', async () => {
        const basicEquals = parseFilter("Country_Code eq 'FR'");
        expect(basicEquals?.expressions[0].identifier).toBe('Country_Code');
        expect(basicEquals?.expressions[0].operator).toBe('eq');
        expect(basicEquals?.expressions[0].literal).toBe("'FR'");

        const basicGEquals = parseFilter('Country_Code ge 3');
        expect(basicGEquals?.expressions[0].identifier).toBe('Country_Code');
        expect(basicGEquals?.expressions[0].operator).toBe('ge');
        expect(basicGEquals?.expressions[0].literal).toBe('3');

        const navProp = parseFilter("Country/Code eq 'FR'");
        expect(navProp?.expressions[0].identifier).toBe('Country/Code');
        expect(navProp?.expressions[0].operator).toBe('eq');
        expect(navProp?.expressions[0].literal).toBe("'FR'");

        const multiNavProp = parseFilter("Country/Code/Toto eq 'FR'");
        expect(multiNavProp?.expressions[0].identifier).toBe('Country/Code/Toto');
        expect(multiNavProp?.expressions[0].operator).toBe('eq');
        expect(multiNavProp?.expressions[0].literal).toBe("'FR'");

        const equalWithSpace = parseFilter("Country_Code eq 'F R'");
        expect(equalWithSpace?.expressions[0].identifier).toBe('Country_Code');
        expect(equalWithSpace?.expressions[0].operator).toBe('eq');
        expect(equalWithSpace?.expressions[0].literal).toBe("'F R'");

        const dateEquals = parseFilter('ReleaseDate gt 2013-05-24');
        expect(dateEquals?.expressions[0].identifier).toBe('ReleaseDate');
        expect(dateEquals?.expressions[0].operator).toBe('gt');
        expect(dateEquals?.expressions[0].literal).toBe('2013-05-24');

        const dateBetween = parseFilter(
            '((SitnInstceCreatedAtDateTime gt 2022-05-15T22:00:00.000Z and SitnInstceCreatedAtDateTime lt 2022-05-16T21:59:59.000Z))'
        );
        expect(dateBetween?.expressions[0].identifier).toBe('SitnInstceCreatedAtDateTime');
        expect(dateBetween?.expressions[0].operator).toBe('gt');
        expect(dateBetween?.expressions[0].literal).toBe('2022-05-15T22:00:00.000Z');
        expect(dateBetween?.expressions[1].identifier).toBe('SitnInstceCreatedAtDateTime');
        expect(dateBetween?.expressions[1].operator).toBe('lt');
        expect(dateBetween?.expressions[1].literal).toBe('2022-05-16T21:59:59.000Z');

        const dateBetweenTZ = parseFilter(
            'DateTime ge 2022-05-16T00:00:00+02:00 and DateTime le 2022-05-22T23:59:59+02:00'
        );
        expect(dateBetweenTZ?.expressions[0].identifier).toBe('DateTime');
        expect(dateBetweenTZ?.expressions[0].operator).toBe('ge');
        expect(dateBetweenTZ?.expressions[0].literal).toBe('2022-05-16T00:00:00+02:00');
        expect(dateBetweenTZ?.expressions[1].identifier).toBe('DateTime');
        expect(dateBetweenTZ?.expressions[1].operator).toBe('le');
        expect(dateBetweenTZ?.expressions[1].literal).toBe('2022-05-22T23:59:59+02:00');

        const dateBetweenTZPlus = parseFilter(
            '(IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null) and DateTime ge 2022-05-23T00:00:00+02:00 and DateTime le 2022-05-29T23:59:59+02:00'
        );
        expect(dateBetweenTZPlus?.expressions[1].identifier).toBe('DateTime');
        expect(dateBetweenTZPlus?.expressions[1].operator).toBe('ge');
        expect(dateBetweenTZPlus?.expressions[1].literal).toBe('2022-05-23T00:00:00+02:00');
        expect(dateBetweenTZPlus?.expressions[2].identifier).toBe('DateTime');
        expect(dateBetweenTZPlus?.expressions[2].operator).toBe('le');
        expect(dateBetweenTZPlus?.expressions[2].literal).toBe('2022-05-29T23:59:59+02:00');

        const parenthesis = parseFilter("(Country_Code eq 'FR')");
        expect(parenthesis?.expressions[0].identifier).toBe('Country_Code');
        expect(parenthesis?.expressions[0].operator).toBe('eq');
        expect(parenthesis?.expressions[0].literal).toBe("'FR'");

        const guidParser = parseFilter(
            'sourceObject_ID eq ee1a9172-f3c3-47ce-b0f7-dd28c740210c or triggerObject_ID eq 837bc2bf-2e4b-4b2c-8c6c-9a9330c62400'
        );
        expect(guidParser?.expressions[0].identifier).toBe('sourceObject_ID');
        expect(guidParser?.expressions[0].operator).toBe('eq');
        expect(guidParser?.expressions[0].literal).toBe('ee1a9172-f3c3-47ce-b0f7-dd28c740210c');
    });

    test('can deal with AND / OR operator', () => {
        const andOrPrecedence = parseFilter("IsHot eq 'Yo' and IsHot eq true or PeopleCount gt 3");
        expect(andOrPrecedence?.operator).toBe('OR');
        expect(andOrPrecedence?.expressions.length).toBe(2);
        expect(andOrPrecedence?.expressions[0].expressions.length).toBe(2);
        expect(andOrPrecedence?.expressions[0].operator).toBe('AND');

        const andOrParenthesis = parseFilter('(IsHot eq false and IsHot eq true) or PeopleCount gt 3');
        expect(andOrParenthesis?.operator).toBe('OR');
        expect(andOrParenthesis?.expressions.length).toBe(2);
        expect(andOrParenthesis?.expressions[0].expressions.length).toBe(2);
        expect(andOrParenthesis?.expressions[0].operator).toBe('AND');

        const andOrParenthesis2 = parseFilter('IsHot eq false and (IsHot eq true or PeopleCount gt 3)');
        expect(andOrParenthesis2?.operator).toBe('AND');
        expect(andOrParenthesis2?.expressions.length).toBe(2);
        expect(andOrParenthesis2?.expressions[1].expressions.length).toBe(2);
        expect(andOrParenthesis2?.expressions[1].operator).toBe('OR');

        const andOrNoParenthesis = parseFilter('PeopleCount gt 3 or IsHot eq true and IsHot eq false');
        expect(andOrNoParenthesis?.operator).toBe('OR');
        expect(andOrNoParenthesis?.expressions.length).toBe(2);
        expect(andOrNoParenthesis?.expressions[1].expressions.length).toBe(2);
        expect(andOrNoParenthesis?.expressions[1].operator).toBe('AND');

        const dualParenthesisGroup = parseFilter(
            '(PeopleCount gt 3 or IsHot eq true) and (IsHot eq false or PeopleCount lt 5)'
        );
        expect(dualParenthesisGroup?.operator).toBe('AND');
        expect(dualParenthesisGroup?.expressions.length).toBe(2);
        expect(dualParenthesisGroup?.expressions[1].expressions.length).toBe(2);
        expect(dualParenthesisGroup?.expressions[1].operator).toBe('OR');
        expect(dualParenthesisGroup?.expressions[0].expressions.length).toBe(2);
        expect(dualParenthesisGroup?.expressions[0].operator).toBe('OR');
    });

    test('can deal with parenthesis', () => {
        const dualParenthesisGroup2 = parseFilter(
            '((PeopleCount gt 3 or IsHot eq true) and (IsHot eq false or PeopleCount lt 5))'
        );
        expect(dualParenthesisGroup2?.operator).toBe('AND');
        expect(dualParenthesisGroup2?.expressions.length).toBe(2);
        expect(dualParenthesisGroup2?.expressions[1].expressions.length).toBe(2);
        expect(dualParenthesisGroup2?.expressions[1].operator).toBe('OR');
        expect(dualParenthesisGroup2?.expressions[0].expressions.length).toBe(2);
        expect(dualParenthesisGroup2?.expressions[0].operator).toBe('OR');

        const dualParenthesisGroup3 = parseFilter(
            '((PeopleCount gt 3 or IsHot eq true) and PeopleCount lt 5) or PeopleCount ne 70'
        );
        expect(dualParenthesisGroup3?.operator).toBe('OR');
        expect(dualParenthesisGroup3?.expressions.length).toBe(2);
        expect(dualParenthesisGroup3?.expressions[0].expressions.length).toBe(2);
        expect(dualParenthesisGroup3?.expressions[0].operator).toBe('AND');
        expect(dualParenthesisGroup3?.expressions[0].expressions[0].expressions.length).toBe(2);
        expect(dualParenthesisGroup3?.expressions[0].expressions[0].operator).toBe('OR');
        expect(dualParenthesisGroup3?.expressions[1].literal).toBe('70');
        expect(dualParenthesisGroup3?.expressions[1].identifier).toBe('PeopleCount');
    });

    test('can deal with function calls', () => {
        // const toLowerCall = parseFilter("tolower(Country_Code) eq 'de'");
        // expect(toLowerCall.expressions[0].identifier.method).toBe('tolower');
        // expect(toLowerCall.expressions[0].identifier.methodArgs[0]).toBe('Country_Code');
        // expect(toLowerCall.expressions[0].operator).toBe('eq');
        // expect(toLowerCall.expressions[0].literal).toBe("'de'");
        //
        // const lengthCall = parseFilter('length(Country_Code) eq 5');
        // expect(lengthCall.expressions[0].identifier.method).toBe('length');
        // expect(lengthCall.expressions[0].identifier.methodArgs[0]).toBe('Country_Code');
        // expect(lengthCall.expressions[0].operator).toBe('eq');
        // expect(lengthCall.expressions[0].literal).toBe('5');
        //
        // const callsOnBothSide = parseFilter("tolower(Country_Code) eq tolower('de')");
        // expect(callsOnBothSide.expressions[0].identifier.method).toBe('tolower');
        // expect(callsOnBothSide.expressions[0].identifier.methodArgs[0]).toBe('Country_Code');
        // expect(callsOnBothSide.expressions[0].operator).toBe('eq');
        // expect(callsOnBothSide.expressions[0].literal.method).toBe('tolower');
        // expect(callsOnBothSide.expressions[0].literal.methodArgs[0]).toBe("'de'");
        //
        // const complexToLowerCall = parseFilter("(tolower(Country/Code) eq 'de' or Country_Code eq 'fr')");
        // expect(complexToLowerCall.expressions.length).toBe(2);
        // expect(complexToLowerCall.expressions[0].identifier.method).toBe('tolower');
        // expect(complexToLowerCall.expressions[0].identifier.methodArgs[0]).toBe('Country/Code');
        // expect(complexToLowerCall.expressions[0].operator).toBe('eq');
        // expect(complexToLowerCall.expressions[0].literal).toBe("'de'");
        // expect(complexToLowerCall.expressions[1].identifier).toBe('Country_Code');
        // expect(complexToLowerCall.expressions[1].operator).toBe('eq');
        // expect(complexToLowerCall.expressions[1].literal).toBe("'fr'");

        const multipleOredCall = parseFilter(
            "contains(externalId,'123') or contains(namespace,'123') or contains(name,'123')"
        );
        expect(multipleOredCall?.expressions.length).toBe(3);
        expect(typeof multipleOredCall?.expressions[0].identifier).toBe('object');
        if (
            typeof multipleOredCall?.expressions[0].identifier === 'object' &&
            multipleOredCall?.expressions[0].identifier?.type === 'method'
        ) {
            expect(multipleOredCall?.expressions[0].identifier?.method).toBe('contains');
            expect(multipleOredCall?.expressions[0].identifier?.methodArgs[0]).toBe('externalId');
            expect(multipleOredCall?.expressions[0].identifier?.methodArgs[1]).toBe("'123'");
        }
    });

    test('can deal with complex function calls', () => {
        const complexFunction = parseFilter("startswith(CompanyName,'Futterkiste')");
        expect(typeof complexFunction?.expressions[0].identifier).toBe('object');
        if (
            typeof complexFunction?.expressions[0].identifier === 'object' &&
            complexFunction?.expressions[0].identifier?.type === 'method'
        ) {
            expect(complexFunction?.expressions[0].identifier?.method).toBe('startswith');
            expect(complexFunction?.expressions[0].identifier?.methodArgs[0]).toBe('CompanyName');
            expect(complexFunction?.expressions[0].identifier?.methodArgs[1]).toBe("'Futterkiste'");
        }

        const complexFunctionWithNavProp = parseFilter("startswith(Company/Name,'Futterkiste')");
        expect(typeof complexFunctionWithNavProp?.expressions[0].identifier).toBe('object');
        if (
            typeof complexFunctionWithNavProp?.expressions[0].identifier === 'object' &&
            complexFunctionWithNavProp?.expressions[0].identifier?.type === 'method'
        ) {
            expect(complexFunctionWithNavProp?.expressions[0]?.identifier.method).toBe('startswith');
            expect(complexFunctionWithNavProp?.expressions[0]?.identifier.methodArgs[0]).toBe('Company/Name');
            expect(complexFunctionWithNavProp?.expressions[0]?.identifier.methodArgs[1]).toBe("'Futterkiste'");
        }

        const complexFunctionEquality = parseFilter("cast(ConfigurationStatus, Edm.String) eq 'COMPLETE'");
        expect(typeof complexFunctionEquality?.expressions[0].identifier).toBe('object');
        if (
            typeof complexFunctionEquality?.expressions[0].identifier === 'object' &&
            complexFunctionEquality?.expressions[0].identifier?.type === 'method'
        ) {
            expect(complexFunctionEquality?.expressions[0].identifier?.method).toBe('cast');
            expect(complexFunctionEquality?.expressions[0].identifier?.methodArgs[0]).toBe('ConfigurationStatus');
            expect(complexFunctionEquality?.expressions[0].identifier?.methodArgs[1]).toBe('Edm.String');
            expect(complexFunctionEquality?.expressions[0].operator).toBe('eq');
            expect(complexFunctionEquality?.expressions[0].literal).toBe("'COMPLETE'");
        }
    });

    test('can deal with lambda', () => {
        const lamba = parseFilter("CountryCodes/any(ent:ent eq 'GBR')");
        expect(typeof lamba?.expressions[0].identifier).toBe('object');
        if (
            typeof lamba?.expressions[0].identifier === 'object' &&
            lamba?.expressions[0].identifier?.type === 'lambda'
        ) {
            expect(lamba?.expressions[0].identifier?.type).toBe('lambda');
            expect(lamba?.expressions[0].identifier?.operator).toBe('ANY');
            expect(lamba?.expressions[0].identifier?.key).toBe('ent');
            expect(lamba?.expressions[0].identifier?.expression.expressions.length).toBe(1);
            expect(lamba?.expressions[0].identifier?.expression.expressions[0].operator).toBe('eq');
            expect(lamba?.expressions[0].identifier?.expression.expressions[0].literal).toBe("'GBR'");
            expect(lamba?.expressions[0].identifier?.expression.expressions[0].identifier).toBe('ent');
            expect(lamba?.expressions[0].identifier?.target).toBe('CountryCodes');
        }

        const notLamba = parseFilter('(allPolicies eq true)');
        expect(notLamba?.expressions[0].operator).toBe('eq');
        expect(notLamba?.expressions[0].identifier).toBe('allPolicies');
        expect(notLamba?.expressions[0].literal).toBe('true');
    });

    test('can deal with empty values', () => {
        const emptyValues = parseFilter(
            "Customer eq '1' and CompanyCode eq '0001' and Currency eq 'EUR' and SalesOrganization eq '1010' and DistributionChannel eq '01' and Division eq '01' and PartnerCounter eq '' and IBAN eq '' and CardNumber eq '2922870' and PaymentCardType eq ''"
        );
        expect(emptyValues).toMatchSnapshot();
    });

    test('it can deal with v2 specific guid', () => {
        const v2Guid = parseFilter('ProdCmplncSrvcReqFailureUUID eq guid%2700000000-0000-0000-0002-000000000000%27');
        expect(v2Guid).toMatchSnapshot();
    });

    test('v2 complex filter', () => {
        const v2ComplexFilter2 = parseFilter(
            "(AdvncdPlngDisplayHorizonDte ge datetime'2021-01-01T00:00:00' and AdvncdPlngDisplayHorizonDte le datetime'2021-12-31T00:00:00')"
        );
        expect(v2ComplexFilter2).toMatchSnapshot();
        const v2ComplexFilter3 = parseFilter(
            "(AdvncdPlngResourceName eq 'AdvncdPlngResourceName 1' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 10' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 2' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 3' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 4' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 5' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 6' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 7' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 8' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 9')"
        );
        expect(v2ComplexFilter3).toMatchSnapshot();
        const v2ComplexFilter4 = parseFilter("SimulationSessionUUID eq guid'd535d9a2-fdea-4e1e-84e6-2c135fcbcd08'");
        expect(v2ComplexFilter4).toMatchSnapshot();
        const v2ComplexFilter = parseFilter(
            '(' +
                "(AdvncdPlngDisplayHorizonDte ge datetime'2021-01-01T00:00:00' and AdvncdPlngDisplayHorizonDte le datetime'2021-12-31T00:00:00') " +
                'and ' +
                "(AdvncdPlngResourceName eq 'AdvncdPlngResourceName 1' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 10' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 2' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 3' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 4' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 5' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 6' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 7' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 8' or AdvncdPlngResourceName eq 'AdvncdPlngResourceName 9') and PlanningVersionExternal eq '000') " +
                "and SimulationSessionUUID eq guid'd535d9a2-fdea-4e1e-84e6-2c135fcbcd08'"
        );
        expect(v2ComplexFilter).toMatchSnapshot();
    });

    test('v4 complex filter', () => {
        const v4ComplexLambda = parseFilter(
            "((_Trigger/any(t:t/_Attribute/any(a0:a0/SitnInstceAttribName eq 'CAMASSRUNDATE' and a0/_AttributeValue/any(a1:a1/SitnInstceAttribValue ge '20220601') and a0/_AttributeValue/any(a1:a1/SitnInstceAttribValue le '20220601'))))) and (SitnBaseTemplateID eq 'FICA_MASSACT_MSG_MONITOR')"
        );
        expect(v4ComplexLambda).toMatchSnapshot();
    });
});
