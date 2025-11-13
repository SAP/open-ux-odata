module.exports = {
    hasCustomAggregate: function (sCustomAggregate) {
        if (sCustomAggregate === 'CreditScore') {
            return true;
        }
        return false;
    },
    performCustomAggregate: function (sCustomAggregate, aDataToAggregate) {
        let sumMulti = 0;
        aDataToAggregate.forEach((value) => {
            sumMulti += value['CreditScore'] * 5;
        });
        return sumMulti;
    },
    executeAction: async function (actionDef, actionData, keys, odataRequest) {
        if (actionDef.name === 'UnBlockBusinessPartner') {
            if (actionData.PaymentBlockingReason) {
                var oCustomer = {};
                for (var keyName in keys) {
                    oCustomer[keyName] = keys[keyName];
                }
                oCustomer.PaymentBlockingReason = actionData.PaymentBlockingReason;
                oCustomer.BusinessPartnerIsBlocked = false;
                return oCustomer;
            }
        }
    }
};
