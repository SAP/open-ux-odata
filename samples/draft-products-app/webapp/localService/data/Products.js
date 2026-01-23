module.exports = {
    onDraftPrepare: function (actionDefinition, objectValue, keys, odataRequest) {
        if (actionDefinition.name === 'draftPrepare') {
            // Validation logic
            const errors = [];

            if (!objectValue.Name || objectValue.Name.length < 3) {
                errors.push({
                    code: 'NAME_TOO_SHORT',
                    message: 'Product name must be at least 3 characters long',
                    severity: 'error',
                    target: 'Name'
                });
            }

            if (parseFloat(objectValue.Price) <= 0) {
                errors.push({
                    code: 'INVALID_PRICE',
                    message: 'Price must be greater than zero',
                    severity: 'error',
                    target: 'Price'
                });
            }

            // Warning for low stock
            if (objectValue.StockQuantity < 10) {
                errors.push({
                    code: 'LOW_STOCK',
                    message: 'Stock quantity is below minimum threshold',
                    severity: 'warning',
                    target: 'StockQuantity'
                });
            }

            const hasErrors = errors.some((m) => m.severity === 'error');
            if (hasErrors) {
                this.throwError('Draft validation failed', 500, {
                    error: {
                        code: 'DRAFT_VALIDATION_FAILED',
                        message: 'Cannot activate draft due to validation errors',
                        details: errors
                    }
                });
            }
        }
    }
};
