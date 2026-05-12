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

function evaluateCategoryBudgets(categoryBudgets = [], currentByCategory = {}, projectedByCategory = {}) {
    return categoryBudgets.map((b) => {
        const category = normalizeCategory(b.category || b.name || '');
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
    });
}