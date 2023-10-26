service TestService {
    @Session.StickySessionSupported: {
        $Type        : 'Session.StickySessionSupportedType',
        NewAction    : 'TestService.Create',
        EditAction   : 'TestService.PrepareForEdit',
        SaveAction   : 'TestService.Save',
        DiscardAction: 'TestService.EntityContainer/Discard'
    }
    entity Root {
        key ID   : Integer @Core.Computed;
            data : String;
    } actions {
        @cds.odata.bindingparameter.collection
        action Create()         returns Root;
        action PrepareForEdit() returns Root;
        action Save()           returns Root;
    };

    action Discard();
}
