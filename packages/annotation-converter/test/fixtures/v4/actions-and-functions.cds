service TestService {
    entity Entity {
        key ID : String;
    } actions {
        action   boundAction();

        @cds.odata.bindingparameter.collection
        action   staticAction();

        function boundFunction() returns Integer;
    }

    action   unboundAction();
    function unboundFunction() returns Integer;
}

annotate TestService.Entity with @UI.LineItem : [
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Action',
        Action : 'TestService.boundAction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Bound Function',
        Action : 'TestService.boundFunction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Static Action',
        Action : 'TestService.staticAction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Action (invalid direct reference)',
        Action : 'TestService.unboundAction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Function (invalid direct reference)',
        Action : 'TestService.unboundFunction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Action via ActionImport',
        Action : 'TestService.EntityContainer/unboundAction',
    },
    {
        $Type  : 'UI.DataFieldForAction',
        Label  : 'Unbound Function via ActionImport',
        Action : 'TestService.EntityContainer/unboundFunction',
    },
];
