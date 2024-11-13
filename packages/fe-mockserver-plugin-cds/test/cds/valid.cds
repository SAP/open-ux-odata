namespace sap.fe.mockserver;

service ValidCDS {
	entity RootElement {
        key ID                                		: Integer @Core.Computed;
        Prop1 : String @Common.Label : 'First Prop';
        Prop2 : String @Common.Label : 'Second Propy';
        Prop3 : String  @title: '{i18n>BeginDate}';
        Prop4 : String  @title: '{i18n>EndDate}';
        Prop5 : String  @title: '{i18n>OtherProp}';
        isBoundAction1Hidden : Boolean @Common.Label : 'Bound Action 1 Hidden';
        isBoundAction2Hidden : Boolean @Common.Label : 'Bound Action 2 Hidden';
        isBoundAction3Hidden : Boolean @Common.Label : 'Bound Action 3 Hidden';
        Sibling_ID : Integer;
    	Sibling  : Association to RootElement on Sibling.ID = Sibling_ID;
    };
}
