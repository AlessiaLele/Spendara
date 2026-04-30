// models/Budget.js
const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: Number,
    year: Number,
    totalBudget: Number,
    categoryBudgets: Array
});

module.exports =
    mongoose.models.Budget ||
    mongoose.model('Budget', budgetSchema);