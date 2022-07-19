service TestService {
    entity Entity1 {
        key ID : String;
    } actions {
        action   action();
        function function() returns Integer;
    }

    entity Entity2 {
        key ID : String;
    } actions {
        action   action();
        function function() returns Integer;
    }

    action   action();
    function function() returns Integer;
}

annotate TestService.Entity1 with @UI.LineItem : [
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Action',
        Action : 'TestService.action',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Function',
        Action : 'TestService.function',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Action via ActionImport',
        Action : 'TestService.EntityContainer/action',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Function via ActionImport',
        Action : 'TestService.EntityContainer/function',
    },
];

annotate TestService.Entity2 with @UI.LineItem : [
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Action',
        Action : 'TestService.action',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Function',
        Action : 'TestService.function',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Action via ActionImport',
        Action : 'TestService.EntityContainer/action',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Function via ActionImport',
        Action : 'TestService.EntityContainer/function',
    },
];
