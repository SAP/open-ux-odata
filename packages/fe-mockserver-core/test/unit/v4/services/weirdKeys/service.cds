service WeirdKeys {
    entity A {
        key ID : String;
        key BoolKey : Boolean;
        key GuidKey : UUID           @odata.Type : 'Edm.Guid';
        key DateKey : Date;
        value  : String;
    }
}
