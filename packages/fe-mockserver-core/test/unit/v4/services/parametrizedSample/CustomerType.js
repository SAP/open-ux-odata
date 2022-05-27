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
    }
};
