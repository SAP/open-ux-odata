const base = require('../base');
module.exports = {
    /**
     * This function returns the initial dataset for the WorkstationSet entity.
     * It reads the content from the corresponding JSON file and returns it as an array of objects.
     * @param {string} contextId - Represents the tenant id for the current request (optional).
     * @returns {Array} - The initial dataset for the WorkstationSet entity.
     */
    getInitialDataSet: function (contextId) {
        return base.getInitialDataSet(contextId, __filename, __dirname);
    }
};
