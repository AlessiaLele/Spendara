const { normalizeCategory } = require('../utils/normalizeCategory');

function evaluateMonthlyBudget({
                                   budget = 0,
                                   currentExpenses = 0,
                                   daysElapsed = 0,
                                   daysInMonth = 30,
                                   projectedTotalExpenses = 0,
                               }) {
    const limit = Number(budget) || 0;
    const projected = Number(projectedTotalExpenses) || 0;

    const usagePercent = limit > 0 ? Number(((projected / limit) * 100).toFixed(2)) : null;

    return {
        limit,
        currentExpenses,
        daysElapsed,
        daysInMonth,
        projectedTotalExpenses: projected,
        remaining: Number((limit - projected).toFixed(2)),
        usagePercent,
        isOverBudget: limit > 0 && projected > limit,
    };
}

function evaluateBudgetConsumption({ budget = 0, spent = 0 }) {
    const limit = Number(budget) || 0;
    const currentSpent = Number(spent) || 0;

    if (limit <= 0) {
        return {
            status: 'none',
            message: 'Nessun budget impostato.',
            spentUtilizationPct: null,
            remaining: 0,
            isOverBudget: false,
            isFullySpent: false
        };
    }

    const remaining = Number((limit - currentSpent).toFixed(2));
    const spentUtilizationPct = Number(((currentSpent / limit) * 100).toFixed(2));
    const delta = Number((currentSpent - limit).toFixed(2));

    if (currentSpent <= 0) {
        return {
            status: 'unused',
            message: 'Budget impostato, ma non hai ancora registrato spese.',
            spentUtilizationPct: 0,
            remaining: Number(limit.toFixed(2)),
            isOverBudget: false,
            isFullySpent: false
        };
    }

    if (Math.abs(delta) < 0.01) {
        return {
            status: 'full',
            message: 'Hai speso interamente il budget impostato.',
            spentUtilizationPct: 100,
            remaining: 0,
            isOverBudget: false,
            isFullySpent: true
        };
    }

    if (delta < 0) {
        return {
            status: 'partial',
            message: `Hai speso il ${spentUtilizationPct}% del budget.`,
            spentUtilizationPct,
            remaining,
            isOverBudget: false,
            isFullySpent: false
        };
    }

    return {
        status: 'over',
        message: `Hai superato il budget di €${Math.abs(delta).toFixed(2)}.`,
        spentUtilizationPct,
        remaining,
        isOverBudget: true,
        isFullySpent: true
    };
}

function evaluateCategoryBudgets(categoryBudgets = [], currentByCategory = {}, projectedByCategory = {}) {
    const seen = new Set();

    return categoryBudgets
        .map((b) => {
            const rawCategory = String(b.category || b.name || '').trim();
            const category = normalizeCategory(rawCategory);
            const limit = Number(b.limit ?? b.amount ?? 0);

            const spent = Number(currentByCategory[category] || 0);
            const projected = Number(projectedByCategory[category] || 0);
            const total = Number((spent + projected).toFixed(2));

            return {
                category,
                limit,
                spent,
                projected,
                total,
                remaining: Number((limit - total).toFixed(2)),
                usagePercent: limit > 0 ? Number(((total / limit) * 100).toFixed(2)) : null,
                isOverBudget: limit > 0 && total > limit,
                status:
                    limit <= 0 ? 'none' :
                        total >= limit ? 'over' :
                            total >= limit * 0.95 ? 'critical' :
                                total >= limit * 0.8 ? 'warning' : 'ok'
            };
        })
        .filter((item) => {
            const key = String(item.category || '').trim().toLowerCase();
            if (!key || key === 'all') return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

module.exports = {
    evaluateMonthlyBudget,
    evaluateBudgetConsumption,
    evaluateCategoryBudgets
};