service TestService {
    entity Entity {
            @Common.Label      : 'Key' // string
            @UI.Hidden         : true // boolean
            @Validation.Minimum: 10 // number
        key ID : Integer;
    }
}

annotate TestService.Entity with @(UI.Identification: [{
    $Type                              : 'UI.DataField',
    Value                              : ID,
    ![@Common.Heading]                 : 'Text',
    ![@UI.Hidden]                      : true,
    ![@Analytics.RolledUpPropertyCount]: 11,
}, ]);
