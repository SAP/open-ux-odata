sap.ui.define(['./BaseController', 'sap/m/MessageToast'], function (BaseController, MessageToast) {
    'use strict';

    return BaseController.extend('sap.fe.mockserver.functioncross.controller.Main', {
        /**
         * Execute action on first service (default model)
         */
        onExecuteFirstServiceAction: function () {
            const oModel = this.getView().getModel(); // Default model = first service
            const actionPath = '/RootEntity(ID=1,IsActiveEntity=true)/sap.fe.test.TestService.myCustomAction(...)';

            const actionBinding = oModel.bindContext(actionPath);

            actionBinding
                .invoke()
                .then(() => {
                    MessageToast.show('Action executed successfully on First Service');
                    // update both tables
                    const table1 = this.getView().byId('table1');
                    const table2 = this.getView().byId('table2');
                    table1.getBinding('items').refresh();
                    table2.getBinding('items').refresh();
                })
                .catch((error) => {
                    MessageToast.show('Action failed on First Service: ' + error.message);
                    console.error('First service action error:', error);
                });
        },

        /**
         * Execute action on second service (secondService model)
         */
        onExecuteSecondServiceAction: function () {
            const oModel = this.getView().getModel('secondService'); // Named model = second service
            const actionPath = '/RootEntity(ID=1,IsActiveEntity=true)/sap.fe.test.TestService.myCustomAction(...)';

            const actionBinding = oModel.bindContext(actionPath);

            actionBinding
                .invoke()
                .then(() => {
                    MessageToast.show('Action executed successfully on Second Service');
                })
                .catch((error) => {
                    MessageToast.show('Action failed on Second Service: ' + error.message);
                    console.error('Second service action error:', error);
                });
        },

        /**
         * Add new entry using cross-service communication
         */
        onAddCrossServiceEntry: function () {
            const oModel = this.getView().getModel(); // Default model = first service
            const actionPath = '/RootEntity(ID=1,IsActiveEntity=true)/sap.fe.test.TestService.myCustomAction(...)';

            const actionBinding = oModel.bindContext(actionPath);

            // Set parameter to indicate this should trigger addEntry
            actionBinding.setParameter('operation', 'addEntry');

            actionBinding
                .invoke()
                .then(() => {
                    MessageToast.show('New entry added via cross-service communication');
                    // Refresh both tables to show the new entry
                    const table1 = this.getView().byId('table1');
                    const table2 = this.getView().byId('table2');
                    table1.getBinding('items').refresh();
                    table2.getBinding('items').refresh();
                })
                .catch((error) => {
                    MessageToast.show('Cross-service add failed: ' + error.message);
                    console.error('Cross-service add error:', error);
                });
        }
    });
});
