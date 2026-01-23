module.exports = {
    async onAfterRead(data, odataRequest) {
        const filters = odataRequest.queryOptions?.$filter;

        if (filters && filters.includes('CompanyCode')) {
            const match = filters.match(/CompanyCode eq '([^']+)'/);
            const companyCode = match ? match[1] : null;

            if (companyCode) {
                return data.filter((org) => org.CompanyCode === companyCode);
            }
        }

        return data;
    }
};
