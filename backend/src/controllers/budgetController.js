const Budget = require('../models/Budget');
const BudgetHistory = require('../models/BudgetHistory');
const { normalizeCategory } = require('../utils/normalizeCategory');

function parseMonthYear(input = {}) {
    const now = new Date();

    const month = input.month === undefined ? now.getMonth() : Number(input.month);
    const year = input.year === undefined ? now.getFullYear() : Number(input.year);

    if (!Number.isInteger(month) || month < 0 || month > 11) {
        throw new Error('Mese non valido');
    }

    if (!Number.isInteger(year) || year < 2000) {
        throw new Error('Anno non valido');
    }

    return { month, year };
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return false;
}

function getRawCategoryValue(category) {
    if (typeof category !== 'string') return 'all';
    return category.trim().toLowerCase();
}

function isGlobalCategory(category) {
    const raw = getRawCategoryValue(category);

    return (
        raw === 'all' ||
        raw === 'tutte' ||
        raw === 'tutte le categorie' ||
        raw === 'tutte le categoria' ||
        raw === 'tutte categorie'
    );
}

async function getBudgetHistory(req, res) {
    try {
        const userId = req.user._id;
        const { month, year } = parseMonthYear(req.query);

        const history = await BudgetHistory.find({ userId, month, year })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ history });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function getBudgetByMonth(req, res) {
    try {
        const userId = req.user._id;
        const { month, year } = parseMonthYear(req.query);

        const budget = await Budget.findOne({ userId, month, year }).lean();

        return res.json({ budget });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

async function upsertMonthlyBudget(req, res) {
    try {
        const userId = req.user._id;
        const { month, year } = parseMonthYear(req.body);

        const amount = Number(req.body.amount ?? req.body.totalBudget);
        const category = isGlobalCategory(req.body.category)
            ? 'all'
            : normalizeCategory(req.body.category);

        const warningThresholdRaw = req.body.warningThreshold ?? 0.8;
        const criticalThresholdRaw = req.body.criticalThreshold ?? 0.95;

        const warningThreshold = Number(warningThresholdRaw);
        const criticalThreshold = Number(criticalThresholdRaw);
        const carryOverEnabled = parseBoolean(req.body.carryOverEnabled);

        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ message: 'Importo budget non valido' });
        }

        if (
            !Number.isFinite(warningThreshold) ||
            !Number.isFinite(criticalThreshold) ||
            warningThreshold < 0 ||
            criticalThreshold < 0 ||
            warningThreshold >= criticalThreshold ||
            criticalThreshold > 1
        ) {
            return res.status(400).json({
                message: 'Le soglie budget non sono valide'
            });
        }

        let budget = await Budget.findOne({ userId, month, year });
        const previousSnapshot = budget ? budget.toObject() : null;

        if (!budget) {
            budget = new Budget({
                userId,
                month,
                year,
                totalBudget: 0,
                categoryBudgets: [],
                warningThreshold,
                criticalThreshold,
                carryOverEnabled
            });
        }

        if (category === 'all') {
            budget.totalBudget = amount;
        } else {
            const categoryBudgets = Array.isArray(budget.categoryBudgets)
                ? budget.categoryBudgets
                : [];

            const normalizedCategory = normalizeCategory(category).toLowerCase();

            const cleanedCategoryBudgets = categoryBudgets
                .filter(item => normalizeCategory(item.category ?? item.name) !== 'all')
                .filter((item, index, arr) => {
                    const key = normalizeCategory(item.category ?? item.name).toLowerCase();
                    return (
                        arr.findIndex(
                            x => normalizeCategory(x.category ?? x.name).toLowerCase() === key
                        ) === index
                    );
                });

            const existingIndex = cleanedCategoryBudgets.findIndex(
                item => normalizeCategory(item.category ?? item.name).toLowerCase() === normalizedCategory
            );

            const updatedItem = {
                category: normalizeCategory(category),
                limit: amount
            };

            if (existingIndex >= 0) {
                cleanedCategoryBudgets[existingIndex] = {
                    ...cleanedCategoryBudgets[existingIndex],
                    ...updatedItem
                };
            } else {
                cleanedCategoryBudgets.push(updatedItem);
            }

            budget.categoryBudgets = cleanedCategoryBudgets;
        }

        budget.warningThreshold = warningThreshold;
        budget.criticalThreshold = criticalThreshold;
        budget.carryOverEnabled = carryOverEnabled;

        await budget.save();

        await BudgetHistory.create({
            userId,
            budgetId: budget._id,
            month,
            year,
            previousSnapshot,
            currentSnapshot: budget.toObject(),
            changedAt: new Date()
        });

        return res.status(200).json({
            message: 'Budget salvato correttamente',
            budget
        });
    } catch (error) {
        console.error('ERRORE upsertMonthlyBudget:', error);
        return res.status(400).json({
            message: error.message || 'Errore nel salvataggio budget'
        });
    }
}

module.exports = {
    getBudgetByMonth,
    getBudgetHistory,
    upsertMonthlyBudget
};