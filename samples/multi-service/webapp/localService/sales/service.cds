service SalesService {
    @odata.draft.enabled
    entity SalesOrders {
        key OrderID      : String(10);
        CustomerID       : String(10);
        OrderDate        : DateTime;
        TotalAmount      : Decimal(15, 2);
        CurrencyCode     : String(3);
        Status           : String(20);
        Items            : Composition of many SalesOrderItems on Items.SalesOrder = $self;
        Customer         : Association to Customers on Customer.CustomerID = CustomerID;
    }

    entity SalesOrderItems {
        key OrderID      : String(10);
        key ItemNo       : String(6);
        ProductID        : String(18);
        Description      : String;
        Quantity         : Decimal(13, 3);
        UnitPrice        : Decimal(10, 2);
        Amount           : Decimal(15, 2);
        CurrencyCode     : String(3);
        SalesOrder       : Association to SalesOrders on SalesOrder.OrderID = OrderID;
    }

    entity Customers {
        key CustomerID   : String(10);
        CustomerName     : String;
        City             : String;
        Country          : String(2);
    }

    entity OrderTemplates {
        key TemplateID   : String;
        Description      : String;
        DefaultAmount    : Decimal(15, 2);
        Currency         : String(3);
    }
}

annotate SalesService.SalesOrders with @(
    UI.SelectionFields: [OrderID, CustomerID, Status],
    UI.LineItem: [
        { Value: OrderID },
        { Value: CustomerID },
        { Value: OrderDate },
        { Value: TotalAmount },
        { Value: Status }
    ],
    UI.HeaderInfo: {
        TypeName: 'Sales Order',
        TypeNamePlural: 'Sales Orders',
        Title: { Value: OrderID }
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'GeneralInfoFacet',
            Label: 'General Information',
            Target: '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'SalesItemsFacet',
            Label: 'Order Items',
            Target: 'Items/@UI.LineItem'
        }
    ],
    UI.FieldGroup #GeneralInfo: {
        Data: [
            { Value: OrderID },
            { Value: CustomerID },
            { Value: OrderDate },
            { Value: TotalAmount },
            { Value: Status }
        ]
    }
);

annotate SalesService.SalesOrderItems with @(
    UI.LineItem: [
        { Value: ItemNo },
        { Value: ProductID },
        { Value: Quantity },
        { Value: UnitPrice },
        { Value: Amount }
    ]
);
