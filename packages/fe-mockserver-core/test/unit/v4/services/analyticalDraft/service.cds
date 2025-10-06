service v4analyticaldraft {
    @odata.draft.enabled
    entity Products {
        key ID             : Integer;

            Title          : String;

            Description    : String;

            Requester      : String;

            ProductGroup   : String;

            Progress       : Integer;

            Rating         : Integer;

            Classification : String;

            _Sales         : Composition of many Sales
                                 on _Sales.Product = $self;
    }

    @Aggregation: {
        ApplySupported         : {
            $Type              : 'Aggregation.ApplySupportedType',
            GroupableProperties: [
                Country,
                Channel,
                Year,
                CurrencyCode
            ]
        },
        CustomAggregate #Amount: 'Edm.Decimal'
    }
    entity Sales {
        key ID           : Integer ;
            Country      : String;
            Channel      : String;
            Year         : String;
            Amount       : Decimal @Measures.ISOCurrency: CurrencyCode;
            CurrencyCode : String @Common.IsCurrency;
            Product_ID   : Integer;
            Product      : Association to Products
                               on Product.ID = Product_ID
                                    @odata.draft.enclosed;
    }
}
