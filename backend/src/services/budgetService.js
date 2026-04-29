import Budget from "../models/Budget.js";

// GET budget corrente
export const getCurrentBudget = async (req, res) => {
    const now = new Date();

    const budget = await Budget.findOne({
        userId: req.user.id,
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    res.json(budget || null);
};

// CREATE / UPDATE budget
export const setBudget = async (req, res) => {
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
            userId: req.user.id,
            month: now.getMonth(),
            year: now.getFullYear(),
            totalBudget,
            categoryBudgets: categoryBudgets || [],
        });
    }

    res.json(budget);
};