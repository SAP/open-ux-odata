aspect AbstractEntity {
    key ID : Integer;
    Name   : String;
    Value  : String(4);
}
@cds.external
type testComplexType : {
    name                : String @Common.Text: textDescription;
    number              : Integer;
    textDescription     : String(5);
};

service MultiLevelExpand {
    entity MyRootEntity : AbstractEntity {
        complexComputedProperty: many testComplexType @Core.Computed: true;
        complexProperty: many testComplexType;
        complexComputedNotNullProperty: many testComplexType not null @Core.Computed: true;
        complexNotNullProperty: many testComplexType not null;
        myNavProp: association to MySecondEntity;
    }

    entity MySecondEntity : AbstractEntity {

    }
}
