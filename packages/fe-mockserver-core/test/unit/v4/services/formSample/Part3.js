module.exports = {
    getDefaultElement() {
        return this.base.getDefaultElement();
    },
    generateKey(property, lineData, mockData) {
        return this.base.generateKey(property, lineData, mockData);
    },
    updateEntry(keysValues, patchData) {
        patchData.number = patchData.number * 100;
        return this.base.updateEntry(keysValues, patchData);
    },
    executeAction: function (actionDefinition, actionData, keys) {
        console.log('Updating the data for ' + JSON.stringify(keys));
        if (keys.ID === '1') {
            this.throwError('Testing Error', 400, { error: { message: 'Not Allowed on this object', code: '123' } });
        } else {
            this.base.updateEntry(keys, { number: 1337 });
        }
    }
};
