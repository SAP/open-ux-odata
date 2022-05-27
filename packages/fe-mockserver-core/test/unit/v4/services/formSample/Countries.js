module.exports = {
    getInitialDataSet() {
        return require('./Countries.json');
    },
    fetchEntries(keyValues) {
        const results = this.base.fetchEntries(keyValues);
        results.forEach((result) => {
            result.SuperHeroCount = Math.floor(result.PeopleCount / 10);
        });
        return results;
    },
    getAllEntries() {
        const results = this.base.getAllEntries();
        results.forEach((result) => {
            result.SuperHeroCount = Math.floor(result.PeopleCount / 10);
        });
        return results;
    }
};
