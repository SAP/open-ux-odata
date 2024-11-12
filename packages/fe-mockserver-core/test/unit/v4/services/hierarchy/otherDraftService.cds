namespace sap.fe.core;

type StateMessage : {
  code            : String(10) not null;
  message         : String(100);
  numericSeverity : Integer;
  transition      : Boolean default true;
  target          : String(200) not null;
  longtextUrl     : String(200) not null;
};

entity Organizations {
      @Core.Computed: true
  key ID             :      String;
      preferredNode  :      String @(Common: {
        Label    : 'Preferred Node',
        ValueList: {
          CollectionPath              : 'Nodes',
          Parameters                  : [
            {
              $Type            : 'Common.ValueListParameterInOut',
              LocalDataProperty: preferredNode,
              ValueListProperty: 'ID',
            },
            {
              $Type            : 'Common.ValueListParameterDisplayOnly',
              ValueListProperty: 'name',
            },
          ],
          PresentationVariantQualifier: 'VH',
        }
      });
      description    :      String;
      SAP_Messages   : many StateMessage;
      _Nodes         :      Composition of many Nodes
                              on _Nodes.Organization = $self;
      _PreferredNode :      Composition of many smallNodes
                              on _PreferredNode.Organization = $self;
};

@Aggregation.RecursiveHierarchy #NodesHierarchy             : {
  NodeProperty            : ID,
  ParentNavigationProperty: Superordinate
}
@Hierarchy.RecursiveHierarchy #NodesHierarchy               : {
  ExternalKey           : ID,
  LimitedDescendantCount: LimitedDescendantCount,
  DistanceFromRoot      : DistanceFromRoot,
  DrillState            : DrillState,
  Matched               : Matched,
  MatchedDescendantCount: MatchedDescendantCount,
  LimitedRank           : LimitedRank,
}
@Aggregation.RecursiveHierarchy #NodesHierarchyFakeMove     : {
  NodeProperty            : ID,
  ParentNavigationProperty: Superordinate
}
@Hierarchy.RecursiveHierarchy #NodesHierarchyFakeMove       : {
  ExternalKey           : ID,
  LimitedDescendantCount: LimitedDescendantCount,
  DistanceFromRoot      : DistanceFromRoot,
  DrillState            : DrillState,
  Matched               : Matched,
  MatchedDescendantCount: MatchedDescendantCount,
  LimitedRank           : LimitedRank,
}
@Hierarchy.RecursiveHierarchyActions #NodesHierarchyFakeMove: {
  $Type                  : 'Hierarchy.RecursiveHierarchyActionsType',
  ChangeNextSiblingAction: 'dummyAction',
}
@Capabilities.FilterRestrictions                            : {NonFilterableProperties: [
  LimitedDescendantCount,
  DistanceFromRoot,
  DrillState,
  Matched,
  MatchedDescendantCount
]}
@Capabilities.SortRestrictions                              : {NonSortableProperties: [
  LimitedDescendantCount,
  DistanceFromRoot,
  DrillState,
  Matched,
  MatchedDescendantCount
]}
entity Nodes {
      @Core.Immutable: true
      @Common.Label  : 'ID'
  key ID                     : String;
      parent                 : String;

      @Common.Label  : 'Org level name'
      name                   : String;

      @UI.Hidden     : true
      orgID                  : String;

      @Common.Label  : 'HR Business Partner'
      hrPartner              : String;

      @Common.Label  : 'Number of employees'
      employeeCount          : Integer;

      @Core.Immutable: true
      @Common.Label  : 'Node type'
      nodeType               : String;
      Superordinate          : Association to Nodes
                                 on Superordinate.ID = parent @odata.draft.enclosed;
      Organization           : Association to Organizations
                                 on Organization.ID = orgID   @odata.draft.enclosed;

      @Core.Computed : true
      @UI.Hidden     : true
      LimitedDescendantCount : Integer64;

      @Core.Computed : true
      @UI.Hidden     : true
      DistanceFromRoot       : Integer64;

      @Core.Computed : true
      @UI.Hidden     : true
      DrillState             : String;

      @Core.Computed : true
      @UI.Hidden     : true
      Matched                : Boolean;

      @Core.Computed : true
      @UI.Hidden     : true
      MatchedDescendantCount : Integer64;

      @Core.Computed : true
      @UI.Hidden     : true
      LimitedRank            : Integer64;
};

