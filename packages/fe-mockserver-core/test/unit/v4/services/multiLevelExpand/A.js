module.exports = {
    getReferentialConstraints(navigationDetail) {
        if (navigationDetail.name === '_toComposition') {
            return [
                {
                    sourceProperty: '_toComposition_ID',
                    targetProperty: 'othervalue'
                }
            ];
        }
    }
};
