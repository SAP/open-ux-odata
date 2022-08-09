module.exports = {
    getInitialDataSet: function () {
        const data = [];
        for (let i = 0; i < 50; i++) {
            data.push({
                ID: i,
                name: 'Element ' + i,
                description: 'Element description for ' + i,
                IsActiveEntity: true
            });
        }
        return data;
    },
    executeAction: function (actionDefinition, actionData, keys) {
        console.log('Updating the data for ' + JSON.stringify(keys));
        if (keys.ID === '1') {
            this.throwError('Testing Error', 400, { error: { message: 'Not Allowed on this object', code: '123' } });
        } else {
            this.base.updateEntry(keys, { description: 'My Custom Description' });
        }
    }
};
