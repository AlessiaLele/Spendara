const mongoose = require('mongoose');

const categoryBudgetSchema = new mongoose.Schema({
    category: { type: String, required: true, trim: true },
    limit: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 0, max: 11 },
    year: { type: Number, required: true },
    totalBudget: { type: Number, required: true, min: 0, default: 0 },
    categoryBudgets: { type: [categoryBudgetSchema], default: [] },
    warningThreshold: { type: Number, default: 0.8, min: 0, max: 1 },
    criticalThreshold: { type: Number, default: 0.95, min: 0, max: 1 },
}, { timestamps: true });
budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);