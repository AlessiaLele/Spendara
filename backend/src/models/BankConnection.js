const mongoose = require('mongoose');

const bankConnectionSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        provider: { type: String, required: true, default: 'tink', index: true },
        tinkUserId: { type: String, default: null },

        accessToken: { type: String, default: null },
        refreshToken: { type: String, default: null },
        tokenExpiresAt: { type: Date, default: null },

        status: {
                type: String,
                enum: ['pending', 'connected', 'failed', 'disconnected'],
                default: 'pending',
                index: true
        },

        linkedAccounts: {
                type: [
                        {
                                id: { type: String, required: true },
                                name: { type: String, default: 'Conto' },
                                balance: { type: Number, default: 0 },
                                currencyCode: { type: String, default: 'EUR' }
                        }
                ],
                default: []
        },

        lastSyncAt: { type: Date, default: null },
        lastSyncError: { type: String, default: null },
        syncCursor: { type: String, default: null }
}, { timestamps: true });

bankConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('BankConnection', bankConnectionSchema);