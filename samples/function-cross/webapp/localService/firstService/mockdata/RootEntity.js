module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        'use strict';
        console.log('Updating the data for ' + JSON.stringify(keys));
        this.base.updateEntry(keys, { description: 'My Custom Description' });

        // Cross-service update - update an entry in the second service using alias
        this.base
            .getEntityInterface('RootEntity', 'service2')
            .then(function (secondServiceEntityInterface) {
                if (secondServiceEntityInterface) {
                    return secondServiceEntityInterface.updateEntry(keys, {
                        description: 'Updated from First Service at ' + new Date().toISOString()
                    });
                }
            })
            .then(function () {
                console.log('Successfully updated entity in second service');
            })
            .catch(function (error) {
                console.error('Error updating second service:', error.message);
            });
    }
};
