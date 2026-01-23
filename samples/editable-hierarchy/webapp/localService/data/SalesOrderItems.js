module.exports = {
    executeAction: async function (actionDefinition, actionData, keys, odataRequest) {
        if (actionDefinition.name === 'MoveToAnotherOrder') {
            const newOrderID = actionData.NewOrderID;
            const oldOrderID = keys.OrderID;
            const itemNo = keys.ItemNo;

            const orderInterface = await this.base.getEntityInterface('SalesOrders');
            const newOrder = orderInterface.fetchEntries({ OrderID: newOrderID });

            if (!newOrder) {
                this.throwError('Target order does not exist', 404, {
                    error: {
                        code: 'ORDER_NOT_FOUND',
                        message: `Order ${newOrderID} not found`
                    }
                });
            }

            const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
            await itemInterface.updateEntry(keys, { OrderID: newOrderID });

            const scheduleInterface = await this.base.getEntityInterface('ScheduleLines');
            const scheduleLines = scheduleInterface
                .getData()
                .filter((sl) => sl.OrderID === oldOrderID && sl.ItemNo === itemNo);

            for (const sl of scheduleLines) {
                await scheduleInterface.updateEntry(
                    {
                        OrderID: sl.OrderID,
                        ItemNo: sl.ItemNo,
                        ScheduleLineNo: sl.ScheduleLineNo
                    },
                    { OrderID: newOrderID }
                );
            }

            await this.recalculateOrderTotal(oldOrderID);
            await this.recalculateOrderTotal(newOrderID);

            return {
                ...actionData,
                OrderID: newOrderID,
                Message: `Item moved to order ${newOrderID}`
            };
        }
    },

    recalculateOrderTotal: async function (orderID) {
        const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
        const orderInterface = await this.base.getEntityInterface('SalesOrders');

        const items = itemInterface.getData().filter((item) => item.OrderID === orderID);
        const total = items.reduce((sum, item) => sum + parseFloat(item.Amount || 0), 0);

        await orderInterface.updateEntry({ OrderID: orderID }, { TotalAmount: total.toFixed(2) });
    },

    getReferentialConstraints: function (navigationProperty) {
        if (navigationProperty.name === 'ScheduleLines') {
            return [
                { sourceProperty: 'OrderID', targetProperty: 'OrderID' },
                { sourceProperty: 'ItemNo', targetProperty: 'ItemNo' }
            ];
        }
        return undefined;
    }
};
