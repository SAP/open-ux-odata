module.exports = {
    executeAction: async function (actionDefinition, actionData, keys, odataRequest) {
        const actionName = actionDefinition.name;

        // Bound Action - Apply Discount
        if (actionName === 'ApplyDiscount') {
            const discountPercent = parseFloat(actionData.DiscountPercent);

            // Validation
            if (discountPercent < 0 || discountPercent > 50) {
                this.throwError('Invalid discount', 400, {
                    error: {
                        code: 'INVALID_DISCOUNT',
                        message: 'Discount must be between 0 and 50 percent',
                        target: 'DiscountPercent'
                    }
                });
            }

            // Calculate new amount
            const originalAmount = parseFloat(actionData.in.TotalAmount);
            const discountAmount = originalAmount * (discountPercent / 100);
            const newAmount = originalAmount - discountAmount;

            // Update items proportionally
            const itemInterface = await this.base.getEntityInterface('SalesOrderItems');
            const items = (await itemInterface.getAllEntries(odataRequest)).filter(
                (item) => item.OrderID === actionData.in.OrderID
            );

            for (const item of items) {
                const itemDiscount = parseFloat(item.Amount) * (discountPercent / 100);
                await itemInterface.updateEntry(
                    { OrderID: item.OrderID, ItemNo: item.ItemNo },
                    {
                        Amount: (parseFloat(item.Amount) - itemDiscount).toFixed(2),
                        DiscountApplied: discountPercent
                    },
                    odataRequest
                );
            }

            await this.base.updateEntry(
                keys,
                {
                    TotalAmount: newAmount.toFixed(2)
                },
                odataRequest
            );

            return {
                ...actionData,
                TotalAmount: newAmount.toFixed(2),
                DiscountPercent: discountPercent,
                DiscountAmount: discountAmount.toFixed(2),
                LastModified: new Date().toISOString()
            };
        }

        // Bound Action - Confirm Order
        if (actionName === 'ConfirmOrder') {
            // Validate order can be confirmed
            if (actionData.in.Status === 'CONFIRMED') {
                this.throwError('Order already confirmed', 409);
            }

            await this.base.updateEntry(
                keys,
                {
                    Status: 'CONFIRMED'
                },
                odataRequest
            );

            // Confirm order
            return {
                ...actionData,
                Status: 'CONFIRMED',
                ConfirmedAt: new Date().toISOString(),
                ConfirmedBy: odataRequest.tenantId || 'SYSTEM'
            };
        }
    }
};