entity smallNodes {
      @Core.Immutable: true
  key ID           : String                       @(Common: {
        Label    : 'Preferred Node',
        ValueList: {
          CollectionPath              : 'Nodes',
          Parameters                  : [
            {
              $Type            : 'Common.ValueListParameterInOut',
              LocalDataProperty: ID,
              ValueListProperty: 'ID',
            },
            {
              $Type            : 'Common.ValueListParameterDisplayOnly',
              ValueListProperty: 'name',
            },
          ],
          PresentationVariantQualifier: 'VH',
        }
      });
      orgID        : String;
      Organization : Association to Organizations
                       on Organization.ID = orgID @odata.draft.enclosed;
};

annotate Organizations with @UI: {
  PresentationVariant #VH: {
    $Type         : 'UI.PresentationVariantType',
    Visualizations: ['@UI.LineItem', ]
  },
  SelectionFields        : [preferredNode],
  LineItem               : [
    {
      $Type: 'UI.DataField',
      Value: ID,
    },
    {
      $Type: 'UI.DataField',
      Value: description,
    },
  ],
  HeaderInfo             : {
    $Type         : 'UI.HeaderInfoType',
    TypeName      : 'Organization',
    TypeNamePlural: 'Organizations',
    Title         : {
      $Type: 'UI.DataField',
      Value: ID,
    },
    Description   : {
      $Type: 'UI.DataField',
      Value: description,
    },
  },
  Facets                 : [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '_Nodes/@UI.PresentationVariant',
      Label : 'Nodes',
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#VH',
      Label : 'Organization',
    },
  ],
  FieldGroup #VH         : {Data: [
    {
      Value: preferredNode,
      Label: 'Preferred Node'
    },
    {
      Value: _PreferredNode.ID,
      Label: 'Liked Nodes'
    }
  ]},
};

annotate Nodes with @UI: {
  PresentationVariant    : {
    $Type         : 'UI.PresentationVariantType',
    RequestAtLeast: [nodeType],
    Visualizations: ['@UI.LineItem', ],
  },
  PresentationVariant #VH: {
    $Type                      : 'UI.PresentationVariantType',
    Visualizations             : ['@UI.LineItem', ],
    RecursiveHierarchyQualifier: 'NodesHierarchy',
    InitialExpansionLevel      : 2
  },
  LineItem               : [
    {
      $Type: 'UI.DataField',
      Value: name,
    },
    {
      $Type: 'UI.DataField',
      Value: employeeCount,
    },
    {
      $Type: 'UI.DataField',
      Value: nodeType,
    },
  ],
  HeaderInfo             : {
    $Type         : 'UI.HeaderInfoType',
    TypeName      : 'Organization Level',
    TypeNamePlural: 'Organization Levels',
    Title         : {
      $Type: 'UI.DataField',
      Value: ID,
    },
    Description   : {
      $Type: 'UI.DataField',
      Value: ID,
    },
  },
  FieldGroup             : {
    $Type: 'UI.FieldGroupType',
    Data : [
      {
        $Type: 'UI.DataField',
        Value: name,
      },
      {
        $Type: 'UI.DataField',
        Value: hrPartner,
      },
      {
        $Type: 'UI.DataField',
        Value: employeeCount,
      },
    ],
  },
  Facets                 : [{
    $Type : 'UI.ReferenceFacet',
    Target: '@UI.FieldGroup',
    Label : 'Informations',
  }, ],
};


annotate Organizations with @Common: {Messages: SAP_Messages, };


service Hierarchy {
  @odata.draft.enabled
  entity Organizations as projection on core.Organizations;

  entity Nodes         as projection on core.Nodes;
  entity smallNodes    as projection on core.smallNodes;
}
