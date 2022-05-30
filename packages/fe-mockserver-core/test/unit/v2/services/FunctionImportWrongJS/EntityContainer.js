module.exports = {
    executeAction(actionDefinition, actionData, keys, odataRequest) {
        if (actionDefinition.name === 'DecisionOptions') {
            var instanceID = odataRequest.allParams.get('InstanceID').replace(/''/g, '');
            return [
                {
                    __metadata: {
                        type: 'TASKPROCESSING.DecisionOption'
                    },
                    InstanceID: instanceID,
                    DecisionKey: 'Approve',
                    DecisionText: 'Approve',
                    CommentMandatory: false,
                    Nature: 'POSITIVE'
                },
                {
                    __metadata: {
                        type: 'TASKPROCESSING.DecisionOption'
                    },
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
