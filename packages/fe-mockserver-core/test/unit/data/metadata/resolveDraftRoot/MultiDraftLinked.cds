// A service with two draft roots linked to each other:
//
// Draft_1_Roots
// +-- Draft_1_Nodes_1
//       |
//       | (assoc)
//       | 
//       V
// Draft_2_Roots
// +-- Draft_2_Nodes_1
//
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
            _draft2 : Association to one Draft_2_Roots;
    }


    /**
     * Draft 1
     */
    @odata.draft.enabled
    entity Draft_2_Roots {
        key ID      : Integer;
            _nodes  : Composition of many Draft_2_Nodes_1
                          on _nodes._parent = $self;
            _draft1 : Association to many Draft_1_Nodes_1
                          on _draft1._draft2 = $self;
    }

    entity Draft_2_Nodes_1 {
        key ID      : Integer;
            _parent : Association to one Draft_2_Roots;
    }
}
