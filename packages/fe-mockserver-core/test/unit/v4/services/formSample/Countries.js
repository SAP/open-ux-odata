module.exports = {
    getInitialDataSet() {
        return require('./Countries.json');
    },
    async fetchEntries(keyValues) {
        const results = await this.base.fetchEntries(keyValues);
        results.forEach((result) => {
            result.SuperHeroCount = Math.floor(result.PeopleCount / 10);
        });
        return results;
    },
    async getAllEntries() {
        const results = await this.base.getAllEntries();
        results.forEach((result) => {
            result.SuperHeroCount = Math.floor(result.PeopleCount / 10);
        });
        return results;
    }
};
