function evaluateMonthlyBudget({
                                   budget = 0,
                                   currentExpenses = 0,
                                   daysElapsed = 0,
                                   daysInMonth = 30,
                                   projectedTotalExpenses = 0,
                               }) {
    const limit = Number(budget) || 0;
    const projected = Number(projectedTotalExpenses) || 0;

    const usagePercent =
        limit > 0 ? Number(((projected / limit) * 100).toFixed(2)) : null;

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

function evaluateCategoryBudgets(categoryBudgets = [], categoryForecast = []) {
    const forecastMap = Object.fromEntries(
        categoryForecast.map(item => [
            item.category,
            Number(item.projectedExpense || 0)
        ])
    );

    return categoryBudgets.map((b) => {
        const category = b.category || b.name || '';
        const limit = Number(b.limit ?? b.amount ?? 0);
        const spent = forecastMap[category] || 0;

        return {
            category,
            limit,
            spent,
            remaining: Number((limit - spent).toFixed(2)),
            usagePercent:
                limit > 0 ? Number(((spent / limit) * 100).toFixed(2)) : null,
            isOverBudget: limit > 0 && spent > limit,
        };
    });
}

module.exports = {
    evaluateMonthlyBudget,
    evaluateCategoryBudgets,
};