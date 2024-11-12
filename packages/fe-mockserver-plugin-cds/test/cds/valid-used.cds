using {sap.fe.mockserver.ValidCDS as ValidCDS} from './valid';

 annotate ValidCDS.RootElement with @(UI : {LineItem : [
    {Value : ID},
    {Value : BooleanProperty},
    {Value : TextArrangementTextFirstProperty},
    {Value : PropertyWithValueHelp},
    {Value : PropertyWithCurrency}
  ]});