using {
  cuid,
  managed
} from '@sap/cds/common';

namespace sap.fe.core;

entity RootElement {
  key ID                    : Integer @Core.Computed;
      Prop1                 : String  @Common.Label: 'First Prop';
      Prop2                 : String  @Common.Label: 'Second Propyour ';
      isBoundAction1Enabled : Boolean @Common.Label: 'Bound Action 1 Enabled';
      isBoundAction2Enabled : Boolean @Common.Label: 'Bound Action 2 Enabled';
      Sibling_ID            : Integer;
      Sibling               : Association to RootElement
                                on Sibling.ID = Sibling_ID;
      _Elements             : Composition of many SubElement
                                on _Elements.owner = $self;
};

entity SubElement                     @(cds.autoexpose) {
  key ID2                   : Integer @Core.Computed;
      SubProp1              : String;
      SubProp2              : String;
      isBoundAction3Enabled : Boolean @Common.Label: 'Bound Action 3 Enabled';
      isBoundAction4Enabled : Boolean @Common.Label: 'Bound Action 4 Enabled';
      isBoundAction5Enabled : Boolean @Common.Label: 'Bound Action 5 Enabled';
      isBoundAction6Enabled : Boolean @Common.Label: 'Bound Action 6 Enabled';
      owner_ID              : Integer;
      owner                 : Association to RootElement
                                on owner.ID = owner_ID;
      sibling_ID            : Integer;
      Sibling               : Association to SubElement
                                on Sibling.ID2 = sibling_ID;
}

@odata.singleton
entity Singleton {
  isTrue  : Boolean default true;
  isFalse : Boolean default false;
}

annotate RootElement with @UI: {
  LineItem                      : [
    {Value: ID},
    {Value: Prop1},
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 1',
      Action: 'sap.fe.core.ActionEnablement.boundAction1'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 2',
      Action: 'sap.fe.core.ActionEnablement.boundAction2',
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Menu Action 1',
      Action: 'sap.fe.core.ActionEnablement.menuAction1',
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Menu Action 2',
      Action: 'sap.fe.core.ActionEnablement.menuAction2',
    },
    {Value: isBoundAction1Enabled},
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 1 Inline',
      Action: 'sap.fe.core.ActionEnablement.boundAction1',
      Inline: true
    },

    {
      Value: Sibling.isBoundAction2Enabled,
      Label: 'Sibling isBoundAction2 Enabled'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 2 Inline',
      Action: 'sap.fe.core.ActionEnablement.boundAction2',
      Inline: true
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Bound Action Singleton (enabled)',
      Action              : 'sap.fe.core.ActionEnablement.boundSingletonTrue',
      ![@Core.Description]: 'Bound Action controlled by a singleton, should be enabled',
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Bound Action Singleton (disabled)',
      Action              : 'sap.fe.core.ActionEnablement.boundSingletonFalse',
      ![@Core.Description]: 'Bound Action controlled by a singleton, should be disabled',
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Unbound Action Singleton (enabled)',
      Action              : 'sap.fe.core.ActionEnablement.EntityContainer/unboundSingletonTrue',
      ![@Core.Description]: 'Unbound Action controlled by a singleton, should be enabled',
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Unbound Action Singleton (disabled)',
      Action              : 'sap.fe.core.ActionEnablement.EntityContainer/unboundSingletonFalse',
      ![@Core.Description]: 'Unbound Action controlled by a singleton, should be disabled',
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Unbound Action (disabled)',
      Action              : 'sap.fe.core.ActionEnablement.EntityContainer/unboundDisabled',
      ![@Core.Description]: 'Unbound Action, should always be disabled',
    },
    {
      $Type               : 'UI.DataFieldForAction',
      Label               : 'Unbound Action (enabled)',
      Action              : 'sap.fe.core.ActionEnablement.EntityContainer/unboundEnabled',
      ![@Core.Description]: 'Unbound Action, should always be enabled',
    },
  ],
  HeaderInfo                    : {
    $Type         : 'UI.HeaderInfoType',
    TypeName      : 'Root Element',
    TypeNamePlural: 'Root Elements',
    Title         : {
      $Type: 'UI.DataField',
      Value: Prop1
    },
    Description   : {
      $Type: 'UI.DataField',
      Value: Prop2
    },
  },
  Facets                        : [{
    $Type : 'UI.CollectionFacet',
    Facets: [
      {
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInformation',
        Label : 'General Information',
        Facets: [{
          $Type : 'UI.ReferenceFacet',
          Label : 'General Information',
          Target: '@UI.FieldGroup#GeneralInformation'
        }]
      },
      {
        $Type : 'UI.ReferenceFacet',
        ID    : 'SubElements',
        Label : 'Sub Elements',
        Target: '_Elements/@UI.LineItem'

      }
    ]
  }],
  FieldGroup #GeneralInformation: {
    Label: 'General Information',
    Data : [
      {Value: ID},
      {Value: Prop1},
      {Value: Prop2},
      {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action 1 Inline',
        Action: 'sap.fe.core.ActionEnablement.boundAction1',
        Inline: true
      },
      {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action 2 Inline',
        Action: 'sap.fe.core.ActionEnablement.boundAction2',
        Inline: true
      }
    ]
  }
};

