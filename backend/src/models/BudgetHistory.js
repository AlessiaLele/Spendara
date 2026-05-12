const mongoose = require('mongoose');

const budgetHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Budget',
            required: true,
            index: true
        },
        month: { type: Number, required: true, min: 0, max: 11 },
        year: { type: Number, required: true },
        previousSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
        currentSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
        changedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

budgetHistorySchema.index({ userId: 1, year: 1, month: 1, createdAt: -1 });

module.exports = mongoose.model('BudgetHistory', budgetHistorySchema);