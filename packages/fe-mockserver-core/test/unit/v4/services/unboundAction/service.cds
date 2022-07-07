using {
  cuid,
  managed
} from '@sap/cds/common';

service Service {
  @odata.draft.enabled
  entity RootEntity {
    key ID                  : Integer       @title : 'Identifier';
        TitleProperty       : String        @title : 'Title';
        DescriptionProperty : String        @title : 'Description';
        NameProperty        : String        @title : 'Some Text';
        NumberProperty      : Decimal(4, 2) @title : 'Number';
        Currency            : String        @title : 'Currency';
        BooleanProperty     : Boolean       @title : 'Boolean';
        Progress            : Decimal(4, 1) @title : 'Progress';
        _Child              : Composition of many ChildEntity
                                on _Child.Parent = $self;
  } actions {
    @(
      Common.SideEffects              : {TargetProperties : ['_it/BooleanProperty']},
      cds.odata.bindingparameter.name : '_it'
    )
    action boundAction();
  }

  action unboundAction();

  annotate RootEntity with
  @(UI : {
    HeaderInfo                           : {
      TypeName       : 'Root Entity',
      TypeNamePlural : 'Root Entities',
      TypeImageUrl   : 'sap-icon://alert',
      Title          : {
        $Type : 'UI.DataField',
        Value : TitleProperty
      }
    },
    HeaderFacets                         : [{
      $Type  : 'UI.ReferenceFacet',
      ID     : 'HeaderFacetIdentifier1',
      Target : '@UI.FieldGroup#HeaderGeneralInformation'
    }],
    Facets                               : [{
      $Type  : 'UI.ReferenceFacet',
      ID     : 'FacetIdentifier1',
      Target : '_Child/@UI.LineItem'
    }],
    FieldGroup #HeaderGeneralInformation : {Data : [
      {
        $Type : 'UI.DataField',
        Value : NameProperty
      },
      {
        $Type : 'UI.DataField',
        Value : DescriptionProperty
      },
      {
        $Type : 'UI.DataField',
        Value : BooleanProperty
      }
    ]}
  });

  entity ChildEntity {
    key ID                       : Integer       @title : 'Child Identifier';
        ChildTitleProperty       : String        @title : 'Child Title';
        ChildDescriptionProperty : String        @title : 'Child Description';
        ChildNameProperty        : String        @title : 'Some Child Text';
        ChildNumberProperty      : Decimal(4, 2) @title : 'Child Number';
        Parent                   : Association to RootEntity;
  } actions {
    @(
      Common.SideEffects              : {TargetProperties : ['_it/ChildTitleProperty']},
      cds.odata.bindingparameter.name : '_it'
    )
    action boundActionSetTitle(Title : String);
  }

  annotate ChildEntity with @(UI : {
    HeaderInfo : {
      TypeName       : 'Child Entity',
      TypeNamePlural : 'Child Entities',
      TypeImageUrl   : 'sap-icon://alert',
      Title          : {
        $Type : 'UI.DataField',
        Value : ChildTitleProperty
      }
    },
    Facets     : [{
      $Type  : 'UI.ReferenceFacet',
      ID     : 'FacetIdentifier1',
      Target : '@UI.FieldGroup'
    }],
    LineItem   : [
      {Value : ID},
      {Value : ChildTitleProperty},
      {Value : ChildDescriptionProperty}
    ],
    FieldGroup : {Data : [
      {
        $Type : 'UI.DataField',
        Value : ChildNameProperty
      },
      {
        $Type : 'UI.DataField',
        Value : ChildNumberProperty
      }
    ]}
  });
}
