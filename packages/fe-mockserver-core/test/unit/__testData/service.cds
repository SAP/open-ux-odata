using {cuid, managed} from '@sap/cds/common';

namespace sap.fe.core;

entity RootElement {
    key ID                                		: Integer @Core.Computed;
    Prop1 : String @Common.Label : 'First Prop';
    Prop2 : String @Common.Label : 'Second Propyour ';
    isBoundAction1Hidden : Boolean @Common.Label : 'Bound Action 1 Hidden';
    isBoundAction2Hidden : Boolean @Common.Label : 'Bound Action 2 Hidden';
    isBoundAction3Hidden : Boolean @Common.Label : 'Bound Action 3 Hidden';
    Sibling_ID : Integer;
	Sibling  : Association to RootElement on Sibling.ID = Sibling_ID;
    _Elements	 : Composition of many SubElement on _Elements.owner = $self;
};

entity SubElement  @(cds.autoexpose) {
  	key ID                                		: Integer @Core.Computed;
  	SubProp1 : String;
  	SubProp2 : String;
  	isBoundAction3Hidden: Boolean @Common.Label: 'Bound Action 3 Hidden';
  	isBoundAction4Hidden: Boolean @Common.Label: 'Bound Action 4 Hidden';
	owner_ID : Integer;
	owner: Association to RootElement on owner.ID = owner_ID;
	sibling_ID : Integer;
	Sibling  : Association to SubElement on Sibling.ID = sibling_ID;
}

annotate RootElement with @UI :{
	LineItem: [
		{Value : ID},
		{Value : Prop1},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 1',
			Action : 'sap.fe.core.ActionVisibility.boundAction1'
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 2',
			Action : 'sap.fe.core.ActionVisibility.boundAction2',
			![@UI.Hidden] : isBoundAction2Hidden
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Menu Action 1',
			Action : 'sap.fe.core.ActionVisibility.menuAction1',
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Menu Action 2',
			Action : 'sap.fe.core.ActionVisibility.menuAction2',
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 3',
			Action : 'sap.fe.core.ActionVisibility.boundAction3',
			![@UI.Hidden] : _Elements.isBoundAction3Hidden
		},
		{Value : isBoundAction1Hidden},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 1 Inline',
			Action : 'sap.fe.core.ActionVisibility.boundAction1',
			Inline: true,
			![@UI.Hidden] : isBoundAction1Hidden
		},

		{Value : Sibling.isBoundAction1Hidden, Label: 'Sibling isBoundAction2 Hidden'},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 2',
			Action : 'sap.fe.core.ActionVisibility.boundAction2',
			Inline: true,
			![@UI.Hidden] : Sibling.isBoundAction2Hidden
		}
	],
 	HeaderInfo  : {
        $Type : 'UI.HeaderInfoType',
        TypeName : 'Root Element',
        TypeNamePlural : 'Root Elements',
        Title : {
            $Type : 'UI.DataField',
            Value : Prop1
        },
        Description : {
            $Type : 'UI.DataField',
            Value : Prop2
        },
    },
	Facets: [ {
		$Type  : 'UI.CollectionFacet',
		Facets: [ {
                  				  $Type  : 'UI.ReferenceFacet',
                  				  Label  : 'Identification',
                  				  Target : '@UI.Identification'
                  			  },{
			$Type  : 'UI.CollectionFacet',
			ID	   : 'GeneralInformation',
			Label  : 'General Information',
			Facets: [ {
				$Type  : 'UI.ReferenceFacet',
            	Label  : 'General Information',
            	Target : '@UI.FieldGroup#GeneralInformation'
            }]
		}, {
			$Type : 'UI.ReferenceFacet',
			ID : 'SubElements',
			Label: 'Sub Elements',
			Target: '_Elements/@UI.LineItem'

		}]
	}
	],
	Identification      : [
		{
			$Type       : 'UI.DataFieldForAction',
			Label       : 'Bound Action 1',
			Action      : 'sap.fe.core.ActionVisibility.boundAction1',
			Determining : true,
			![@UI.Hidden] : isBoundAction1Hidden
		}, {
		   $Type       : 'UI.DataFieldForAction',
		   Label       : 'Bound Action 2',
		   Action      : 'sap.fe.core.ActionVisibility.boundAction2',
		   Determining : true,
		   ![@UI.Hidden] : isBoundAction2Hidden
	   }, {
			$Type       : 'UI.DataFieldForAction',
			Label       : 'Bound Header Action 1',
			Action      : 'sap.fe.core.ActionVisibility.boundHeaderAction1',
			Determining : false,
			![@UI.Hidden] : isBoundAction1Hidden
		}, {
		   $Type       : 'UI.DataFieldForAction',
		   Label       : 'Bound Header Action 2',
		   Action      : 'sap.fe.core.ActionVisibility.boundHeaderAction2',
		   Determining : false,
		   ![@UI.Hidden] : isBoundAction2Hidden
	   }, {Value: isBoundAction1Hidden}, {Value: isBoundAction2Hidden}, {Value: isBoundAction3Hidden}],
	 FieldGroup #GeneralInformation     : {
		Label : 'General Information',
		Data  : [
			{Value : ID},
			{Value : Prop1},
			{Value : Prop2}
	   ]
	}
};

annotate SubElement with @UI : {
	LineItem: [
		{Value : SubProp1},
		{Value : owner.isBoundAction1Hidden, Label: 'Owner -> boundAction1 Hidden'},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 1',
			Action : 'sap.fe.core.ActionVisibility.boundAction1',
			![@UI.Hidden] : owner.isBoundAction1Hidden
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Menu Action 1',
			Action : 'sap.fe.core.ActionVisibility.menuAction1',
			![@UI.Hidden] : owner.isBoundAction1Hidden
		},
		{Value : owner.Sibling.isBoundAction2Hidden, Label: 'Owner -> Sibling boundAction2 Hidden'},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 2',
			Action : 'sap.fe.core.ActionVisibility.boundAction2',
			![@UI.Hidden] : owner.Sibling.isBoundAction2Hidden
		},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Menu Action 2',
			Action : 'sap.fe.core.ActionVisibility.menuAction2',
			![@UI.Hidden] : owner.Sibling.isBoundAction2Hidden
		},
		{Value : isBoundAction3Hidden},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 3 Inline',
			Action : 'sap.fe.core.ActionVisibility.boundAction3',
			Inline: true,
			![@UI.Hidden] : isBoundAction3Hidden
		},
		{Value : Sibling.isBoundAction4Hidden, Label: 'Sibling boundAction4 Hidden'},
		{
			$Type  : 'UI.DataFieldForAction',
			Label  : 'Bound Action 4',
			Action : 'sap.fe.core.ActionVisibility.boundAction4',
			Inline: true,
			![@UI.Hidden] : Sibling.isBoundAction4Hidden
		},
	]
};

service ActionVisibility {
	@odata.draft.enabled
    entity RootElement as projection on core.RootElement actions {
		@cds.odata.bindingparameter.name : 'self'
	 	action boundAction1() returns RootElement;
	 	action boundAction2() returns RootElement;
	 	@cds.odata.bindingparameter.name : 'self'
	 	action boundAction3() returns RootElement;
		action boundActionReturnsVoid();
		@cds.odata.bindingparameter.name : 'self'
		function baseFunction(data: String) returns String;
    };
}