service TestService {
    entity A {
        key ID               : String(10);

            _differentId     : Association to one B
                                   on ID in _differentId.ID_B;
            _differentIdMany : Association to many B
                                   on ID in _differentIdMany.ID_B;

            _sameId          : Association to one C
                                   on ID in _sameId.ID;
            _sameIdMany      : Association to many C
                                   on ID in _sameIdMany.ID;
    }

    entity B {
        key ID_B : String(10);
    }

    entity C {
        key ID : String(10);
    }
}