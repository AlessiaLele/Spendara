const Budget = require('../models/Budget');

function getMonthYearFromBodyOrNow(body) {
    const now = new Date();
    return {
        month: body.month ?? now.getMonth(),
        year: body.year ?? now.getFullYear(),
    };
}

async function getBudgetByMonth(req, res) {
    try {
        const userId = req.user._id;
        const now = new Date();
        const month = Number(req.query.month ?? now.getMonth());
        const year = Number(req.query.year ?? now.getFullYear());

        const budget = await Budget.findOne({ userId, month, year });

        return res.json({ budget });
    } catch (error) {
        return res.status(500).json({ message: 'Errore nel recupero budget' });
    }
}

async function upsertMonthlyBudget(req, res) {
    try {
        const userId = req.user._id;
        const { month, year } = getMonthYearFromBodyOrNow(req.body);
        const totalBudget = Number(req.body.totalBudget);

        if (!Number.isFinite(totalBudget) || totalBudget < 0) {
            return res.status(400).json({ message: 'Importo budget non valido' });
        }

        const categoryBudgets = Array.isArray(req.body.categoryBudgets)
            ? req.body.categoryBudgets
            : [];

        const budget = await Budget.findOneAndUpdate(
            { userId, month, year },
            {
                $set: {
                    totalBudget,
                    categoryBudgets,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    userId,
                    month,
                    year,
                }
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            message: 'Budget salvato correttamente',
            budget,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Errore nel salvataggio budget' });
    }
}

module.exports = {
    getBudgetByMonth,
    upsertMonthlyBudget,
};