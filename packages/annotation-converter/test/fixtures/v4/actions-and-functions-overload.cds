service TestService {
    entity Entity1 {
        key ID : String;
    } actions {
        action   action();
        action   action2();
        function function() returns Integer;
    }

    entity Entity2 {
        key ID : String;
    } actions {
        action   action();
        action   action2();
        function function() returns Integer;
    }

    action   action();
    action   action2();
    function function() returns Integer;
}

annotate TestService.Entity1 with @UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action',
        Action: 'TestService.action',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Function',
        Action: 'TestService.function',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Unbound Action via ActionImport',
        Action: 'TestService.EntityContainer/action',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Unbound Function via ActionImport',
        Action: 'TestService.EntityContainer/function',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound action of the same entity type (explicit reference)',
        Action: 'TestService.action(TestService.Entity1)',
    },
];

annotate TestService.Entity2 with @UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action',
        Action: 'TestService.action',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Function',
        Action: 'TestService.function',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Unbound Action via ActionImport',
        Action: 'TestService.EntityContainer/action',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Unbound Function via ActionImport',
        Action: 'TestService.EntityContainer/function',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound action of a different entity type',
        Action: 'TestService.action(TestService.Entity1)',
    },
];
