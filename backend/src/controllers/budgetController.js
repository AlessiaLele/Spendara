const Budget = require('../models/Budget');

function parseMonthYear(input = {}) {
    const now = new Date();

    const month = Number.isFinite(Number(input.month))
        ? Number(input.month)
        : now.getMonth();

    const year = Number.isFinite(Number(input.year))
        ? Number(input.year)
        : now.getFullYear();

    if (month < 0 || month > 11) {
        throw new Error('Mese non valido');
    }

    return { month, year };
}

function normalizeCategory(category) {
    return String(category || 'all').trim();
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
        const { month, year } = parseMonthYear(req.body);

        const amount = Number(req.body.amount ?? req.body.totalBudget);
        const category = normalizeCategory(req.body.category);

        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ message: 'Importo budget non valido' });
        }

        let budget = await Budget.findOne({ userId, month, year });

        if (!budget) {
            budget = new Budget({
                userId,
                month,
                year,
                totalBudget: 0,
                categoryBudgets: [],
                warningThreshold: 0.8,
                criticalThreshold: 0.95,
                carryOverEnabled: false
            });
        }

        if (category === 'all') {
            budget.totalBudget = amount;
        } else {
            const normalized = category.toLowerCase();

            const existingIndex = budget.categoryBudgets.findIndex(
                item => String(item.category).trim().toLowerCase() === normalized
            );

            if (existingIndex >= 0) {
                budget.categoryBudgets[existingIndex].limit = amount;
            } else {
                budget.categoryBudgets.push({
                    category,
                    limit: amount
                });
            }
        }

        await budget.save();

        return res.status(200).json({
            message: 'Budget salvato correttamente',
            budget
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Errore nel salvataggio budget' });
    }
}

module.exports = {
    getBudgetByMonth,
    upsertMonthlyBudget
};