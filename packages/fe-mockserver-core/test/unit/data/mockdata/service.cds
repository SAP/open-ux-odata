aspect AbstractEntity {
    key ID : Integer;
    Name   : String;
    Value  : String;
}
@cds.external
type testComplexType : {
    name                : String @Common.Text: textDescription;
    number              : Integer;
    textDescription     : String;
};

service MultiLevelExpand {
    entity MyRootEntity : AbstractEntity {
        complexComputedProperty: many testComplexType @Core.Computed: true;
        complexProperty: many testComplexType;
        complexComputedNotNullProperty: many testComplexType not null @Core.Computed: true;
        complexNotNullProperty: many testComplexType not null;
    }

    entity MySecondEntity : AbstractEntity {

    }
}
