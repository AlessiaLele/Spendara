const mongoose = require('mongoose');

const bankConnectionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        provider: { type: String, default: 'tink' },
        tinkUserId: { type: String, default: '' },
        accessToken: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'connected', 'failed'], default: 'pending' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('BankConnection', bankConnectionSchema);