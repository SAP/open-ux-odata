service FilterTest {
    entity Entities {
        key ID                  :      String;
            // primitive property
            value               :      Integer;
            // collection of a primitive type
            collectionProperty1 : many Integer;

            // collection of a complex type
            collectionProperty2 : many {
                value : Integer;
            };

            // 1:n navigation property
            navigationProperty1 :      Composition of many AssociatedEntities1
                                           on navigationProperty1.parent = $self;

            // 1:1 navigation property
            navigationProperty2 :      Composition of one AssociatedEntities1;
    }

    entity AssociatedEntities1 {
        key ID                  :      String;
            parent              :      Association to one Entities;
            // primitive property
            value               :      Integer;
            // collection of a primitive type
            collectionProperty1 : many Integer;

            // collection of a complex type
            collectionProperty2 : many {
                value : Integer;
            };

            // 1:n navigation property
            navigationProperty1  :      Composition of many AssociatedEntities2
                                           on navigationProperty1.parent = $self;

            // 1:1 navigation property
            navigationProperty2 :      Composition of one AssociatedEntities2;
    }

    entity AssociatedEntities2 {
        key ID     : String;
            parent : Association to one AssociatedEntities1;
            // primitive property
            value  : Integer;
    }
}
