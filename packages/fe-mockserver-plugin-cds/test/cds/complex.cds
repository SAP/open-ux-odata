service TestService {
    type Details {
        a : String;
        b : Decimal;
    }

    entity Entity1 {
        key ID                   : String;
            details              : Details;
            to_Entity2_unmanaged : Association to one Entity2
                                       on to_Entity2_unmanaged.ID = ID;
            to_Entity2_managed   : Association to one Entity2;
    }

    entity Entity2 {
        key ID      : String;
            details : Details;
    }
}