annotate SubElement with @UI: {
  LineItem                      : [
    {Value: SubProp1},
    {
      Value: owner.isBoundAction1Enabled,
      Label: 'Owner -> boundAction1 Enabled'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 3',
      Action: 'sap.fe.core.ActionEnablement.boundAction3'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Menu Action 3',
      Action: 'sap.fe.core.ActionEnablement.menuAction3',
    },
    {
      Value: owner.Sibling.isBoundAction2Enabled,
      Label: 'Owner -> Sibling boundAction2 Enabled'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 2',
      Action: 'sap.fe.core.ActionEnablement.boundAction4',
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Menu Action 2',
      Action: 'sap.fe.core.ActionEnablement.menuAction4'
    },
    {Value: isBoundAction5Enabled},
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 3 Inline',
      Action: 'sap.fe.core.ActionEnablement.boundAction5',
      Inline: true
    },
    {
      Value: Sibling.isBoundAction6Enabled,
      Label: 'Sibling boundAction6 Enabled'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Label : 'Bound Action 6',
      Action: 'sap.fe.core.ActionEnablement.boundAction6',
      Inline: true
    },
  ],
  HeaderInfo                    : {
    $Type         : 'UI.HeaderInfoType',
    TypeName      : 'Root Element',
    TypeNamePlural: 'Root Elements',
    Title         : {
      $Type: 'UI.DataField',
      Value: SubProp1
    },
    Description   : {
      $Type: 'UI.DataField',
      Value: SubProp2
    },
  },
  Facets                        : [{
    $Type : 'UI.CollectionFacet',
    Facets: [{
      $Type : 'UI.CollectionFacet',
      ID    : 'GeneralInformation',
      Label : 'General Information',
      Facets: [{
        $Type : 'UI.ReferenceFacet',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneralInformation'
      }]
    }]
  }],
  FieldGroup #GeneralInformation: {
    Label: 'General Information',
    Data : [
      {Value: ID2},
      {Value: SubProp1},
      {Value: SubProp2},
      {Value: isBoundAction4Enabled},
      {Value: isBoundAction5Enabled},
      {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action 5 Inline',
        Action: 'sap.fe.core.ActionEnablement.boundAction5',
        Inline: true
      },
      {
        $Type : 'UI.DataFieldForAction',
        Label : 'Bound Action 6 Inline',
        Action: 'sap.fe.core.ActionEnablement.boundAction6',
        Inline: true
      }
    ]
  }
};

service ActionEnablement {
  @odata.draft.enabled
  entity RootElement as projection on core.RootElement actions {
    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : {$edmJson: {$If: [
      {$Eq: [
        {$Path: 'self/isBoundAction1Enabled'},
        false
      ]},
      true,
      false
    ]}}
    action boundAction1() returns RootElement;

    @cds.odata.bindingparameter.name: '_it'
    @Core.OperationAvailable        : _it.Sibling.isBoundAction2Enabled
    action boundAction2() returns RootElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : {$edmJson: {$If: [
      {$Eq: [
        {$Path: 'self/isBoundAction1Enabled'},
        false
      ]},
      true,
      false
    ]}}
    action menuAction1()  returns RootElement;

    @cds.odata.bindingparameter.name: '_it'
    @Core.OperationAvailable        : _it.Sibling.isBoundAction2Enabled
    action menuAction2()  returns RootElement;

    @Core.OperationAvailable        : {$edmJson: {$Path: '/sap.fe.core.ActionEnablement.EntityContainer/Singleton/isTrue'}}
    action boundSingletonTrue();

    @Core.OperationAvailable        : {$edmJson: {$Path: '/sap.fe.core.ActionEnablement.EntityContainer/Singleton/isFalse'}}
    action boundSingletonFalse();
  };

  entity SubElement  as projection on core.SubElement actions {
    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.owner.isBoundAction1Enabled
    action boundAction3() returns SubElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.owner.Sibling.isBoundAction2Enabled
    action boundAction4() returns SubElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.isBoundAction5Enabled
    action boundAction5() returns SubElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.Sibling.isBoundAction6Enabled
    action boundAction6() returns SubElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.owner.isBoundAction1Enabled
    action menuAction3()  returns SubElement;

    @cds.odata.bindingparameter.name: 'self'
    @Core.OperationAvailable        : self.owner.Sibling.isBoundAction2Enabled
    action menuAction4()  returns SubElement;
  }

  entity Singleton   as projection on core.Singleton;

  @Core.OperationAvailable: {$edmJson: {$Path: '/sap.fe.core.ActionEnablement.EntityContainer/Singleton/isFalse'}}
  action unboundSingletonFalse();

  @Core.OperationAvailable: {$edmJson: {$Path: '/sap.fe.core.ActionEnablement.EntityContainer/Singleton/isTrue'}}
  action unboundSingletonTrue();

  @Core.OperationAvailable: false
  action unboundDisabled();

  @Core.OperationAvailable: true
  action unboundEnabled()
}
