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
        SubSubArray : Association to many C
                      on SubSubArray._back = $self;
    }

    entity C : AbstractEntity {
        _back : Association to one B;
    }
}
