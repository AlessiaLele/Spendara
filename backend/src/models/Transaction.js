const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        externalTransactionId: {
            type: String,
            default: null
        },
        accountId: {
            type: String,
            default: null
        },
        amount: {
            type: Number,
            required: true
        },
        currencyCode: {
            type: String,
            default: 'EUR'
        },
        description: {
            type: String,
            default: ''
        },
        date: {
            type: Date,
            required: true,
            index: true
        },
        category: {
            type: String,
            default: 'Non categorizzato'
        },
        source: {
            type: String,
            enum: ['bank', 'cash', 'simulated'],
            default: 'bank',
            index: true
        }
    },
    { timestamps: true }
);

transactionSchema.index(
    { userId: 1, externalTransactionId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            source: 'bank',
            externalTransactionId: { $type: 'string', $ne: '' }
        }
    }
);

module.exports = mongoose.model('Transaction', transactionSchema);