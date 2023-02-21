service v4tree {
  @Aggregation.RecursiveHierarchy#SalesOrgHierarchy: {
    NodeProperty: ID,
    ParentNavigationProperty: Superordinate,
    DistanceFromRootProperty: DistanceFromRoot
  }
  @Hierarchy.RecursiveHierarchy#SalesOrgHierarchy: {
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
  entity SalesOrganizations {
    key ID : String;
    Parent : String;
    Name : String;
    Superordinate : Association to SalesOrganizations on Superordinate.ID = Parent;
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