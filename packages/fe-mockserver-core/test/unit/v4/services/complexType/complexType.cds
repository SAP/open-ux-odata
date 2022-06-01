service TestService {
    entity A {
        key ID         : String;

            complex    : {
                value1 : Integer;
                value2 : Integer;
            };

            b          : Association to many B
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
