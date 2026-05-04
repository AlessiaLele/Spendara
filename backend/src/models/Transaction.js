const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    source: {
        type: String,
        enum: ['cash', 'bank', 'demo'],
        required: true,
        default: 'cash',
        index: true
    },

    provider: { type: String, default: null, index: true },
    externalTransactionId: { type: String, default: null, index: true },

    accountId: { type: String, default: null, index: true },
    accountName: { type: String, default: null },

    amount: { type: Number, required: true },
    currencyCode: { type: String, default: 'EUR' },
    description: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    category: { type: String, default: 'Uncategorized', index: true },

    manualOverride: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

transactionSchema.index(
    { userId: 1, provider: 1, externalTransactionId: 1 },
    { unique: true, sparse: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);