const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
            externalTransactionId: { type: String, default: ''},
            accountId: { type: String, default: ''},
            amount: { type: Number, required: true },
            currencyCode: { type: String, default: 'EUR' },
            description: { type: String, default: '' },
            date: { type: Date, required: true },
            category: { type: String, default: 'Uncategorized'},
            source: { type: String, enum: ['bank', 'cash', 'simulated' ], default: 'bank'}
    },
    { timestamps: true }
);

transactionSchema.index(
    { userId: 1, externalTransactionId: 1 },
    { unique: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);