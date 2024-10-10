const path = require('path');
const fs = require('fs');

module.exports = {
    /**
     * This function returns the initial dataset for the WorkstationSet entity.
     * It reads the content from the corresponding JSON file and returns it as an array of objects.
     * @param {string} contextId - Represents the tenant id for the current request (optional).
     * @param {string} fileName - The name of the file to load with full path.
     * @param {string} currentDir - The current directory of the file.
     * @returns {Array} - The initial dataset for the WorkstationSet entity.
     */
    getInitialDataSet: function (contextId, fileName, currentDir) {
        let filePath = '';

        // Extract the base file name without extension
        const baseFileName = path.basename(fileName, path.extname(fileName)).replace(/\.js$/, '');

        // Construct the file name based on contextId
        const fileNameSuffix = contextId === 'tenant-default' ? '' : `-${contextId.replace('tenant-', '')}`;
        const jsonFileName = `${baseFileName}${fileNameSuffix}.json`;

        // Construct the full file path (from current directory)
        filePath = path.join(currentDir, jsonFileName);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            // try loading default file
            filePath = path.join(currentDir, `${baseFileName}.json`);
            if (!fs.existsSync(filePath)) {
                console.warn(`File not found: ${filePath}`);
                return [];
            }
        }

        // Read and parse the JSON file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        return data;
    }
};
