module.exports = {
    async fetchEntries(params, odataRequest) {
        const results = await this.executeAnalytics(params, odataRequest);
        return {
            ...params,
            Results: results
        };
    },

    async executeAnalytics(params, odataRequest) {
        // Get source data
        const orderService = await this.base.getEntityInterface('SalesOrders', 'source');
        if (!orderService) {
            console.warn('⚠️ Source service not available');
            return [];
        }

        let orders = await orderService.fetchEntries({ CompanyCode: params['P_CompanyCode'] }, odataRequest);

        // Transform to analytics format
        return orders.map((order, index) => ({
            ID: `${params.ParameterID}-${index}`,
            OrderID: order.OrderID,
            CustomerID: order.CustomerID,
            CustomerName: order.CustomerName || 'Unknown',
            OrderDate: order.OrderDate,
            TotalAmount: order.TotalAmount,
            CurrencyCode: order.CurrencyCode,
            Status: order.Status,
            CompanyCode: order.CompanyCode,
            SalesOrganization: order.SalesOrganization
        }));
    }
};
