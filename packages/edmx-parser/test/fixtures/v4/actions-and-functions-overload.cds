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
