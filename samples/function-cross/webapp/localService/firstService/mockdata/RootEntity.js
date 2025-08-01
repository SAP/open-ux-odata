module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        'use strict';
        // Check if this is an addEntry operation
        if (actionData && actionData.operation === 'addEntry') {
            return this.addCrossServiceEntry();
        }
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
    },

    // Method for adding cross-service entries
    addCrossServiceEntry: function () {
        'use strict';
        // First add to the current (first) service
        const newEntryData = {
            name: 'Cross-Service Entry ' + Math.floor(Math.random() * 1000),
            description: 'Added from First Service at ' + new Date().toISOString()
        };

        console.log('Adding entry to first service:', newEntryData);
        const firstServiceEntry = this.base.addEntry(newEntryData);
        // Then add to the second service using cross-service addEntry
        this.base
            .getEntityInterface('RootEntity', 'service2')
            .then(function (secondServiceEntityInterface) {
                if (secondServiceEntityInterface) {
                    console.log('Adding entry to second service via cross-service:', newEntryData);
                    return secondServiceEntityInterface.addEntry({
                        name: 'Cross-Service Entry ' + Math.floor(Math.random() * 1000),
                        description: 'Added from First Service at ' + new Date().toISOString()
                    });
                }
            })
            .then(function (newEntry) {
                console.log('Successfully added new entry to second service:', newEntry);
                return newEntry;
            })
            .catch(function (error) {
                console.error('Error adding entry to second service:', error.message);
            });

        return firstServiceEntry;
    }
};
