// controllers/budgetController.js
const Budget = require('../models/Budget');

// GET budget corrente
const getCurrentBudget = async (req, res) => {
    const now = new Date();

    const budget = await Budget.findOne({
        userId: req.user.id,
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    res.json(budget || null);
};

// CREATE / UPDATE budget
const setBudget = async (req, res) => {
    const { totalBudget, categoryBudgets } = req.body;
    const now = new Date();

    let budget = await Budget.findOne({
        userId: req.user.id,
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    if (budget) {
        budget.totalBudget = totalBudget;
        budget.categoryBudgets = categoryBudgets || [];
        await budget.save();
    } else {
        budget = await Budget.create({
            userId: req.user._id,
            month: now.getMonth(),
            year: now.getFullYear(),
            totalBudget,
            categoryBudgets: categoryBudgets || [],
        });
    }

    res.json(budget);
};

module.exports = {
    getCurrentBudget,
    setBudget
};