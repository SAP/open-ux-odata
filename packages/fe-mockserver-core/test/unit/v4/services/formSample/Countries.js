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
    async onAfterRead(data, odataRequest) {
        if (odataRequest.allParams.get('$yolo') === 'true') {
            return [
                {
                    Country_Code: 'IN',
                    Name: 'India',
                    PeopleCount: 70000000,
                    PeopleCountStr: '70000000',
                    SpokenLanguages: ['Indian Dialects', 'English'],
                    MainLanguage: 'Indian Dialects',
                    IsHot: true,
                    SuperHeroCount: 70
                },
                {
                    Country_Code: 'US',
                    Name: 'U S A',
                    PeopleCount: 70,
                    PeopleCountStr: '70',
                    SpokenLanguages: ['English'],
                    MainLanguage: 'English',
                    IsHot: false,
                    SuperHeroCount: 7
                },
                {
                    Country_Code: 'FR',
                    Name: 'France',
                    PeopleCount: 1,
                    PeopleCountStr: '1',
                    SpokenLanguages: ['French'],
                    MainLanguage: 'French',
                    IsHot: false,
                    SuperHeroCount: 0
                }
            ];
        }
        return data;
    },
    async getAllEntries() {
        const results = await this.base.getAllEntries();
        results.forEach((result) => {
            result.SuperHeroCount = Math.floor(result.PeopleCount / 10);
        });
        return results;
    }
};
