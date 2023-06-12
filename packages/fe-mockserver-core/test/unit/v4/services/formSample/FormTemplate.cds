using {
    cuid,
    managed,
    Currency
} from '@sap/cds/common';

namespace sap.fe.core;

entity FormRoot {
    key ID           : Integer @Core.Computed;
        FirstName    : String  @Common.Label :                                'First Name';
        LastName     : String  @Common.Label :                                'Last Name';
        DateOfBirth  : Date    @Common.Label :                                'Date of Birth';
        EmailAddress : String  @Communication.IsEmailAddress  @Common.Label : 'Email Address';
        _Elements    :Association to many SubElements
                                  on _Elements.owner = $self;
        SpecialOne: Composition of one SubElements;
        Currency     : Currency;
        Country      : String  @(Common : {
            Label     : 'Country of Residence',
            ValueList : {
                Label          : 'Countries',
                CollectionPath : 'Countries',
                Parameters     : [
                    {
                        $Type             : 'Common.ValueListParameterInOut',
                        LocalDataProperty : Country,
                        ValueListProperty : 'Country_Code'
                    },
                    {
                        $Type             : 'Common.ValueListParameterDisplayOnly',
                        ValueListProperty : 'Name'
                    }
                ]
            }
        });
};

entity SubElements           @(cds.autoexpose) {
    key ID       : Integer   @Core.Computed;
        Name     : String(20)@(Common : {Label : 'Name'});
        owner_ID : Integer;
        sibling_ID : Integer;
        sibling : Association to SubElements on sibling.ID = sibling_ID;
        owner    : Association to FormRoot
                       on owner.ID = owner_ID;
}

annotate SubElements with @UI : {LineItem : [{Value : Name}]};

annotate FormRoot with @UI : {
    HeaderInfo                     : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Form Entry',
        TypeNamePlural : 'Form Entries',
        Title          : {
            $Type : 'UI.DataField',
            Value : FirstName
        },
        Description    : {
            $Type : 'UI.DataField',
            Value : LastName
        },
    },
    Facets                         : [{
        $Type  : 'UI.CollectionFacet',
        Facets : [
            {
                $Type  : 'UI.CollectionFacet',
                ID     : 'GeneralInformation',
                Label  : 'General Information',
                Facets : [{
                    $Type  : 'UI.ReferenceFacet',
                    Label  : 'General Information',
                    Target : '@UI.FieldGroup#GeneralInformation'
                }]
            },
            {
                $Type  : 'UI.ReferenceFacet',
                ID     : 'SubElements',
                Label  : 'Sub Elements',
                Target : '_Elements/@UI.LineItem'

            }
        ]
    }],
    FieldGroup #GeneralInformation : {
        Label : 'General Information',
        Data  : [
            {Value : FirstName},
            {Value : LastName},
            {Value : DateOfBirth},
            {Value : EmailAddress},
            {Value : Country}
        ]
    }
};

entity Countries                         @(cds.autoexpose) {
    key Country_Code    :      String(1) @(
            Common : {
                Text            : Description,
                TextArrangement : #TextFirst
            },
            title  : 'Country Code'
        );
        Name            :      String(20)@(
            Core.Immutable : true,
            Common         : {Label : 'Name'}
        );
        SpokenLanguages : many String;
        MainLanguage : String;
        PeopleCount     :      Integer;
        SuperHeroCount  :      Integer;
        IsHot           :      Boolean;
}


entity Part1 {
    key ID    : Integer;
        part2 : Association to one Part2;
}

entity Part2 {
    key ID     : Integer;
        number : Integer;
}

entity Part3 {
    key ID     : Integer;
        number : Integer;
}

service Form {
    @odata.draft.enabled
    entity FormRoot  as projection on core.FormRoot;

    entity Countries as projection on core.Countries;
    entity Part1     as projection on core.Part1;
    entity Part2     as projection on core.Part2;
     @odata.draft.enabled
    entity Part3     as projection on core.Part3 actions {
      action boundAction1() returns Part3;
    }
     @odata.singleton
     entity MySingleton   {
       name          : String;
       prop1 : Boolean
    }
}
