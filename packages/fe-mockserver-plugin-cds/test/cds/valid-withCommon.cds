using {cuid, managed, Currency} from '@sap/cds/common';

namespace sap.fe.mockserver;

service ValidCDSWithCommon {
	entity RootElement : cuid {
        Prop1 : String @Common.Label : 'First Prop';
        Prop2 : String @Common.Label : 'Second Propy';
        isBoundAction1Hidden : Boolean @Common.Label : 'Bound Action 1 Hidden';
        isBoundAction2Hidden : Boolean @Common.Label : 'Bound Action 2 Hidden';
        isBoundAction3Hidden : Boolean @Common.Label : 'Bound Action 3 Hidden';
        Currency     : Currency;
    };
}