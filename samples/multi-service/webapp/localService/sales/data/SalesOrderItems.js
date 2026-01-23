module.exports = {
    async onBeforeUpdateEntry(keys, data, odataRequest) {
        console.log('🔍 Validating new sales order item...');

        // Validate product exists in product master
        const productService = await this.base.getEntityInterface('Products', 'products');

        if (!productService) {
            this.throwError('Product service unavailable', 503, {
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Product master service is not available'
                }
            });
        }

        const product = await productService.fetchEntries({ ProductID: data.ProductID }, odataRequest);

        if (!product.length) {
            this.throwError('Invalid product', 400, {
                error: {
                    code: 'INVALID_PRODUCT',
                    message: `Product ${data.ProductID} does not exist in product master`,
                    target: 'ProductID'
                }
            });
        }

        // Validate stock availability
        if (product.StockQuantity < parseFloat(data.Quantity)) {
            this.throwError('Insufficient stock', 400, {
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: `Only ${product.StockQuantity} units available. Requested: ${data.Quantity}`,
                    target: 'Quantity'
                }
            });
        }

        // Auto-fill data from product master
        data.Description = product.ProductName;
        data.UnitPrice = product.Price;
        data.Amount = (parseFloat(product.Price) * parseFloat(data.Quantity)).toFixed(2);

        // Get currency from value help if not specified
        if (!data.CurrencyCode) {
            const currencyService = await this.base.getEntityInterface('Currencies', 'valuehelp');
            const defaultCurrency = (await currencyService?.getAllEntries()).find((c) => c.IsDefault);
            data.CurrencyCode = defaultCurrency?.CurrencyCode || 'USD';
        }

        console.log('✅ Item validated successfully');
    },

    async onAfterUpdateEntry(keys, data, odataRequest) {
        // Update stock in product service
        const productService = await this.base.getEntityInterface('Products', 'products');
        const product = (await productService.fetchEntries({ ProductID: data.ProductID }))[0];

        if (product) {
            let qtyToRemove = parseFloat(data.Quantity);
            if (isNaN(qtyToRemove)) {
                qtyToRemove = 0;
            }
            const newStock = product.StockQuantity - qtyToRemove;
            await productService.updateEntry(
                { ProductID: data.ProductID },
                {
                    StockQuantity: newStock,
                    LastModified: new Date().toISOString()
                }
            );
            console.log(`📦 Stock updated for ${data.ProductID}: ${newStock} units remaining`);
        }
    }
};
