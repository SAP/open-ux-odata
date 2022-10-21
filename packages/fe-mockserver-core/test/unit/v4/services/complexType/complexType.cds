service TestService {
    entity A {
        key ID                    : String;

            complex               : {
                value1            : Integer;
                value2            : Integer;
                value3            : Integer not null;
                subcomplex        : {
                    A             : String not null;
                    B             : String not null;
                    C             : Integer
                };
                subcomplexNotNull : {
                    A             : String not null;
                    B             : String not null;
                    C             : Integer
                } not null;
            };

            complexNotNull        : {
                value1            : Integer;
                value2            : Integer;
                value3            : Integer not null;
                subcomplex        : {
                    A             : String not null;
                    B             : String not null;
                    C             : Integer
                };
                subcomplexNotNull : {
                    A             : String not null;
                    B             : String not null;
                    C             : Integer
                } not null;
            } not null;

            b                     : Association to many B
                                        on ID = b.a_ID;
    }

    entity B {
        key UID        : String;
            a_ID       : String;
            complex    : {
                value1 : Boolean;
                value2 : Boolean;
            }
    }
}
