service ProductService {
    @odata.draft.enabled
    entity Products {
        key ProductID          : String;
        Name                   : String;
        Description            : String;
        Price                  : Decimal(10, 2);
        CurrencyCode           : String(3);
        StockQuantity          : Integer;
    }
}

annotate ProductService.Products with @(
    UI.SelectionFields: [ProductID, Name],
    UI.LineItem: [
        { Value: ProductID },
        { Value: Name },
        { Value: Price },
        { Value: StockQuantity }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'GeneralInfoFacet',
            Label: 'General Information',
            Target: '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'PriceInfoFacet',
            Label: 'Pricing',
            Target: '@UI.FieldGroup#PriceInfo'
        }
    ],
    UI.FieldGroup #GeneralInfo: {
        Data: [
            { Value: ProductID },
            { Value: Name },
            { Value: Description }
        ]
    },
    UI.FieldGroup #PriceInfo: {
        Data: [
            { Value: Price },
            { Value: CurrencyCode },
            { Value: StockQuantity }
        ]
    }
);
