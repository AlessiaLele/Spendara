const mongoose = require('mongoose');

const categoryBudgetSchema = new mongoose.Schema({
    category: { type: String, required: true },
    limit: { type: Number, required: true, min: 0 },
}, { _id: false });

const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 0, max: 11 },
    year: { type: Number, required: true },
    totalBudget: { type: Number, required: true, min: 0 },
    categoryBudgets: [categoryBudgetSchema],
}, {
    timestamps: true,
});

budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);