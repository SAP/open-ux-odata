aspect AbstractEntity {
    key ID : String;
    Name   : String;
    Value  : String;
    BaseData : String;
}


service MultiLevelExpand {
    entity MyEntityData : AbstractEntity {
        ArrayData : Association to many B
                      on ArrayData._back = $self;
    }

    entity B : AbstractEntity {
        _back   : Association to one MyEntityData;
        SubArray : Association to many C
                      on SubArray._back = $self;
    }

    entity C : AbstractEntity {
        _back : Association to one B;
         SubSubArray : Association to many D
                              on SubSubArray._back = $self;
    }
    entity D : AbstractEntity {
            _back : Association to one C;
        }
}
