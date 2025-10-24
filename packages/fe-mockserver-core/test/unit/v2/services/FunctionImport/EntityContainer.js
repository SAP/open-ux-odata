module.exports = {
    executeAction(actionDefinition, actionData, keys, odataRequest) {
        if (actionDefinition.name === 'ReasonOptions') {
            var instanceID = odataRequest.allParams.get('InstanceID').replace(/''/g, '');
            return [
                {
                    InstanceID: instanceID,
                    DecisionKey: 'Approve',
                    DecisionText: 'Approve',
                    CommentMandatory: false,
                    Nature: 'POSITIVE'
                },
                {
                    InstanceID: instanceID,
                    DecisionKey: 'Reject',
                    DecisionText: 'Reject',
                    CommentMandatory: true,
                    Nature: 'NEGATIVE'
                }
            ];
        } else {
            this.throwError('Unsupported Action');
        }
    }
};
