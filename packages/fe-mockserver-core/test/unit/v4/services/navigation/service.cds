// Not covered:
//  - draft root or draft node of draft object A to draft root or draft node of draft object B
//  - non-draft entity to draft node or draft root

service TestService {
    @odata.draft.enabled
    entity DraftRoot {
        key ID                        : String;

            @Core.Description: '1:1 to a draft node, with referential constraint'
            _toDraftNode              : Composition of one DraftNode;

            @Core.Description: '1:1 to a draft node, without referential constraint'
            _toDraftNodeNoConstraint  : Composition of one DraftNode
                                            on _toDraftNodeNoConstraint.ID = 'DraftNode1';

            @Core.Description: '1:n to a draft node, with referential constraint'
            _toDraftNodes             : Composition of many DraftNode
                                            on _toDraftNodes._up = $self;

            @Core.Description: '1:n to a draft node, without referential constraint'
            _toDraftNodesNoConstraint : Composition of many DraftNode
                                            on _toDraftNodesNoConstraint.ID like 'DraftNode1%';

            @Core.Description: '1:1 to non-draft, with referential constraint'
            _toOther                  : Association to one OtherEntity;

            @Core.Description: '1:1 to non-draft, without referential constraint'
            _toOtherNoConstraint      : Association to one OtherEntity
                                            on _toOtherNoConstraint.ID = 'OtherEntity1';

            @Core.Description: '1:n to non-draft, with referential constraint'
            _toOthers                 : Association to many  OtherEntity
                                            on _toOthers._up = $self;

            @Core.Description: '1:n to non-draft, without referential constraint'
            _toOthersNoConstraint     : Association to many OtherEntity
                                            on _toOthersNoConstraint.ID like 'OtherEntity1%'
    }

    entity DraftNode {
        key ID  : String;
            _up : Association to one DraftRoot;
    }

    entity OtherEntity {
        key ID  : String;
            _up : Association to one DraftRoot;
    }
}
