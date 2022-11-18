// A service with a single draft root
service TestService {
    @odata.draft.enabled
    entity DraftRoots {
        key ID     : Integer;
            _nodes : Composition of many DraftNodes_1
                         on _nodes._parent = $self;
            _other : Association to one OtherEntities;
    }

    entity DraftNodes_1 {
        key ID      : Integer;
            _parent : Association to one DraftRoots;
            _nodes  : Composition of many DraftNodes_2
                          on _nodes._parent = $self
    }

    entity DraftNodes_2 {
        key ID      : Integer;
            _parent : Association to one DraftNodes_1;
    }

    entity OtherEntities {
        key ID : Integer;
    }
}
