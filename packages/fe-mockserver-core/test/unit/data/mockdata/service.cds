aspect AbstractEntity {
    key ID : Integer;
    Name   : String;
    Value  : String;
}


service MultiLevelExpand {
    entity MyRootEntity : AbstractEntity {

    }

    entity MySecondEntity : AbstractEntity {

    }
}
