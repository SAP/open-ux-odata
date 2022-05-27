module.exports = {
    hasCustomAggregate: function (sCustomAggregate) {
        if (sCustomAggregate === 'CreditScore') {
            return true;
        }
        return false;
    },
    performCustomAggregate: function (sCustomAggregate, aDataToAggregate) {
        let sumMulti = 0;
        aDataToAggregate.forEach((value) => {
            sumMulti += value * 5;
        });
        return sumMulti;
    },
    fetchEntries: function (keyValues) {
        const code = keyValues['P_CompanyCode'];
        return [
            {
                P_CompanyCode: code,
                Set: [
                    {
                        Customer: '1',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2919682',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 100
                    },
                    {
                        Customer: '1',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922870',
                        PaymentCardType: '',
                        BusinessPartnerName: 'TEST asdf',
                        CityName: 'Paris',
                        CreditScore: 200,
                        CreditScore2: 200
                    },
                    {
                        Customer: '2',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2915717',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 150,
                        CreditScore2: 150
                    },
                    {
                        Customer: '2',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2916499',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 400,
                        CreditScore2: 400
                    },
                    {
                        Customer: '6',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2917844',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 50,
                        CreditScore2: 50
                    },
                    {
                        Customer: '11',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2919431',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Bengaluru',
                        CreditScore: 700,
                        CreditScore2: 700
                    },
                    {
                        Customer: '11',
                        CompanyCode: code,
                        SalesOrganization: '0001',
                        DistributionChannel: '01',
                        Division: '01',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922872',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Bengaluru',
                        CreditScore: 1200,
                        CreditScore2: 1200
                    },
                    {
                        Customer: '12',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922873',
                        PaymentCardType: '',
                        BusinessPartnerName: ' Thomas Tester',
                        CityName: 'Bengaluru',
                        CreditScore: 800,
                        CreditScore2: 800
                    },
                    {
                        Customer: '16',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '',
                        PaymentCardType: '',
                        BusinessPartnerName: ' xpm-01 xqp',
                        CityName: 'Bengaluru',
                        CreditScore: 600,
                        CreditScore2: 600
                    },
                    {
                        Customer: '17',
                        CompanyCode: code,
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '',
                        PaymentCardType: '',
                        BusinessPartnerName: 'xpm-02 as',
                        CityName: 'Bengaluru',
                        CreditScore: 400,
                        CreditScore2: 400
                    }
                ]
            }
        ];
    },
    getInitialDataSet: function (contextId) {
        return [
            {
                P_CompanyCode: '001',
                Set: [
                    {
                        Customer: '1',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2919682',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 100,
                        CreditScore2: 100
                    },
                    {
                        Customer: '1',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922870',
                        PaymentCardType: '',
                        BusinessPartnerName: 'TEST asdf',
                        CityName: 'Paris',
                        CreditScore: 200,
                        CreditScore2: 200
                    },
                    {
                        Customer: '2',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2915717',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 150,
                        CreditScore2: 150
                    },
                    {
                        Customer: '2',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2916499',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 400,
                        CreditScore2: 400
                    },
                    {
                        Customer: '6',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2917844',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Waldorf',
                        CreditScore: 50,
                        CreditScore2: 50
                    },
                    {
                        Customer: '11',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2919431',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Bengaluru',
                        CreditScore: 700,
                        CreditScore2: 700
                    },
                    {
                        Customer: '11',
                        CompanyCode: '001',
                        SalesOrganization: '0001',
                        DistributionChannel: '01',
                        Division: '01',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922872',
                        PaymentCardType: '',
                        BusinessPartnerName: '',
                        CityName: 'Bengaluru',
                        CreditScore: 1200,
                        CreditScore2: 1200
                    },
                    {
                        Customer: '12',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '2922873',
                        PaymentCardType: '',
                        BusinessPartnerName: ' Thomas Tester',
                        CityName: 'Bengaluru',
                        CreditScore: 800,
                        CreditScore2: 800
                    },
                    {
                        Customer: '16',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '',
                        PaymentCardType: '',
                        BusinessPartnerName: ' xpm-01 xqp',
                        CityName: 'Bengaluru',
                        CreditScore: 600,
                        CreditScore2: 600
                    },
                    {
                        Customer: '17',
                        CompanyCode: '001',
                        SalesOrganization: '',
                        DistributionChannel: '',
                        Division: '',
                        PartnerCounter: '',
                        IBAN: '',
                        CardNumber: '',
                        PaymentCardType: '',
                        BusinessPartnerName: 'xpm-02 as',
                        CityName: 'Bengaluru',
                        CreditScore: 400,
                        CreditScore2: 400
                    }
                ]
            }
        ];
    }
};
