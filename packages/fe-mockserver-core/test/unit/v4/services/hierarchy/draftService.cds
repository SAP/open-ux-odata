service v4treedraft {
  @Aggregation.RecursiveHierarchy#SalesOrgHierarchy: {
    NodeProperty: ID,
    ParentNavigationProperty: Superordinate
  }
  @Hierarchy.RecursiveHierarchy#SalesOrgHierarchy: {
    ExternalKey: ID,
    LimitedDescendantCount: LimitedDescendantCount,
    DistanceFromRoot: DistanceFromRoot,
    DrillState: DrillState,
    Matched: Matched,
    MatchedDescendantCount: MatchedDescendantCount
  }
  @Capabilities.FilterRestrictions: {
    NonFilterableProperties: [LimitedDescendantCount,DistanceFromRoot,DrillState,Matched,MatchedDescendantCount]
  }
  @Capabilities.SortRestrictions: {
    NonSortableProperties: [LimitedDescendantCount,DistanceFromRoot,DrillState,Matched,MatchedDescendantCount]
  }
  @odata.draft.enabled
  entity SalesOrganizations {
    key ID : String;
    Parent : String;
    Name : String;
    Superordinate : Association to SalesOrganizations on Superordinate.ID = Parent;
    _Products : Composition of many Products on _Products.SalesOrg = $self;
    @Core.Computed: true
    LimitedDescendantCount : Integer64;
    @Core.Computed: true
    DistanceFromRoot : Integer64;
    @Core.Computed: true
    DrillState : String;
    @Core.Computed: true
    Matched : Boolean;
    @Core.Computed: true
    MatchedDescendantCount : Integer64;
  };

  @Aggregation.RecursiveHierarchy#ProductsHierarchy: {
    NodeProperty: ID,
    ParentNavigationProperty: Superordinate,
    DistanceFromRootProperty: DistanceFromRoot
  }
  @Hierarchy.RecursiveHierarchy#ProductsHierarchy: {
    ExternalKeyProperty: ID,
    LimitedDescendantCountProperty: LimitedDescendantCount,
    DistanceFromRootProperty: DistanceFromRoot,
    DrillStateProperty: DrillState,
    MatchedProperty: Matched,
    MatchedDescendantCountProperty: MatchedDescendantCount
  }
  @Capabilities.FilterRestrictions: {
    NonFilterableProperties: [LimitedDescendantCount,DistanceFromRoot,DrillState,Matched,MatchedDescendantCount]
  }
  @Capabilities.SortRestrictions: {
    NonSortableProperties: [LimitedDescendantCount,DistanceFromRoot,DrillState,Matched,MatchedDescendantCount]
  }
  entity Products {
    key ID: String;
    Parent: String;
    Name: String;
    SalesOrgID : String;
    Superordinate : Association to Products on Superordinate.ID = Parent @odata.draft.enclosed;
    SalesOrg : Association to SalesOrganizations on SalesOrg.ID = SalesOrgID @odata.draft.enclosed;
    @Core.Computed: true
    LimitedDescendantCount : Integer64;
    @Core.Computed: true
    DistanceFromRoot : Integer64;
    @Core.Computed: true
    DrillState : String;
    @Core.Computed: true
    Matched : Boolean;
    @Core.Computed: true
    MatchedDescendantCount : Integer64;
  }
}