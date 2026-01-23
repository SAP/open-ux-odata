module.exports = {
    executeAction: async function (actionDefinition, actionData, keys, odataRequest) {
        const actionName = actionDefinition.name;

        // Factory Action - Create order from template
        if (actionName === 'CreateOrderFromTemplate') {
            const orderInterface = await this.base.getEntityInterface('SalesOrders');
            const templateInterface = await this.base.getEntityInterface('OrderTemplates');

            // Get template
            const template = (
                await templateInterface?.fetchEntries({
                    TemplateID: actionData.TemplateID
                })
            )[0];

            if (!template) {
                this.throwError('Template not found', 404);
            }

            // Generate new order ID
            const existingOrders = await orderInterface.getAllEntries(odataRequest);
            const maxID = Math.max(...existingOrders.map((o) => parseInt(o.OrderID.replace('SO-', ''))), 0);
            const newOrderID = `SO-${String(maxID + 1).padStart(6, '0')}`;

            // Create order
            const newOrder = {
                OrderID: newOrderID,
                CustomerID: actionData.CustomerID,
                OrderDate: new Date().toISOString().split('T')[0],
                TotalAmount: template.DefaultAmount || '0.00',
                CurrencyCode: template.Currency || 'USD',
                Status: 'NEW',
                CreatedBy: odataRequest.tenantId || 'SYSTEM',
                CreatedAt: new Date().toISOString()
            };

            const created = await orderInterface.addEntry(newOrder);

            // Copy template items if they exist
            if (template.Items) {
                const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
                for (const templateItem of template.Items) {
                    const index = template.Items.indexOf(templateItem);
                    await itemInterface.addEntry({
                        OrderID: newOrderID,
                        ItemNo: String((index + 1) * 10).padStart(6, '0'),
                        ProductID: templateItem.ProductID,
                        Quantity: templateItem.Quantity,
                        UnitPrice: templateItem.UnitPrice,
                        Amount: (parseFloat(templateItem.Quantity) * parseFloat(templateItem.UnitPrice)).toFixed(2)
                    });
                }
            }

            return created;
        }

        // Static Function - Get statistics
        if (actionName === 'GetOrderStatistics') {
            const orderInterface = await this.base.getEntityInterface('SalesOrders');
            const orders = orderInterface.getData();

            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.TotalAmount), 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Find top customer
            const customerTotals = orders.reduce((acc, order) => {
                acc[order.CustomerID] = (acc[order.CustomerID] || 0) + parseFloat(order.TotalAmount);
                return acc;
            }, {});

            const topCustomer = Object.entries(customerTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            return {
                TotalOrders: totalOrders,
                TotalRevenue: totalRevenue.toFixed(2),
                AverageOrderValue: avgOrderValue.toFixed(2),
                TopCustomer: topCustomer
            };
        }
    }
};
