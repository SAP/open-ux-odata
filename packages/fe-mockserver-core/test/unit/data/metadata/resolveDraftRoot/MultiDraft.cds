// A service with two isolated draft roots (both draft objects are completely independent)
service TestService {
    /**
     * Draft 1
     */
    @odata.draft.enabled
    entity Draft_1_Roots {
        key ID     : Integer;
            _nodes : Composition of many Draft_1_Nodes_1
                         on _nodes._parent = $self;
    }

    entity Draft_1_Nodes_1 {
        key ID      : Integer;
            _parent : Association to one Draft_1_Roots;
            _nodes  : Composition of many Draft_1_Nodes_2
                          on _nodes._parent = $self
    }

    entity Draft_1_Nodes_2 {
        key ID      : Integer;
            _parent : Association to one Draft_1_Nodes_1;
    }


    /**
     * Draft 1
     */
    @odata.draft.enabled
    entity Draft_2_Roots {
        key ID     : Integer;
            _nodes : Composition of many Draft_2_Nodes_1
                         on _nodes._parent = $self;
    }

    entity Draft_2_Nodes_1 {
        key ID      : Integer;
            _parent : Association to one Draft_2_Roots;
            _nodes  : Composition of many Draft_2_Nodes_2
                          on _nodes._parent = $self
    }

    entity Draft_2_Nodes_2 {
        key ID      : Integer;
            _parent : Association to one Draft_2_Nodes_1;
    }

}
