module.exports = {
    executeAction: function (actionDefinition, actionData, keys) {
        console.log('Updating the data for ' + JSON.stringify(keys));
        this.base.updateEntry(keys, { description: 'My Custom Description' });
        // update a entry from second service, is it possible?
    }
};
