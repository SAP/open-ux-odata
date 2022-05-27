aspect AbstractEntity {
    key ID : String;
    value  : String

}


service MultiLevelExpand {
    entity A : AbstractEntity {
        _toOne  : Association to one B;
        _toMany : Association to many B
                      on _toMany._back = $self;
    }

    entity B : AbstractEntity {
        _back   : Association to one A;
        _toOne  : Association to one C;
        _toMany : Association to many C
                      on _toMany._back = $self;
    }

    entity C : AbstractEntity {
        _back : Association to one B;
    }
}
