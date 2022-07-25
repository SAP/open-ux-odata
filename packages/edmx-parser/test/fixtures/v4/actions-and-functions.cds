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
